import { tool as createTool } from "ai";
import { z } from "zod";
import {
  searchFiles,
  searchFilesExact,
  getFileChunks,
  getFileChunkRange,
  getUserFiles,
} from "../embedding/vector-search";
import { createClient } from "@supabase/supabase-js";

// Create a function that returns file tools with userId and optional threadId injected
export function createFileTools(userId: string, threadId?: string) {
  // Create service role client for file operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  /**
   * AI tool for searching through uploaded files
   * This tool allows the AI model to find relevant information from user's uploaded documents
   */
  const fileSearchTool = createTool({
    description: `Search uploaded files for information. Use searchMode: "semantic" for concepts/topics, "exact" for section numbers like "3.2" or specific text.`,

    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "The search query - describe what information you're looking for",
        ),
      searchMode: z
        .enum(["semantic", "exact"])
        .describe(
          'Use "semantic" for concepts/topics or "exact" for specific terms/quotes',
        ),
    }),

    execute: async ({ query, searchMode }) => {
      // Use defaults for simplified schema
      const matchCount = 5;
      // Use provided threadId from context, or undefined to search all user's files

      console.log("🔍 fileSearch tool called with:", {
        query,
        searchMode,
        matchCount,
        userId,
        threadId,
      });
      try {
        // Always search chunks (most useful for document analysis)
        // Search for specific chunks with detailed content
        const results =
          searchMode === "exact"
            ? await searchFilesExact(
                query,
                {
                  userId,
                  threadId,
                  matchCount,
                },
                supabaseClient,
              )
            : await searchFiles(
                query,
                {
                  userId,
                  threadId,
                  matchCount,
                  matchThreshold: 0.2, // Lower threshold for better recall - "Deliverable 3" matched at 0.407
                },
                supabaseClient,
              );

        console.log(`📊 fileSearch results: ${results.length} matches found`);
        if (results.length > 0) {
          console.log(`   Best match similarity: ${results[0].similarity}`);
        }

        if (results.length === 0) {
          console.log("⚠️ fileSearch returned 0 results for query:", query);
          return {
            success: true,
            message:
              "No relevant content found in your uploaded files for this query.",
            results: [],
          };
        }

        console.log(
          `✅ fileSearch found ${results.length} results for query: "${query}"`,
        );
        console.log(
          `   First result preview: ${results[0].content.substring(0, 100)}...`,
        );

        return {
          success: true,
          message: `Found ${results.length} relevant section(s) from your files`,
          results: results.map((result) => ({
            type: "chunk",
            fileName: result.fileName,
            fileType: result.fileType,
            content: result.content,
            similarity: Math.round(result.similarity * 100),
            chunkIndex: result.chunkIndex,
            context: `This is section ${result.chunkIndex + 1} from "${result.fileName}"`,
          })),
        };
      } catch (error) {
        console.error("File search tool error:", error);
        return {
          success: false,
          error: `Failed to search files: ${error instanceof Error ? error.message : "Unknown error"}`,
          results: [],
        };
      }
    },
  });

  /**
   * AI tool for retrieving specific file content
   * Use this when you need to get all content from a specific file
   */
  const fileContentTool = createTool({
    description: `[RARELY NEEDED] Get complete file content by ID. TOKEN EXPENSIVE and requires file ID from filesList first. Use fileSearch instead - it's more efficient and reliable.`,

    inputSchema: z.object({
      fileId: z
        .string()
        .describe("The ID of the file to retrieve content from"),
    }),

    execute: async ({ fileId }) => {
      const maxChunks = 10; // Default value
      try {
        const chunks = await getFileChunks(fileId, userId, supabaseClient);

        if (chunks.length === 0) {
          return {
            success: false,
            error: "File not found or no content available",
            content: null,
          };
        }

        // Limit chunks to prevent token overflow
        const limitedChunks = chunks.slice(0, maxChunks);
        const fullContent = limitedChunks
          .sort((a, b) => a.chunkIndex - b.chunkIndex)
          .map((chunk) => chunk.content)
          .join("\n\n");

        return {
          success: true,
          message: `Retrieved ${limitedChunks.length} section(s) from the file`,
          content: fullContent,
          totalChunks: chunks.length,
          hasMore: chunks.length > maxChunks,
          chunks: limitedChunks.map((chunk) => ({
            index: chunk.chunkIndex,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
          })),
        };
      } catch (error) {
        console.error("File content tool error:", error);
        return {
          success: false,
          error: `Failed to retrieve file content: ${error instanceof Error ? error.message : "Unknown error"}`,
          content: null,
        };
      }
    },
  });

  /**
   * AI tool for getting specific ranges of chunks from a file (MOST TOKEN EFFICIENT)
   * Use this for document structure questions and when you need specific parts
   */
  const fileChunkRangeTool = createTool({
    description: `[RARELY NEEDED] Get specific chunks from files. Requires file ID from filesList first. Use fileSearch instead - it's more reliable and doesn't need file IDs.`,

    inputSchema: z.object({
      fileId: z.string().describe("The ID of the file to retrieve chunks from"),
      fromEnd: z
        .number()
        .describe(
          "Get last N chunks - use 3-5 for conclusions, 1-2 for ending",
        ),
    }),

    execute: async ({ fileId, fromEnd }) => {
      const start = undefined;
      const end = undefined;
      const limit = 10; // Default
      try {
        const chunks = await getFileChunkRange(
          fileId,
          userId,
          {
            start,
            end,
            fromEnd,
            limit,
          },
          supabaseClient,
        );

        if (chunks.length === 0) {
          return {
            success: false,
            error: "No chunks found in the specified range",
            content: null,
          };
        }

        const content = chunks
          .sort((a, b) => a.chunkIndex - b.chunkIndex)
          .map((chunk) => chunk.content)
          .join("\n\n");

        return {
          success: true,
          message: `Retrieved ${chunks.length} chunk(s) from the specified range`,
          content,
          chunks: chunks.map((chunk) => ({
            index: chunk.chunkIndex,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
          })),
          rangeInfo: {
            requestedRange: { start, end, fromEnd, limit },
            actualChunks: chunks.map((c) => c.chunkIndex),
            firstChunk: Math.min(...chunks.map((c) => c.chunkIndex)),
            lastChunk: Math.max(...chunks.map((c) => c.chunkIndex)),
          },
        };
      } catch (error) {
        console.error("File chunk range tool error:", error);
        return {
          success: false,
          error: `Failed to retrieve chunk range: ${error instanceof Error ? error.message : "Unknown error"}`,
          content: null,
        };
      }
    },
  });

  /**
   * AI tool for getting a summary of user's uploaded files
   * Use this to understand what files the user has available
   */
  const filesListTool = createTool({
    description: `List uploaded files.`,

    inputSchema: z.object({
      threadId: z
        .string()
        .optional()
        .describe(
          "Optional: limit to files uploaded in this conversation thread",
        ),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of files to return (default: 10)"),
    }),

    execute: async ({ threadId, limit }) => {
      try {
        const { files, total } = await getUserFiles(
          userId,
          {
            threadId,
            limit,
            processingStatus: "completed", // Only show successfully processed files
          },
          supabaseClient,
        );

        if (files.length === 0) {
          return {
            success: true,
            message: threadId
              ? "No files have been uploaded in this conversation yet."
              : "No files have been uploaded yet.",
            files: [],
            total: 0,
          };
        }

        return {
          success: true,
          message: `Found ${files.length} file(s)${total > limit ? ` (showing first ${limit} of ${total})` : ""}`,
          files: files.map((file) => ({
            id: file.id,
            name: file.originalFilename,
            type: file.contentType,
            size: file.fileSize,
            chunks: file.totalChunks,
            uploadedAt: file.createdAt,
            summary: `"${file.originalFilename}" - ${file.contentType} file with ${file.totalChunks} searchable sections`,
          })),
          total,
        };
      } catch (error) {
        console.error("Files list tool error:", error);
        return {
          success: false,
          error: `Failed to get files list: ${error instanceof Error ? error.message : "Unknown error"}`,
          files: [],
          total: 0,
        };
      }
    },
  });

  // Return all file-related tools
  return {
    fileSearch: fileSearchTool,
    fileContent: fileContentTool,
    fileChunkRange: fileChunkRangeTool,
    filesList: filesListTool,
  };
}

