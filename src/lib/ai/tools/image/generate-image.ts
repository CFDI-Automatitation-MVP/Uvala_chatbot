import { tool as createTool } from "ai";
import { z } from "zod";

export const generateImageTool = createTool({
  description:
    "Generate high-quality images from text descriptions using uvala-plateu model. Use this when users ask to create, generate, make, or draw images.",
  inputSchema: z.object({
    prompt: z
      .string()
      .describe("Detailed description of the image to generate"),
    aspect_ratio: z
      .string()
      .default("1:1")
      .describe(
        "Aspect ratio for the generated image (1:1, 16:9, 9:16, 4:3, 3:4)",
      ),
    output_format: z
      .string()
      .default("jpg")
      .describe("Format of the output image (jpg or png)"),
    safety_filter_level: z
      .string()
      .default("block_only_high")
      .describe("Safety filter level - block_only_high is most permissive"),
  }),
  execute: async ({
    prompt,
    aspect_ratio = "1:1",
    output_format = "jpg",
    safety_filter_level = "block_only_high",
  }) => {
    try {
      const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

      if (!REPLICATE_API_TOKEN) {
        throw new Error(
          "Replicate API token not configured. Please set REPLICATE_API_TOKEN environment variable.",
        );
      }

      // Build input object for Google Imagen 4 fast
      const input = {
        prompt,
        aspect_ratio,
        output_format,
        safety_filter_level,
      };

      // Create prediction using Replicate API with Google Imagen 4 fast
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
          `Image generation failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      while (result.status === "starting" || result.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

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
        throw new Error(`Image generation failed: ${result.error}`);
      }

      if (result.status !== "succeeded" || !result.output) {
        throw new Error(
          `Image generation incomplete. Status: ${result.status}`,
        );
      }

      // Google Imagen 4 fast returns a direct URL to the image file
      const imageUrl = result.output;

      return {
        success: true,
        imageUrl: imageUrl,
        prompt: prompt,
        aspectRatio: aspect_ratio,
        outputFormat: output_format,
        safetyFilterLevel: safety_filter_level,
        model: "uvala-plateu",
        predictionId: result.id,
        message: `Successfully generated image with prompt: "${prompt}"`,
      };
    } catch (error: any) {
      console.error("Image generation error:", error);

      return {
        success: false,
        error: error.message,
        prompt: prompt,
        solution:
          "Try rephrasing your image description or check if the Replicate API token is properly configured. Make sure your prompt is clear and descriptive. If the safety filter is blocking your content, try adjusting the safety_filter_level or rephrasing to be less explicit.",
      };
    }
  },
});
