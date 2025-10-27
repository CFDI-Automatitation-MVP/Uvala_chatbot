import { tool as createTool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { safe } from "ts-safe";
import globalLogger from "logger";
import { JSONSchema7 } from "json-schema";

const logger = globalLogger.withTag("web-search");

// Initialize Exa client with API key
const exa = new Exa(process.env.EXA_API_KEY || "");

// JSON Schema exports for workflow UI
export const exaSearchSchema: JSONSchema7 = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "The search query for finding current information",
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ["query"],
};

export const exaContentsSchema: JSONSchema7 = {
  type: "object",
  properties: {
    urls: {
      type: "array",
      items: { type: "string" },
      description: "List of URLs to extract content from",
    },
  },
  required: ["urls"],
};

// Type definitions matching the UI component expectations
export interface ExaSearchResult {
  id?: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text: string; // UI expects 'text' not 'content'
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId?: string;
  autopromptString?: string;
  resolvedSearchType?: string;
  results: ExaSearchResult[];
}

// Web Search Tool - aligned with Exa's official AI SDK recommendations
export const exaSearchTool = createTool({
  description: "Search the web for up-to-date information",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(100)
      .describe("The search query for finding current information"),
  }),
  execute: async ({ query }) => {
    logger.info(`🔍 Web search initiated: "${query}"`);

    return safe(async () => {
      if (!process.env.EXA_API_KEY) {
        throw new Error("EXA_API_KEY is not configured");
      }

      logger.info(`📡 Calling Exa API with query: "${query}"`);

      // Use searchAndContents for optimized search + content extraction in one call
      const response = await exa.searchAndContents(query, {
        livecrawl: "always", // Always get fresh content for real-time information
        numResults: 3, // Optimal balance between coverage and token usage
        text: {
          maxCharacters: 1000, // Recommended by Exa for AI consumption
        },
      });

      logger.info(`✅ Exa API returned ${response.results.length} results`);

      // Log first result for debugging
      if (response.results.length > 0) {
        logger.info(
          `📄 First result: ${response.results[0].title} - ${response.results[0].url}`,
        );
      }

      // Return response matching UI component expectations
      const formattedResponse: ExaSearchResponse = {
        requestId: (response as any).requestId,
        autopromptString: (response as any).autopromptString,
        resolvedSearchType: (response as any).resolvedSearchType,
        results: response.results.map((result) => ({
          id: result.id,
          title: result.title || "Untitled",
          url: result.url,
          text: result.text || "", // UI expects 'text' field
          publishedDate: result.publishedDate,
          author: result.author,
          image: (result as any).image,
          favicon: (result as any).favicon,
          score: result.score,
        })),
      };

      logger.info(
        `🎯 Returning formatted response with ${formattedResponse.results.length} results`,
      );

      return formattedResponse;
    })
      .ifFail((e) => {
        logger.error(`❌ Exa search error: ${e.message}`);
        console.error("Exa search error:", e);
        return {
          isError: true,
          error: e.message || "Web search failed",
          solution:
            "Unable to search the web at this time. Please try rephrasing your query or ask me to help based on my existing knowledge.",
          results: [], // Include empty results array for UI compatibility
        };
      })
      .unwrap();
  },
});

// Web Content Extraction Tool - for getting full content from specific URLs
export const exaContentsTool = createTool({
  description: "Extract full content from specific web pages by URL",
  inputSchema: z.object({
    urls: z
      .array(z.string().url())
      .min(1)
      .max(5)
      .describe("List of URLs to extract content from (max 5)"),
  }),
  execute: async ({ urls }) => {
    logger.info(`📥 Content extraction initiated for ${urls.length} URL(s)`);

    return safe(async () => {
      if (!process.env.EXA_API_KEY) {
        throw new Error("EXA_API_KEY is not configured");
      }

      logger.info(`📡 Calling Exa getContents API`);

      // Use getContents for extracting content from known URLs
      const response = await exa.getContents(urls, {
        livecrawl: "always",
        text: {
          maxCharacters: 3000, // More content for detailed extraction
        },
      });

      logger.info(
        `✅ Exa getContents returned ${response.results.length} results`,
      );

      const formattedResponse: ExaSearchResponse = {
        requestId: (response as any).requestId,
        results: response.results.map((result) => ({
          id: result.id,
          title: result.title || "Untitled",
          url: result.url,
          text: result.text || "", // UI expects 'text' field
          publishedDate: result.publishedDate,
          author: result.author,
          image: (result as any).image,
          favicon: (result as any).favicon,
        })),
      };

      return formattedResponse;
    })
      .ifFail((e) => {
        logger.error(`❌ Exa content extraction error: ${e.message}`);
        console.error("Exa content extraction error:", e);
        return {
          isError: true,
          error: e.message || "Content extraction failed",
          solution:
            "Unable to extract content from the provided URLs. The pages may be inaccessible or the URLs may be invalid.",
          results: [], // Include empty results array for UI compatibility
        };
      })
      .unwrap();
  },
});
