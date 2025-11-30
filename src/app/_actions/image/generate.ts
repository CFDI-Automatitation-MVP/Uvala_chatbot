"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { getUser } from "@/lib/auth/supabase-auth";
import { db } from "@/lib/db";
import { GeneratedImageSchema } from "@/lib/db/pg/schema.pg";
import Together from "together-ai";
import { UTFile } from "uploadthing/server";

const together = new Together({
  apiKey: process.env.TOGETHER_AI_API_KEY || "",
});

export type ImageModelList =
  | "black-forest-labs/FLUX1.1-pro"
  | "black-forest-labs/FLUX.1-schnell"
  | "black-forest-labs/FLUX.1-schnell-Free"
  | "black-forest-labs/FLUX.1-pro"
  | "black-forest-labs/FLUX.1-dev"
  | "google/imagen-4-fast";

export async function generateImageAction(
  _prompt: string,
  _model: ImageModelList = "black-forest-labs/FLUX.1-schnell-Free",
) {
  // Get the current session
  const user = await getUser();

  // Check if user is authenticated
  if (!user) {
    throw new Error("You must be logged in to generate images");
  }
  const _userId = user.id;

  try {
    // NOTE: This function is deprecated. Use Unsplash instead via getImageFromUnsplash()
    throw new Error(
      "Image generation via Together AI is disabled. Please use Unsplash instead.",
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}
