import { tool as createTool } from "ai";
import { z } from "zod";

export const generateMusicTool = createTool({
  description: "Generate instrumental music from text descriptions using the FluxMusic model. Use this when users ask to create, generate, compose, produce, make, or write music, songs, or tracks. This tool generates purely instrumental music based on text prompts describing the style, mood, genre, and characteristics of the desired music.",
  inputSchema: z.object({
    prompt: z.string()
      .min(1)
      .max(500)
      .describe("Text prompt describing the music to generate. Include genre, mood, instruments, tempo, style. Example: 'A wild and rebellious rock anthem with psychedelic and bluesy undertones, loud and energetic'"),
    negative_prompt: z.string()
      .optional()
      .default("low quality, gentle")
      .describe("Text prompt for what to avoid in the music generation"),
    model_version: z.enum(["small", "base", "large", "giant"])
      .default("base")
      .describe("Model version to use: small (fastest), base (balanced), large (higher quality), giant (best quality)"),
    steps: z.number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("Number of sampling steps (higher = better quality but slower)"),
    guidance_scale: z.number()
      .min(0)
      .max(20)
      .default(7)
      .describe("Classifier-free guidance scale (higher = more adherence to prompt)"),
    seed: z.number()
      .int()
      .optional()
      .describe("Random seed for reproducible results. Leave blank for random generation"),
    save_spectrogram: z.boolean()
      .default(false)
      .describe("Whether to save the visual spectrogram image of the generated music")
  }),
  execute: async ({ 
    prompt,
    negative_prompt = "low quality, gentle",
    model_version = "base",
    steps = 50,
    guidance_scale = 7,
    seed,
    save_spectrogram = false
  }) => {
    try {
      const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
      
      if (!REPLICATE_API_TOKEN) {
        throw new Error("Replicate API token not configured. Please set REPLICATE_API_TOKEN environment variable.");
      }

      // Build input object for flux-music
      const input: any = {
        prompt,
        negative_prompt,
        model_version,
        steps,
        guidance_scale,
        save_spectrogram
      };

      // Add optional seed if provided
      if (seed !== undefined) {
        input.seed = seed;
      }

      // Create prediction using Replicate API with flux-music model
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${REPLICATE_API_TOKEN}`
        },
        body: JSON.stringify({
          version: "zsxkib/flux-music:eebfed4a1749bb1172f005f71fac5a1e0377502ec149c9d02b56ac1de3aa9f07",
          input: input
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Music generation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      while (result.status === "starting" || result.status === "processing") {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
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
        throw new Error(`Music generation failed: ${result.error}`);
      }

      if (result.status !== "succeeded" || !result.output) {
        throw new Error(`Music generation incomplete. Status: ${result.status}`);
      }

      // FluxMusic returns {wav: "url", melspectrogram: "url"} or just a URL string
      const audioUrl = typeof result.output === 'string' ? result.output : result.output.wav;
      const spectrogramUrl = typeof result.output === 'object' ? result.output.melspectrogram : undefined;
      
      return {
        success: true,
        audioUrl: audioUrl,
        spectrogramUrl: spectrogramUrl,
        prompt: prompt,
        negativePrompt: negative_prompt,
        modelVersion: model_version,
        steps: steps,
        guidanceScale: guidance_scale,
        seed: seed,
        model: "FluxMusic",
        predictionId: result.id,
        message: `Successfully generated instrumental music: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`
      };

    } catch (error: any) {
      console.error('Music generation error:', error);
      
      return {
        success: false,
        error: error.message,
        prompt: prompt,
        solution: "Try simplifying your music description or being more specific about the genre, mood, and instruments. Make sure your prompt describes instrumental music characteristics clearly. Check that the Replicate API token is properly configured."
      };
    }
  },
});