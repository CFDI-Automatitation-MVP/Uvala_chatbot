import { tool as createTool } from "ai";
import { z } from "zod";
import {
  searchFiles,
  searchFilesExact,
  searchFilesByContent,
  getFileChunks,
  getFileChunkRange,
  getUserFiles,
} from "../embedding/vector-search";
import { createClient } from "@supabase/supabase-js";

// Create a function that returns file tools with userId injected
export function createFileTools(userId: string) {
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
      threadId: z
        .string()
        .optional()
        .describe(
          "Optional: limit search to files uploaded in this conversation thread",
        ),
      matchCount: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return (default: 5)"),
      searchType: z
        .enum(["chunks", "files"])
        .optional()
        .default("chunks")
        .describe(
          "Search individual chunks (more detailed) or files (broader overview)",
        ),
      searchMode: z
        .enum(["semantic", "exact"])
        .optional()
        .default("semantic")
        .describe(
          "Use semantic search (for concepts) or exact text search (for section numbers, specific terms)",
        ),
    }),

    execute: async ({
      query,
      threadId,
      matchCount,
      searchType,
      searchMode,
    }) => {
      try {
        if (searchType === "files") {
          // Search for files and return file-level results
          const results = await searchFilesByContent(
            query,
            {
              userId,
              threadId,
              matchCount,
              matchThreshold: 0.6, // Lower threshold for broader search
            },
            supabaseClient,
          );

          if (results.length === 0) {
            return {
              success: true,
              message: "No relevant files found for your query.",
              results: [],
            };
          }

          return {
            success: true,
            message: `Found ${results.length} relevant file(s)`,
            results: results.map((result) => ({
              type: "file",
              fileName: result.fileName,
              fileType: result.fileType,
              relevantContent: result.bestChunkContent,
              similarity: Math.round(result.similarity * 100),
              summary: `File "${result.fileName}" contains relevant information about your query.`,
            })),
          };
        } else {
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
                    matchThreshold: 0.6,
                  },
                  supabaseClient,
                );

          if (results.length === 0) {
            return {
              success: true,
              message:
                "No relevant content found in your uploaded files for this query.",
              results: [],
            };
          }

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
        }
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
    description: `Get complete file content by ID. TOKEN EXPENSIVE - prefer fileSearch for finding info or fileChunkRange for specific sections.`,

    inputSchema: z.object({
      fileId: z
        .string()
        .describe("The ID of the file to retrieve content from"),
      maxChunks: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of chunks to return (default: 10)"),
    }),

    execute: async ({ fileId, maxChunks }) => {
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
    description: `Get specific chunks from files. Use fromEnd: 3-5 for conclusions/endings, start: 0, end: 2 for introductions. Most token efficient.`,

    inputSchema: z.object({
      fileId: z.string().describe("The ID of the file to retrieve chunks from"),
      start: z
        .number()
        .optional()
        .describe("Starting chunk index (0-based, inclusive)"),
      end: z.number().optional().describe("Ending chunk index (inclusive)"),
      fromEnd: z
        .number()
        .optional()
        .describe("Get last N chunks (most useful for conclusions)"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum chunks to return (default: 10)"),
    }),

    execute: async ({ fileId, start, end, fromEnd, limit }) => {
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
