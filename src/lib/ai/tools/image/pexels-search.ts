import { tool as createTool } from "ai";
import { z } from "zod";
import { safe } from "ts-safe";
import globalLogger from "logger";

const logger = globalLogger.withTag("pexels-search");

// Type definitions matching Pexels API response
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  liked: boolean;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
  prev_page?: string;
}

// Pexels Stock Image Search Tool - Isolated for Components Mode
export const pexelsSearchTool = createTool({
  description:
    "Search Pexels for free stock images to use in UI components. Returns high-quality image URLs in various sizes that can be directly used in React components.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(100)
      .describe(
        "Search query for images (e.g., 'mountain landscape', 'business meeting', 'abstract pattern')",
      ),
    orientation: z
      .enum(["landscape", "portrait", "square"])
      .optional()
      .describe("Preferred image orientation for the component layout"),
    per_page: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe("Number of images to return (1-10, default: 5)"),
  }),
  execute: async ({ query, orientation, per_page = 5 }) => {
    logger.info(`🖼️ Pexels search initiated: "${query}"`);

    return safe(async () => {
      if (!process.env.PEXELS_API_KEY) {
        throw new Error("PEXELS_API_KEY is not configured");
      }

      // Build query parameters
      const params = new URLSearchParams({
        query,
        per_page: per_page.toString(),
      });

      if (orientation) {
        params.append("orientation", orientation);
      }

      const url = `https://api.pexels.com/v1/search?${params}`;

      logger.info(`📡 Calling Pexels API with query: "${query}"`);

      const response = await fetch(url, {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Pexels API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: PexelsSearchResponse = await response.json();

      logger.info(`✅ Pexels API returned ${data.photos.length} images`);

      // Format response for the AI model with all necessary information
      const formattedResponse = {
        total_results: data.total_results,
        count: data.photos.length,
        images: data.photos.map((photo) => ({
          id: photo.id,
          alt: photo.alt || query,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          avg_color: photo.avg_color,
          // Provide multiple size options for different use cases
          urls: {
            tiny: photo.src.tiny, // Very small thumbnail
            small: photo.src.small, // Small size (~280px)
            medium: photo.src.medium, // Medium size (~350px)
            large: photo.src.large, // Large size (~940px)
            large2x: photo.src.large2x, // Extra large (2x)
            original: photo.src.original, // Original full resolution
            landscape: photo.src.landscape, // Landscape crop
            portrait: photo.src.portrait, // Portrait crop
          },
          dimensions: {
            width: photo.width,
            height: photo.height,
          },
        })),
      };

      logger.info(
        `🎯 Returning ${formattedResponse.images.length} formatted images`,
      );

      return formattedResponse;
    })
      .ifFail((e) => {
        logger.error(`❌ Pexels search error: ${e.message}`);
        return {
          isError: true,
          error: e.message || "Image search failed",
          solution:
            "Unable to search for images at this time. You can use placeholder image URLs (e.g., via.placeholder.com) or ask the user to provide image URLs.",
          images: [],
        };
      })
      .unwrap();
  },
});
