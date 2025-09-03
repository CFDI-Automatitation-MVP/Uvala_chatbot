import { tool as createTool } from "ai";
import { z } from "zod";

export const generateVideoTool = createTool({
  description: "Generate videos from text descriptions or animate existing images using the uvala-vibe model. Use this when users ask to create, generate, make, or produce videos, animations, or motion clips. Can create video from text prompt alone or animate an existing image.",
  inputSchema: z.object({
    prompt: z.string()
      .min(1)
      .max(500)
      .describe("Text prompt describing the video content, action, and scene. Be specific about motion, objects, and visual style."),
    image: z.string()
      .url()
      .optional()
      .describe("Optional input image URL to animate into video. If provided, the video will animate this image based on the prompt."),
    negative_prompt: z.string()
      .optional()
      .describe("Text prompt describing what to avoid in the video generation"),
    resolution: z.enum(["480p", "720p"])
      .default("720p")
      .describe("Video resolution quality"),
    aspect_ratio: z.enum(["16:9", "9:16"])
      .default("16:9")
      .describe("Video aspect ratio: 16:9 for landscape, 9:16 for portrait/vertical"),
    num_frames: z.number()
      .int()
      .min(81)
      .max(121)
      .default(121)
      .describe("Number of video frames. 81 frames give the best results, 121 for longer videos"),
    frames_per_second: z.number()
      .int()
      .min(5)
      .max(30)
      .default(24)
      .describe("Video frame rate. Standard is 24fps"),
    sample_shift: z.number()
      .min(1)
      .max(20)
      .default(5)
      .describe("Sample shift factor affecting video generation quality and style"),
    seed: z.number()
      .int()
      .optional()
      .describe("Random seed for reproducible results. Leave blank for random generation"),
    optimize_prompt: z.boolean()
      .default(true)
      .describe("Optimize prompt by translating to Chinese for better results"),
    go_fast: z.boolean()
      .default(true)
      .describe("Enable fast generation mode"),
    disable_safety_checker: z.boolean()
      .default(false)
      .describe("Disable safety checker (use with caution)")
  }),
  execute: async ({ 
    prompt,
    image,
    negative_prompt,
    resolution = "720p",
    aspect_ratio = "16:9",
    num_frames = 121,
    frames_per_second = 24,
    sample_shift = 5,
    seed,
    optimize_prompt = true,
    go_fast = true,
    disable_safety_checker = false
  }) => {
    try {
      const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
      
      if (!REPLICATE_API_TOKEN) {
        throw new Error("Replicate API token not configured. Please set REPLICATE_API_TOKEN environment variable.");
      }

      // Build input object for wan-video (internal model)
      const input: any = {
        prompt,
        resolution,
        aspect_ratio,
        num_frames,
        frames_per_second,
        sample_shift,
        optimize_prompt,
        go_fast,
        disable_safety_checker
      };

      // Add optional parameters
      if (image) input.image = image;
      if (negative_prompt) input.negative_prompt = negative_prompt;
      if (seed !== undefined) input.seed = seed;

      // Create prediction using Replicate API with wan-video model (hidden from user)
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${REPLICATE_API_TOKEN}`
        },
        body: JSON.stringify({
          version: "wan-video/wan-2.2-5b-fast",
          input: input
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Video generation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      while (result.status === "starting" || result.status === "processing") {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: {
            "Authorization": `Token ${REPLICATE_API_TOKEN}`
          }
        });
        
        if (!statusResponse.ok) {
          throw new Error(`Failed to check prediction status: ${statusResponse.statusText}`);
        }
        
        result = await statusResponse.json();
      }

      if (result.status === "failed") {
        throw new Error(`Video generation failed: ${result.error}`);
      }

      if (result.status !== "succeeded" || !result.output) {
        throw new Error(`Video generation incomplete. Status: ${result.status}`);
      }

      // Wan-video returns a direct URL to the MP4 file
      const videoUrl = result.output;
      
      // Calculate approximate duration
      const durationSeconds = Math.round(num_frames / frames_per_second);
      
      return {
        success: true,
        videoUrl: videoUrl,
        inputImage: image,
        prompt: prompt,
        negativePrompt: negative_prompt,
        resolution: resolution,
        aspectRatio: aspect_ratio,
        numFrames: num_frames,
        frameRate: frames_per_second,
        duration: `${durationSeconds}s`,
        sampleShift: sample_shift,
        seed: seed,
        model: "uvala-vibe",
        predictionId: result.id,
        message: `Successfully generated ${durationSeconds}s video: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`
      };

    } catch (error: any) {
      console.error('Video generation error:', error);
      
      return {
        success: false,
        error: error.message,
        prompt: prompt,
        solution: "Try simplifying your video description or being more specific about the action and motion. Ensure the prompt clearly describes visual movement. If using an input image, make sure it's a valid URL to a supported image format. Check that the Replicate API token is properly configured."
      };
    }
  },
});