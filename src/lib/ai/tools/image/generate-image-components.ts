import { tool as createTool } from "ai";
import { z } from "zod";
import { safe } from "ts-safe";
import globalLogger from "logger";

const logger = globalLogger.withTag("generate-image-components");

// AI Image Generation Tool - Isolated for Components Mode
export const generateImageComponentsTool = createTool({
  description:
    "Generate custom images using AI when stock photos don't have what you need. Use this for specific branded content (like McDonald's menu, Starbucks logo), specific UI mockups, or when Pexels search returns poor results. Creates images using Google Imagen 4 Fast (uvala-plateu).",
  inputSchema: z.object({
    prompt: z
      .string()
      .min(10)
      .max(500)
      .describe(
        "Detailed, specific description of the image to generate. Be clear about style, colors, composition, and subject matter.",
      ),
    aspect_ratio: z
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
      .default("16:9")
      .describe(
        "Aspect ratio for the component layout: 1:1 (square), 16:9 (landscape), 9:16 (portrait), 4:3, 3:4",
      ),
    output_format: z
      .enum(["jpg", "png"])
      .default("jpg")
      .describe(
        "Output format: jpg (smaller file) or png (transparency support)",
      ),
  }),
  execute: async ({ prompt, aspect_ratio = "16:9", output_format = "jpg" }) => {
    logger.info(
      `🎨 AI image generation initiated: "${prompt.substring(0, 50)}..."`,
    );

    return safe(async () => {
      const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

      if (!REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is not configured");
      }

      // Build input for Google Imagen 4 Fast
      const input = {
        prompt,
        aspect_ratio,
        output_format,
        safety_filter_level: "block_only_high", // Most permissive for UI components
      };

      logger.info(`📡 Calling Replicate API with Google Imagen 4 Fast`);

      // Create prediction
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: "google/imagen-4-fast",
          input: input,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Replicate API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const prediction = await response.json();
      logger.info(
        `⏳ Image generation started, prediction ID: ${prediction.id}`,
      );

      // Poll for completion (Google Imagen 4 Fast is typically quick)
      let result = prediction;
      let pollAttempts = 0;
      const maxPollAttempts = 30; // 30 attempts x 2 seconds = 60 seconds max

      while (
        (result.status === "starting" || result.status === "processing") &&
        pollAttempts < maxPollAttempts
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
        pollAttempts++;

        logger.info(
          `⏳ Polling attempt ${pollAttempts}/${maxPollAttempts}, status: ${result.status}`,
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
          throw new Error(
            `Failed to check prediction status: ${statusResponse.statusText}`,
          );
        }

        result = await statusResponse.json();
      }

      if (result.status === "failed") {
        throw new Error(
          `Image generation failed: ${result.error || "Unknown error"}`,
        );
      }

      if (result.status !== "succeeded" || !result.output) {
        throw new Error(
          `Image generation incomplete after ${pollAttempts} attempts. Status: ${result.status}`,
        );
      }

      const imageUrl = result.output;
      logger.info(`✅ Image generated successfully: ${imageUrl}`);

      // Return formatted response for the model
      return {
        success: true,
        imageUrl: imageUrl,
        prompt: prompt,
        aspectRatio: aspect_ratio,
        outputFormat: output_format,
        model: "uvala-plateu (Google Imagen 4 Fast)",
        predictionId: result.id,
        message: `AI-generated image is ready. Use this URL directly in your component: ${imageUrl}`,
      };
    })
      .ifFail((e) => {
        logger.error(`❌ Image generation error: ${e.message}`);
        return {
          success: false,
          isError: true,
          error: e.message || "Image generation failed",
          prompt: prompt,
          solution:
            "Image generation failed. You can either: 1) Try rephrasing the prompt to be more specific and clear, 2) Use the searchStockImages tool to find a similar stock photo instead, or 3) Ask the user to provide an image URL.",
        };
      })
      .unwrap();
  },
});
