"use server";

import { db } from "@/lib/db";
import { GeneratedImageSchema } from "@/lib/db/pg/schema.pg";
import { getUser } from "@/lib/auth/supabase-auth";
import { createClient } from "@/lib/supabase/server";

export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

interface ImagenGenerationResult {
  success: boolean;
  image?: {
    id: string;
    url: string;
    prompt: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export async function generateImageWithImagen(
  prompt: string,
  aspectRatio: ImageAspectRatio = "16:9",
): Promise<ImagenGenerationResult> {
  console.log("🖼️  [IMAGEN] Starting image generation...");
  console.log("🖼️  [IMAGEN] Prompt:", prompt);
  console.log("🖼️  [IMAGEN] Aspect Ratio:", aspectRatio);

  const user = await getUser();
  if (!user) {
    console.log("❌ [IMAGEN] User not authenticated");
    return {
      success: false,
      error: "You must be logged in to generate images",
    };
  }

  console.log("✅ [IMAGEN] User authenticated:", user.id);

  try {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
      console.log("❌ [IMAGEN] Replicate API token not configured");
      return {
        success: false,
        error: "Replicate API token not configured",
      };
    }

    console.log("🔑 [IMAGEN] Replicate API token found");
    console.log(
      "📡 [IMAGEN] Calling Replicate API with Google Imagen 4 Fast...",
    );

    // Create prediction using Replicate API with Google Imagen 4 Fast
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: "google/imagen-4-fast",
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          output_format: "jpg",
          safety_filter_level: "block_only_high",
        },
      }),
    });

    if (!response.ok) {
      console.log(
        "❌ [IMAGEN] Replicate API request failed:",
        response.status,
        response.statusText,
      );
      return {
        success: false,
        error: `Image generation failed: ${response.status} ${response.statusText}`,
      };
    }

    const prediction = await response.json();
    console.log("✅ [IMAGEN] Prediction created, ID:", prediction.id);
    console.log("🔄 [IMAGEN] Initial status:", prediction.status);

    // Poll for completion
    let result = prediction;
    let pollAttempts = 0;
    const maxPollAttempts = 30; // 60 seconds total (30 * 2s)

    while (
      (result.status === "starting" || result.status === "processing") &&
      pollAttempts < maxPollAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      pollAttempts++;
      console.log(
        `⏳ [IMAGEN] Polling attempt ${pollAttempts}/${maxPollAttempts}...`,
      );

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
          },
        },
      );

      if (!statusResponse.ok) {
        console.log(
          "❌ [IMAGEN] Failed to check prediction status:",
          statusResponse.statusText,
        );
        return {
          success: false,
          error: `Failed to check prediction status: ${statusResponse.statusText}`,
        };
      }

      result = await statusResponse.json();
      console.log(`📊 [IMAGEN] Current status: ${result.status}`);
    }

    if (result.status === "failed") {
      console.log("❌ [IMAGEN] Image generation failed:", result.error);
      return {
        success: false,
        error: `Image generation failed: ${result.error || "Unknown error"}`,
      };
    }

    if (result.status !== "succeeded" || !result.output) {
      console.log(
        "❌ [IMAGEN] Image generation incomplete, final status:",
        result.status,
      );
      return {
        success: false,
        error: `Image generation incomplete. Status: ${result.status}`,
      };
    }

    // Google Imagen 4 Fast returns a direct URL to the image file
    const imageUrl = result.output;
    console.log("✅ [IMAGEN] Image generated successfully!");
    console.log("🔗 [IMAGEN] Replicate URL:", imageUrl);

    // Download image from Replicate
    console.log("⬇️  [IMAGEN] Downloading image from Replicate...");
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.log("❌ [IMAGEN] Failed to download image from Replicate");
      return {
        success: false,
        error: "Failed to download generated image from Replicate",
      };
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    console.log("✅ [IMAGEN] Image downloaded, size:", imageBlob.size, "bytes");

    // Upload to Supabase Storage for permanent storage
    const filename = `presentations/imagen-${prompt.substring(0, 30).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.jpg`;
    console.log(
      "📤 [IMAGEN] Uploading to Supabase Storage, filename:",
      filename,
    );

    const supabase = await createClient();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("images")
      .upload(filename, imageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "31536000", // Cache for 1 year
        upsert: false,
      });

    if (uploadError) {
      console.log("❌ [IMAGEN] Failed to upload to Supabase Storage");
      console.log("❌ [IMAGEN] Upload error:", uploadError);
      return {
        success: false,
        error: `Failed to upload image to Supabase Storage: ${uploadError.message}`,
      };
    }

    // Get the public URL for the uploaded image
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(uploadData.path);

    console.log("✅ [IMAGEN] Uploaded successfully to Supabase Storage!");
    console.log("🔗 [IMAGEN] Permanent URL:", publicUrl);

    const permanentUrl = publicUrl;

    // Store in database
    console.log("💾 [IMAGEN] Saving to database...");
    const [generatedImage] = await db
      .insert(GeneratedImageSchema)
      .values({
        url: permanentUrl,
        prompt: prompt,
        userId: user.id,
      })
      .returning();

    console.log("✅ [IMAGEN] Saved to database, ID:", generatedImage.id);
    console.log("🎉 [IMAGEN] Image generation complete!");

    return {
      success: true,
      image: generatedImage,
    };
  } catch (error) {
    console.error("❌ [IMAGEN] Error generating image:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}
