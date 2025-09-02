import { tool as createTool } from "ai";
import { z } from "zod";

export const generateImageTool = createTool({
  description: "Generate high-quality images from text descriptions using uvala-plateu model. Use this when users ask to create, generate, make, or draw images.",
  inputSchema: z.object({
    prompt: z.string().describe("Detailed description of the image to generate"),
    aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1").describe("Aspect ratio for the generated image"),
    steps: z.number().min(1).max(50).default(20).describe("Number of inference steps (higher = better quality but slower)")
  }),
  execute: async ({ prompt, aspectRatio = "1:1", steps = 20 }) => {
    try {
      const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
      
      if (!FIREWORKS_API_KEY) {
        throw new Error("Fireworks API key not configured. Please set FIREWORKS_API_KEY environment variable.");
      }

      // Fireworks FLUX.1 dev FP8 API endpoint
      const response = await fetch("https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-dev-fp8/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "image/jpeg",
          "Authorization": `Bearer ${FIREWORKS_API_KEY}`
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: aspectRatio,
          num_inference_steps: steps,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image generation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Get the image as buffer
      const imageBuffer = await response.arrayBuffer();
      
      // Convert to base64 for embedding in chat
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      
      return {
        success: true,
        imageUrl: dataUrl,
        prompt: prompt,
        aspectRatio: aspectRatio,
        steps: steps,
        model: "uvala-plateu",
        message: `Successfully generated image with prompt: "${prompt}"`
      };

    } catch (error: any) {
      console.error('Image generation error:', error);
      
      return {
        success: false,
        error: error.message,
        prompt: prompt,
        solution: "Try rephrasing your image description or check if the Fireworks API key is properly configured. Make sure your prompt is clear and descriptive."
      };
    }
  },
});