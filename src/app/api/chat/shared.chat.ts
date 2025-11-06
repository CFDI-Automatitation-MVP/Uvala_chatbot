import "server-only";
import {
  LoadAPIKeyError,
  UIMessage,
  Tool,
  tool as createTool,
  isToolUIPart,
  UIMessagePart,
  ToolUIPart,
  getToolName,
} from "ai";
import {
  ChatMention,
  ChatMetadata,
  ManualToolConfirmTag,
} from "app-types/chat";
import { errorToString, exclude, objectFlow } from "lib/utils";
import logger from "logger";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";
import { createFileTools } from "@/lib/tools/file-search-tool";

import { safe } from "ts-safe";
import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
import { AppDefaultToolkit } from "lib/ai/tools";
import { checkUserLimits, formatLimitError } from "@/lib/subscription-limits";
import { DefaultToolName } from "lib/ai/tools";

export function excludeToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    return createTool({
      inputSchema: value.inputSchema,
      description: value.description,
    });
  });
}

/**
 * Wrap tools with Pro user limit checking
 */
export function wrapToolsWithLimits(
  tools: Record<string, Tool>,
  userId: string,
): Record<string, Tool> {
  return objectFlow(tools).map((tool, toolName) => {
    const originalExecute = tool.execute;

    return createTool({
      inputSchema: tool.inputSchema,
      description: tool.description,
      execute: async (input: any, options: any) => {
        // Check limits based on tool type - using exact tool names from DefaultToolName enum
        let toolType: "image" | "video" | "search" | null = null;

        if (
          toolName === "generateImage" ||
          toolName.toLowerCase().includes("image")
        ) {
          toolType = "image";
        } else if (
          toolName === "generateVideo" ||
          toolName.toLowerCase().includes("video")
        ) {
          toolType = "video";
        } else if (
          toolName === "webSearch" ||
          toolName === "webContent" ||
          toolName.toLowerCase().includes("search") ||
          toolName.toLowerCase().includes("web")
        ) {
          toolType = "search";
        }

        // If it's a tool with limits, check them
        if (toolType && userId) {
          const pendingUsage: any = {};

          if (toolType === "image") {
            pendingUsage.imageGenerations = 1;
          } else if (toolType === "video") {
            pendingUsage.videoGenerations = 1;
          } else if (toolType === "search") {
            pendingUsage.webSearches = 1;
          }

          const limitCheck = await checkUserLimits(userId, pendingUsage);

          if (!limitCheck.canProceed) {
            const errorMessage = formatLimitError(limitCheck);

            // Return properly formatted error that won't be counted in usage tracking
            if (toolType === "video") {
              return {
                success: false,
                prompt: input?.prompt || "Video generation request",
                error: "Usage limit exceeded",
                solution: errorMessage,
                type: "limit_exceeded",
              };
            } else if (toolType === "image") {
              return {
                success: false,
                prompt: input?.prompt || "Image generation request",
                error: "Usage limit exceeded",
                solution: errorMessage,
                type: "limit_exceeded",
              };
            } else if (toolType === "search") {
              return {
                isError: true,
                error: "Usage limit exceeded",
                solution: errorMessage,
                type: "limit_exceeded",
              };
            }

            // Fallback for other tools
            return {
              error: "Usage limit exceeded",
              message: errorMessage,
              type: "limit_exceeded",
            };
          }
        }

        // Execute the original tool with proper parameters
        try {
          // Check if originalExecute exists and handle parameter requirements
          if (!originalExecute) {
            return { error: "Tool execute function not found" };
          }

          // Always pass both input and options parameters
          return await originalExecute(input, options);
        } catch (error) {
          return { error: "Tool execution failed", details: error };
        }
      },
    });
  });
}

export function mergeSystemPrompt(
  ...prompts: (string | undefined | false)[]
): string {
  const filteredPrompts = prompts
    .map((prompt) => (prompt ? prompt.trim() : ""))
    .filter(Boolean);
  return filteredPrompts.join("\n\n");
}

