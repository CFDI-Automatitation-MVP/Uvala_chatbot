"use server";

import { db } from "@/lib/db";
import { GeneratedImageSchema } from "@/lib/db/pg/schema.pg";
import { getUser } from "@/lib/auth/supabase-auth";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";

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
  const user = await getUser();
  if (!user) {
    return {
      success: false,
      error: "You must be logged in to generate images",
    };
  }

  try {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
      return {
        success: false,
        error: "Replicate API token not configured",
      };
    }

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
      return {
        success: false,
        error: `Image generation failed: ${response.status} ${response.statusText}`,
      };
    }

    const prediction = await response.json();

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

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
          },
        },
      );

      if (!statusResponse.ok) {
        return {
          success: false,
          error: `Failed to check prediction status: ${statusResponse.statusText}`,
        };
      }

      result = await statusResponse.json();
    }

    if (result.status === "failed") {
      return {
        success: false,
        error: `Image generation failed: ${result.error || "Unknown error"}`,
      };
    }

    if (result.status !== "succeeded" || !result.output) {
      return {
        success: false,
        error: `Image generation incomplete. Status: ${result.status}`,
      };
    }

    // Google Imagen 4 Fast returns a direct URL to the image file
    const imageUrl = result.output;

    // Download image from Replicate
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return {
        success: false,
        error: "Failed to download generated image from Replicate",
      };
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Upload to UploadThing for permanent storage
    const filename = `imagen-${prompt.substring(0, 30).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.jpg`;
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

    const uploadResult = await utapi.uploadFiles([utFile]);
    if (!uploadResult[0]?.data?.url) {
      return {
        success: false,
        error: "Failed to upload image to UploadThing",
      };
    }

    const permanentUrl = uploadResult[0].data.url;

    // Store in database
    const [generatedImage] = await db
      .insert(GeneratedImageSchema)
      .values({
        url: permanentUrl,
        prompt: prompt,
        userId: user.id,
      })
      .returning();

    return {
      success: true,
      image: generatedImage,
    };
  } catch (error) {
    console.error("Error generating image with Imagen:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}