// Default export for cases where userId is not available (will need to be wrapped)
export const fileTools = {
  fileSearch: createTool({
    description: "Search through uploaded files (requires user context)",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      threadId: z.string().optional().describe("Optional thread ID"),
      matchCount: z.number().optional().default(5).describe("Maximum results"),
      searchType: z
        .enum(["chunks", "files"])
        .optional()
        .default("chunks")
        .describe("Search type"),
      searchMode: z
        .enum(["semantic", "exact"])
        .optional()
        .default("semantic")
        .describe("Search mode"),
    }),
    execute: async () => ({
      success: false,
      error: "User context required - this tool is not properly initialized",
      results: [],
    }),
  }),
  fileContent: createTool({
    description: "Get file content (requires user context)",
    inputSchema: z.object({
      fileId: z.string().describe("The file ID"),
      maxChunks: z.number().optional().default(10).describe("Maximum chunks"),
    }),
    execute: async () => ({
      success: false,
      error: "User context required - this tool is not properly initialized",
      content: null,
    }),
  }),
  filesList: createTool({
    description: "List user files (requires user context)",
    inputSchema: z.object({
      threadId: z.string().optional().describe("Optional thread ID"),
      limit: z.number().optional().default(10).describe("Maximum files"),
    }),
    execute: async () => ({
      success: false,
      error: "User context required - this tool is not properly initialized",
      files: [],
      total: 0,
    }),
  }),
};
