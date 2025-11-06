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
import {
  CODER_SYSTEM,
  PROMPT_BUILDER_SYSTEM,
  LEARN_SYSTEM,
  COMPONENTS_SYSTEM,
} from "lib/ai/mode-prompts";

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
import { preprocessFileAttachments } from "@/lib/ai/vision-preprocessor";

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

    // Vision preprocessing variables (for Learn Mode)
    let visionTokensUsed = 0;
    let visionCost = 0;

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const WORKFLOW_TOOLS = {};

        // Note: APP_DEFAULT_TOOLS and tool handling will be done after we check for files in Learn Mode

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${mentions.length}`,
        );

        logger.info(
          `allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        // For Learn Mode with documents, query database for uploaded files in this thread
        // (since we strip document file parts from messages)
        let dbFiles: Array<{ id: string; name: string; contentType: string }> =
          [];
        if (chatMode === "learn") {
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
            );

            const { data: filesData } = await supabase
              .from("files")
              .select("id, original_filename, content_type")
              .eq("user_id", session.user.id)
              .eq("thread_id", id)
              .order("created_at", { ascending: false });

            if (filesData && filesData.length > 0) {
              dbFiles = filesData.map((f) => ({
                id: f.id,
                name: f.original_filename,
                contentType: f.content_type,
              }));
              logger.info(
                `📚 LEARN MODE - Found ${dbFiles.length} files in database for thread ${id}`,
              );
            }
          } catch (error) {
            logger.error("Error querying files from database:", error);
          }
        }

        // Load tools AFTER we know if there are files (needed for skipFileTools check)
        const APP_DEFAULT_TOOLS = safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
              userId: session.user.id,
              threadId: id,
              messages,
              onlyFileSearch: chatMode === "learn",
              skipFileTools: chatMode === "learn" && dbFiles.length === 0,
            }),
          )
          .orElse({});

        logger.info(
          `🔧 Loaded tools: ${Object.keys(APP_DEFAULT_TOOLS).join(", ")}`,
        );
        logger.info(
          `🔧 Chat mode: ${chatMode}, DB files: ${dbFiles.length}, Skip file tools: ${chatMode === "learn" && dbFiles.length === 0}`,
        );
        logger.info(
          `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, Workflow: ${Object.keys(WORKFLOW_TOOLS ?? {}).length}`,
        );

        // Handle in-progress tool calls
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
        } else if (chatMode === "learn") {
          systemPrompt = LEARN_SYSTEM;
        } else if (chatMode === "components") {
          systemPrompt = COMPONENTS_SYSTEM;
        } else {
          systemPrompt = buildUserSystemPrompt(
            session.user,
            userPreferences,
            agent,
          );
        }

        // Merge workflow and app default tools
        const vercelAITooles = safe({ ...WORKFLOW_TOOLS })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS,
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        // Collect file attachments from messages (for non-Learn modes)
        const allAttachments: Array<{
          name: string;
          contentType: string;
          url: string;
        }> = [];

        // Only process files if messages exist and are valid (skip for Learn Mode)
        if (messages && Array.isArray(messages) && chatMode !== "learn") {
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

        // ============= VISION PREPROCESSING FOR LEARN MODE =============
        let messagesForProcessing = messages;

        if (chatMode === "learn") {
          // Check for drag-and-drop file attachments
          const lastMessage = messages[messages.length - 1];
          const fileParts =
            lastMessage.parts?.filter((p) => p.type === "file") || [];

          // Separate images from documents
          const imageParts = fileParts.filter((p) =>
            p.mediaType?.startsWith("image/"),
          );
          const documentParts = fileParts.filter(
            (p) => !p.mediaType?.startsWith("image/"),
          );

          // Process images with vision preprocessing (GPT-5 mini)
          if (imageParts.length > 0) {
            // Process images with vision preprocessing
            logger.info(
              `🔍 LEARN MODE - Detected ${imageParts.length} image(s)`,
            );

            const { contextString, analyses, totalTokens, totalCost } =
              await preprocessFileAttachments(imageParts);

            visionTokensUsed = totalTokens;
            visionCost = totalCost;

            logger.info(
              `📊 LEARN MODE - Vision preprocessing: ${totalTokens} tokens, $${totalCost.toFixed(6)}`,
            );

            // Log each analysis summary
            analyses.forEach((analysis) => {
              logger.info(
                `  - 🖼️ ${analysis.filename}: ${analysis.tokensUsed} tokens (${analysis.processingTimeMs}ms)`,
              );
            });

            // Inject file analysis into the user's message
            const textContent = lastMessage.parts
              ?.filter((p) => p.type === "text")
              .map((p) => (p as any).text)
              .join("\n");

            // Create enhanced message with file context
            const enhancedMessage: UIMessage = {
              ...lastMessage,
              parts: [
                {
                  type: "text",
                  text: `${contextString}\n\n---\n\n**Student Question:** ${textContent}`,
                },
              ],
            };

            // Replace last message with enhanced version
            messagesForProcessing = [...messages.slice(0, -1), enhancedMessage];

            logger.info(`✅ LEARN MODE - Image preprocessing complete`);
          }

          // Documents will be handled via file search tools (not preprocessing)
          // Strip document file parts from messages since Qwen doesn't support document attachments
          if (documentParts.length > 0) {
            logger.info(
              `📄 LEARN MODE - Detected ${documentParts.length} document(s) - will use file search tools`,
            );

            // Remove document file parts from the last message (keep only text and images)
            const currentMsg =
              messagesForProcessing[messagesForProcessing.length - 1];
            const filteredParts = currentMsg.parts?.filter(
              (p) =>
                p.type !== "file" || (p as any).mediaType?.startsWith("image/"),
            );

            const cleanedMessage: UIMessage = {
              ...currentMsg,
              parts: filteredParts,
            };

            messagesForProcessing = [
              ...messagesForProcessing.slice(0, -1),
              cleanedMessage,
            ];

            logger.info(
              `🧹 LEARN MODE - Removed document file parts from message (AI will access via tools)`,
            );
          }
        }
        // ================================================================

        // Context truncation optimization
        const truncationResult = truncateConversation(
          messagesForProcessing,
          chatModel!,
        );
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

        const fileList =
          chatMode === "learn"
            ? dbFiles.map((f) => f.name).join(", ") || "none"
            : allAttachments.map((f) => f.name).join(", ") || "none";

        logger.info(`Final files to include: ${fileList}`);

        // Verify files are preserved even if messages were truncated
        if (
          (allAttachments.length > 0 || dbFiles.length > 0) &&
          truncationResult.truncated
        ) {
          logger.info(
            `Truncation occurred but ${allAttachments.length + dbFiles.length} files preserved for persistent access`,
          );
        }

        // Update system prompt to include file information if files are available
        const hasFiles =
          chatMode === "learn" ? dbFiles.length > 0 : allAttachments.length > 0;
        const fileListForPrompt =
          chatMode === "learn"
            ? dbFiles.map((f) => `- ${f.name} (${f.contentType})`).join("\n")
            : allAttachments
                .map((f) => `- ${f.name} (${f.contentType})`)
                .join("\n");

        const enhancedSystemPrompt = hasFiles
          ? chatMode === "learn"
            ? `${systemPrompt}

<document_access>
The student has uploaded document(s) for learning assistance:
${fileListForPrompt}

**AVAILABLE TOOLS:**

1. **fileSearch** - Search document content (USE THIS TO READ THE DOCUMENT)
   - Input: { query: "what to search for", searchMode: "semantic" | "exact" }
   - Output: Array of results with "content" field containing REAL document text
   - Use searchMode: "semantic" for concepts, topics, themes, main ideas
   - Use searchMode: "exact" for specific terms, quotes, section numbers
   - Example: fileSearch({ query: "introduction main topic", searchMode: "semantic" })

2. **filesList** - Get list of uploaded files (rarely needed)
   - Use only when student asks "what files do I have?"

**HOW TO TEACH WITH DOCUMENTS:**

Step 1: Call fileSearch with relevant query based on student's question
   - Student asks: "What is this document about?"
   - You call: fileSearch({ query: "introduction purpose overview main topic", searchMode: "semantic" })
   - Student asks: "What does section 3.2 say?"
   - You call: fileSearch({ query: "3.2", searchMode: "exact" })

Step 2: Read the "content" field from results CAREFULLY
   - Tool returns: [{ content: "This paper presents...", fileName: "doc.pdf", similarity: 95 }]
   - The "content" field contains ACTUAL text from the document - READ IT WORD BY WORD!

Step 3: Base your teaching ONLY on that REAL content
   - Quote specific parts from what you read
   - Use Socratic method to guide the student
   - Ask questions that help them discover insights
   - If no results, say "I couldn't find that in the document"

**CRITICAL RULES:**
✅ DO: Base ALL answers on content returned by fileSearch
✅ DO: Quote or reference specific parts you read
✅ DO: Call fileSearch multiple times with different queries if needed
✅ DO: Say "I couldn't find information about X" if search returns no results
❌ DON'T: Make up or hallucinate document content - NEVER!
❌ DON'T: Provide detailed summaries without calling fileSearch first
❌ DON'T: Say "Based on the document..." unless you ACTUALLY read it via fileSearch
❌ DON'T: Ignore tool results or pretend you read something you didn't

**Query Construction Tips:**
- For document overview: query: "introduction abstract summary purpose" (semantic)
- For specific sections: query: "section 2.1" or "chapter 3" (exact)
- For conclusions: query: "conclusion findings recommendations" (semantic)
- For specific topics: query: "market analysis" or "technical specifications" (semantic)

The documents ARE searchable and you CAN read them via fileSearch. You MUST use fileSearch before answering questions about document content!
</document_access>`
            : `${systemPrompt}

<conversation_files>
You have access to the following files uploaded in this conversation:
${fileListForPrompt}

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
          // AI SDK 5 token limit - model-specific configuration
          maxOutputTokens:
            chatModel?.model === "uvala-fuji"
              ? 3000
              : chatModel?.model === "uvala-sensei"
                ? 8000 // Sensei uses Qwen3-32B (32K context, 8K output for teaching)
                : chatMode === "coder"
                  ? 16000 // Coder needs larger output for code generation
                  : 4000,
          // Temperature and top_p for uvala-sensei
          temperature: chatModel?.model === "uvala-sensei" ? 0.7 : undefined,
          topP: chatModel?.model === "uvala-sensei" ? 0.9 : undefined,
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
          // AWS Bedrock-specific settings for GPT-OSS (uvala-sensei)
          ...(chatModel?.model === "uvala-sensei" && {
            additionalModelRequestFields: {
              reasoning_effort: "low", // Low reasoning effort for faster responses
            },
          }),
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
          } else if (chatMode === "learn") {
            // Learn mode tracking with vision tokens
            logger.info(`🔍 LEARN MODE - USAGE BREAKDOWN:`, {
              visionTokens: visionTokensUsed,
              visionCost: `$${visionCost.toFixed(6)}`,
              inputTokens: metadata.usage?.inputTokens,
              outputTokens: metadata.usage?.outputTokens,
              totalTokens: metadata.usage?.totalTokens,
              combinedTotal:
                (metadata.usage?.totalTokens || 0) + visionTokensUsed,
            });

            await trackUsage({
              usage: {
                ...metadata.usage,
                // Add vision tokens to input tokens for accurate tracking
                inputTokens:
                  (metadata.usage?.inputTokens || 0) + visionTokensUsed,
                totalTokens:
                  (metadata.usage?.totalTokens || 0) + visionTokensUsed,
              },
              userId: session.user.id,
              threadId: thread?.id,
              messageId: responseMessage.id,
              chatModel: metadata.chatModel || {
                provider: "Internal",
                model: "uvala-sensei",
              },
              toolCallsCount: 0, // Learn mode doesn't use tools
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
