import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { agentRepository, chatRepository } from "lib/db/repository";
import globalLogger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { chatApiSchemaRequestBodySchema, ChatMetadata } from "app-types/chat";
import { CODER_SYSTEM, PROMPT_BUILDER_SYSTEM } from "lib/ai/mode-prompts";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  extractInProgressToolPart,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import { rememberAgentAction } from "./actions";
import { getSession } from "@/lib/auth/supabase-auth";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import {
  trackUsage,
  trackCoderUsage,
  trackPromptBuilderUsage,
} from "lib/ai/usage-tracker";
import {
  truncateConversation,
  logTruncationResult,
} from "lib/ai/context-manager";
import { checkUserLimits, formatLimitError } from "@/lib/subscription-limits";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const {
      id,
      message,
      chatModel,
      chatMode = "normal",
      toolChoice,
      allowedAppDefaultToolkit,
      mentions = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(chatModel);

    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      logger.info(`create chat thread: ${id}`);
      const newThread = await chatRepository.insertThread({
        id,
        title: "",
        userId: session.user.id,
      });
      thread = await chatRepository.selectThreadDetails(newThread.id);
    }

    if (thread!.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages: UIMessage[] = (thread?.messages ?? []).map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }
    // Simple approach: message already contains file parts from frontend
    messages.push(message);

    const supportToolCall = !isToolCallUnsupportedModel(model);

    const agentId = mentions.find((m) => m.type === "agent")?.agentId;

    const agent = await rememberAgentAction(agentId, session.user.id);

    if (agent?.instructions?.mentions) {
      mentions.push(...agent.instructions.mentions);
    }

    const isToolCallAllowed =
      supportToolCall && (toolChoice != "none" || mentions.length > 0);

    const metadata: ChatMetadata = {
      agentId: agent?.id,
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
    };

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const WORKFLOW_TOOLS = {};

        const APP_DEFAULT_TOOLS = safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
              userId: session.user.id,
              messages, // Pass messages for context-aware tool loading
            }),
          )
          .orElse({});
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                { ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS },
                request.signal,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
            }),
          );
        }

        const userPreferences = thread?.userPreferences || undefined;

        // Use mode-based system prompts or default user system prompt
        let systemPrompt: string;
        if (chatMode === "coder") {
          systemPrompt = CODER_SYSTEM;
        } else if (chatMode === "promptBuilder") {
          systemPrompt = PROMPT_BUILDER_SYSTEM;
        } else {
          systemPrompt = buildUserSystemPrompt(
            session.user,
            userPreferences,
            agent,
          );
        }

        const vercelAITooles = safe({ ...WORKFLOW_TOOLS })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${mentions.length}`,
        );

        logger.info(
          `allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        logger.info(
          `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, Workflow: ${Object.keys(WORKFLOW_TOOLS ?? {}).length}`,
        );
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        // Collect file attachments before truncation for persistence
        const allAttachments: Array<{
          name: string;
          contentType: string;
          url: string;
        }> = [];

        // Only process files if messages exist and are valid
        if (messages && Array.isArray(messages)) {
          for (const msg of messages) {
            if (
              msg?.role === "user" &&
              msg?.parts &&
              Array.isArray(msg.parts)
            ) {
              for (const part of msg.parts) {
                try {
                  if (part?.type === "file" && part?.url) {
                    allAttachments.push({
                      name: part.filename || "unknown",
                      contentType: part.mediaType || "application/octet-stream",
                      url: part.url,
                    });
                  }
                } catch (_partError) {
                  // Skip invalid file parts silently
                  continue;
                }
              }
            }
          }
        }

        // Context truncation optimization
        const truncationResult = truncateConversation(messages, chatModel!);
        logTruncationResult(truncationResult, logger);

        // Use truncated messages for the API call
        const optimizedMessages = truncationResult.messages;

        // Log messages before conversion for debugging (excluding large file content)
        const lastMessageParts = optimizedMessages.slice(-1)[0]?.parts;
        const logSafeParts = lastMessageParts?.map((part) => {
          if (part.type === "file" && (part as any).url?.startsWith("data:")) {
            return {
              ...part,
              url: `[DATA_URL:${(part as any).url?.substring(0, 50)}...]`,
            };
          }
          return part;
        });
        logger.info(
          `Messages before conversion (last message parts):`,
          JSON.stringify(logSafeParts, null, 2),
        );

        // Basic token limit check (without tool predictions) - applies to all users based on their subscription
        // Skip token limit check for file uploads to allow unrestricted file processing
        const lastUserMessage = optimizedMessages
          .slice()
          .reverse()
          .find((m) => m.role === "user");

        if (lastUserMessage) {
          // Check if this message contains file uploads
          const hasFileUploads = lastUserMessage.parts?.some((part) => {
            const partData = part as any;
            return partData.file?.data || partData.file?.type;
          });

          // Only check token limits for text-only messages, skip file uploads
          if (!hasFileUploads) {
            // Rough token estimation: ~4 chars per token (only for text parts)
            const textParts =
              lastUserMessage.parts?.filter((part) => part.type === "text") ||
              [];
            const estimatedInputTokens = Math.ceil(
              JSON.stringify(textParts).length / 4,
            );
            const estimatedOutputTokens = 150; // Conservative estimate for response

            const limitCheck = await checkUserLimits(session.user.id, {
              inputTokens: estimatedInputTokens,
              outputTokens: estimatedOutputTokens,
            });

            if (!limitCheck.canProceed) {
              const errorMessage = formatLimitError(limitCheck);
              logger.warn(
                `User ${session.user.id} exceeded limits: ${errorMessage}`,
              );

              // Throw an error that will be handled by the onError handler
              throw new Error(errorMessage);
            }
          } else {
            logger.info("Skipping token limit check for file upload message");
          }
        }

        // Debug: Log final message structure after truncation
        logger.info(
          `Processing ${optimizedMessages.length} messages after truncation`,
        );
        logger.info(
          `Final files to include: ${allAttachments.length > 0 ? allAttachments.map((f) => f.name).join(", ") : "none"}`,
        );

        // Verify files are preserved even if messages were truncated
        if (allAttachments.length > 0 && truncationResult.truncated) {
          logger.info(
            `Truncation occurred but ${allAttachments.length} files preserved for persistent access`,
          );
        }

        // Update system prompt to include file information if files are available
        const enhancedSystemPrompt =
          allAttachments.length > 0
            ? `${systemPrompt}

<conversation_files>
You have access to the following files uploaded in this conversation:
${allAttachments.map((f) => `- ${f.name} (${f.contentType})`).join("\n")}

FILE SEARCH CAPABILITIES:
You have access to powerful file search and analysis tools:

1. fileSearch: Search through file content using semantic or exact text matching
   - Use searchMode: "semantic" for concepts, topics, themes
   - Use searchMode: "exact" for section numbers (3.2, 4.1), specific terms, quotes

2. fileChunkRange: Most token-efficient way to access specific document parts
   - Use fromEnd: 3-5 for conclusions/endings
   - Use start: 0, end: 2 for introductions/beginnings
   - Use specific ranges when you know approximate positions

3. fileContent: Retrieve complete file content (use sparingly - token expensive)

4. filesList: Get overview of all uploaded files

TOOL SELECTION STRATEGY:
- Section numbers ("3.2", "point 4.1") → fileSearch with searchMode: "exact"
- Concepts, topics, themes → fileSearch with searchMode: "semantic"
- Conclusions/endings → fileChunkRange with fromEnd: 3-5
- Introductions → fileChunkRange with start: 0, end: 2
- Complete document → fileContent (avoid when possible)

The files remain available throughout the entire conversation for analysis and reference.
</conversation_files>`
            : systemPrompt;

        const result = streamText({
          model,
          system: enhancedSystemPrompt,
          messages: convertToModelMessages(optimizedMessages),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 2,
          tools: vercelAITooles,
          stopWhen: stepCountIs(10),
          toolChoice: "auto",
          abortSignal: request.signal,
          // AI SDK 5 token limit - increased for coder mode
          maxOutputTokens:
            chatModel?.model === "uvala-fuji"
              ? 3000
              : chatMode === "coder"
                ? 16000 // Increased limit for coder to generate larger components
                : 4000,
          // GPT-5 optimization settings
          providerOptions:
            chatModel?.model === "uvala-fuji"
              ? {
                  openai: {
                    reasoningEffort: "medium",
                    textVerbosity: "medium",
                    includeReasoning: false,
                  },
                }
              : chatModel?.model === "uvala-everest"
                ? {
                    openai: {
                      reasoningEffort: "high",
                      textVerbosity: "medium",
                      reasoningSummary: "auto",
                      includeReasoning: false,
                    },
                  }
                : {
                    openai: {
                      reasoningEffort: "medium",
                      textVerbosity: "medium",
                      reasoningSummary: "auto",
                      includeReasoning: false,
                    },
                  },
        });
        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type == "finish") {
                metadata.usage = part.totalUsage;
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        if (responseMessage.id == message.id) {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...responseMessage,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        } else {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: message.role,
            parts: message.parts.map(convertToSavePart),
            id: message.id,
          });
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        }

        // Track usage and costs - only for the assistant's response message to avoid duplicates
        if (
          metadata.usage &&
          metadata.chatModel &&
          session?.user?.id &&
          responseMessage.id !== message.id
        ) {
          // Count tool calls from response message
          const toolCallsCount = responseMessage.parts.filter(
            (part) => part.type === "tool-call",
          ).length;

          // Count specific tool types used in this conversation
          let imageGenerations = 0;
          let videoGenerations = 0;
          let webSearches = 0;

          responseMessage.parts.forEach((part) => {
            // Check for tool execution parts (type starts with 'tool-')
            if (
              part.type &&
              typeof part.type === "string" &&
              part.type.startsWith("tool-")
            ) {
              const toolType = part.type;
              const toolState = (part as any).state;
              const toolOutput = (part as any).output;

              // Only count successfully executed tools (output-available state)
              // AND make sure it's not a limit error AND that it was successful
              if (
                toolState === "output-available" &&
                toolOutput &&
                toolOutput.type !== "limit_exceeded" &&
                !toolOutput.error?.includes?.("Usage limit exceeded")
              ) {
                // Check if the tool execution was successful
                const isToolSuccessful =
                  toolOutput.success === true ||
                  (toolOutput.success !== false && !toolOutput.error);

                if (isToolSuccessful) {
                  if (toolType === "tool-generateImage") {
                    imageGenerations++;
                  } else if (toolType === "tool-generateVideo") {
                    videoGenerations++;
                  } else if (
                    toolType === "tool-webSearch" ||
                    toolType === "tool-webContent"
                  ) {
                    webSearches++;
                  }
                }
              }
            }
          });

          // Use mode-specific tracking functions
          if (chatMode === "coder") {
            // Log the COMPLETE usage object to verify token counting
            logger.info(
              `🔍 CODER MODE - RAW USAGE OBJECT for user ${session.user.id}:`,
              JSON.stringify(metadata.usage, null, 2),
            );

            logger.info(`🔍 CODER MODE - USAGE BREAKDOWN:`, {
              inputTokens: metadata.usage?.inputTokens,
              outputTokens: metadata.usage?.outputTokens,
              totalTokens: metadata.usage?.totalTokens,
              reasoningTokens: metadata.usage?.reasoningTokens,
              cachedInputTokens: metadata.usage?.cachedInputTokens,
            });

            await trackCoderUsage({
              usage: metadata.usage,
              userId: session.user.id,
              chatModel: metadata.chatModel || {
                provider: "Internal",
                model: "uvala-coder",
              },
            });
          } else if (chatMode === "promptBuilder") {
            await trackPromptBuilderUsage({
              usage: metadata.usage,
              userId: session.user.id,
              chatModel: metadata.chatModel || {
                provider: "Internal",
                model: "uvala-prompter",
              },
            });
          } else {
            // Normal mode tracking with full features
            await trackUsage({
              usage: metadata.usage,
              userId: session.user.id,
              threadId: thread?.id,
              messageId: responseMessage.id,
              chatModel: metadata.chatModel,
              toolCallsCount,
              toolUsage: {
                imageGenerations,
                videoGenerations,
                webSearches,
              },
            });
          }
        }

        if (agent) {
          agentRepository.updateAgent(agent.id, session.user.id, {
            updatedAt: new Date(),
          } as any);
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error: any) {
    logger.error("Chat API Error:", error);
    const isDev = process.env.NODE_ENV === "development";
    const message = isDev ? error.message : "Failed to process chat request";
    return Response.json({ message }, { status: 500 });
  }
}