export function manualToolExecuteByLastMessage(
  part: ToolUIPart,
  tools: Record<string, Tool>,
  abortSignal?: AbortSignal,
) {
  const { input } = part;

  const toolName = getToolName(part);

  const tool = tools[toolName];
  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`);
    if (!ManualToolConfirmTag.isMaybe(part.output))
      throw new Error("manual tool confirm not found");
    return part.output;
  })
    .map(({ confirm }) => {
      if (!confirm) return MANUAL_REJECT_RESPONSE_PROMPT;
      return tool.execute!(input, {
        toolCallId: part.toolCallId,
        abortSignal: abortSignal ?? new AbortController().signal,
        messages: [],
      });
    })
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }

  // Handle subscription limit errors with user-friendly messages
  if (error.message && typeof error.message === "string") {
    if (
      error.message.includes("Daily cost limit exceeded") ||
      error.message.includes("Monthly cost limit exceeded") ||
      error.message.includes("Usage limit exceeded") ||
      error.message.includes("trial has expired")
    ) {
      logger.warn(`Subscription limit: ${error.message}`);
      return error.message; // Return the formatted limit error message
    }

    // Handle file size related errors
    if (
      error.message.includes("file size") ||
      error.message.includes("File size") ||
      error.message.includes("exceeds maximum")
    ) {
      logger.warn(`File upload error: ${error.message}`);
      return `File upload failed: ${error.message}`;
    }
  }

  logger.error(error);
  logger.error(`Route Error: ${error.name}`);
  return errorToString(error.message);
}

export function extractInProgressToolPart(message: UIMessage): ToolUIPart[] {
  if (message.role != "assistant") return [];
  if ((message.metadata as ChatMetadata)?.toolChoice != "manual") return [];
  return message.parts.filter(
    (part) =>
      isToolUIPart(part) &&
      part.state == "output-available" &&
      ManualToolConfirmTag.isMaybe(part.output),
  ) as ToolUIPart[];
}

/**
 * Detect context from messages to intelligently load only necessary tools
 */
function detectRequiredToolkits(
  messages: UIMessage[],
  _mentions?: ChatMention[],
): Set<AppDefaultToolkit> {
  const required = new Set<AppDefaultToolkit>();

  // Always include WebSearch for general queries
  required.add(AppDefaultToolkit.WebSearch);

  // Check last 3 messages for context
  const recentMessages = messages.slice(-3);
  const messageText = recentMessages
    .map((m) =>
      m.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(" ")
        .toLowerCase(),
    )
    .join(" ");

  // Check for file attachments in recent messages
  const hasFiles = recentMessages.some((m) =>
    m.parts.some((p) => p.type === "file"),
  );

  // Data/visualization keywords
  const dataKeywords = [
    "chart",
    "graph",
    "plot",
    "visualize",
    "table",
    "data",
    "statistics",
    "pie chart",
    "bar chart",
    "line chart",
  ];
  const hasDataRequest = dataKeywords.some((kw) => messageText.includes(kw));

  // Image generation keywords
  const imageKeywords = [
    "image",
    "picture",
    "photo",
    "generate image",
    "create image",
    "draw",
    "illustrate",
  ];
  const hasImageRequest = imageKeywords.some((kw) => messageText.includes(kw));

  // Video generation keywords
  const videoKeywords = ["video", "generate video", "create video", "animate"];
  const hasVideoRequest = videoKeywords.some((kw) => messageText.includes(kw));

  // Add toolkits based on context
  if (hasFiles) required.add(AppDefaultToolkit.FileSearch);
  if (hasDataRequest) required.add(AppDefaultToolkit.Visualization);
  if (hasImageRequest) required.add(AppDefaultToolkit.ImageGeneration);
  if (hasVideoRequest) required.add(AppDefaultToolkit.VideoGeneration);

  return required;
}

export const loadAppDefaultTools = (opt?: {
  mentions?: ChatMention[];
  allowedAppDefaultToolkit?: string[];
  userId?: string;
  threadId?: string; // Thread ID for file search context
  messages?: UIMessage[];
  onlyFileSearch?: boolean; // For Learn Mode: only load fileSearch and filesList tools
  skipFileTools?: boolean; // Skip file tools entirely (e.g., Learn Mode with only images)
}) =>
  safe(APP_DEFAULT_TOOL_KIT)
    .map((tools) => {
      if (opt?.mentions?.length) {
        const defaultToolMentions = opt.mentions.filter(
          (m) => m.type == "defaultTool",
        );
        return Array.from(Object.values(tools)).reduce((acc, t) => {
          const allowed = objectFlow(t).filter((_, k) => {
            return defaultToolMentions.some((m) => m.name == k);
          });
          return { ...acc, ...allowed };
        }, {});
      }

      // Skip file tools entirely (e.g., Learn Mode with only images, no documents)
      if (opt?.skipFileTools) {
        return {};
      }

      // Learn Mode: ONLY load file search tools (no web search, no other tools)
      if (opt?.onlyFileSearch && opt?.userId) {
        const fileTools = createFileTools(opt.userId, opt.threadId);
        return {
          [DefaultToolName.FileSearch]: fileTools.fileSearch,
          [DefaultToolName.FilesList]: fileTools.filesList,
        };
      }

      // Context-aware tool loading (for non-Learn modes)
      let toolkitsToInclude: string[];

      if (opt?.messages) {
        // Dynamic loading based on message context
        const requiredToolkits = detectRequiredToolkits(
          opt.messages,
          opt.mentions,
        );
        toolkitsToInclude = Array.from(requiredToolkits);
      } else {
        // Fallback to all tools if no messages provided
        const allowedAppDefaultToolkit =
          opt?.allowedAppDefaultToolkit ?? Object.values(AppDefaultToolkit);

        toolkitsToInclude = [
          ...allowedAppDefaultToolkit,
          ...(allowedAppDefaultToolkit.includes(
            AppDefaultToolkit.ImageGeneration,
          )
            ? []
            : [AppDefaultToolkit.ImageGeneration]),
          ...(allowedAppDefaultToolkit.includes(
            AppDefaultToolkit.VideoGeneration,
          )
            ? []
            : [AppDefaultToolkit.VideoGeneration]),
          ...(allowedAppDefaultToolkit.includes(AppDefaultToolkit.WebSearch)
            ? []
            : [AppDefaultToolkit.WebSearch]),
          ...(allowedAppDefaultToolkit.includes(AppDefaultToolkit.FileSearch)
            ? []
            : [AppDefaultToolkit.FileSearch]),
        ];
      }

      const loadedTools =
        toolkitsToInclude.reduce(
          (acc, key) => {
            if (key === AppDefaultToolkit.FileSearch && opt?.userId) {
              // Special handling for file tools - create them with userId and threadId
              const fileTools = createFileTools(opt.userId, opt.threadId);

              // For Learn Mode, only include fileSearch and filesList (exclude problematic UUID-based tools)
              if (opt.onlyFileSearch) {
                return {
                  ...acc,
                  [DefaultToolName.FileSearch]: fileTools.fileSearch,
                  [DefaultToolName.FilesList]: fileTools.filesList,
                };
              }

              // For Chat Mode, include all file tools
              return {
                ...acc,
                [DefaultToolName.FileSearch]: fileTools.fileSearch,
                [DefaultToolName.FileContent]: fileTools.fileContent,
                [DefaultToolName.FileChunkRange]: fileTools.fileChunkRange,
                [DefaultToolName.FilesList]: fileTools.filesList,
              };
            }
            return { ...acc, ...tools[key] };
          },
          {} as Record<string, Tool>,
        ) || {};

      // Apply limit checking wrapper if userId is provided
      return opt?.userId
        ? wrapToolsWithLimits(loadedTools, opt.userId)
        : loadedTools;
    })
    .ifFail((e) => {
      console.error(e);
      throw e;
    })
    .orElse({} as Record<string, Tool>);

export const convertToSavePart = <T extends UIMessagePart<any, any>>(
  part: T,
) => {
  return safe(
    exclude(part as any, ["providerMetadata", "callProviderMetadata"]) as T,
  ).unwrap();
};
