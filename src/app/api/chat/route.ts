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
import {
  buildUserSystemPrompt,
} from "lib/ai/prompts";
import { chatApiSchemaRequestBodySchema, ChatMetadata } from "app-types/chat";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  extractInProgressToolPart,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import {
  rememberAgentAction,
} from "./actions";
import { getSession } from "@/lib/auth/supabase-auth";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { trackUsage } from "lib/ai/usage-tracker";
import { truncateConversation, logTruncationResult } from "lib/ai/context-manager";
import { checkProUserLimits, formatLimitError } from "@/lib/subscription-limits";
import { estimateMessageCost } from "@/lib/cost-calculator";
import { subscriptionRepository } from "@/lib/db/repository";
import { isSubscriptionActive } from "@/lib/subscription";

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

        const WORKFLOW_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadWorkFlowTools({
              mentions,
              dataStream,
            }),
          )
          .orElse({});

        const APP_DEFAULT_TOOLS = safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
              userId: session.user.id,
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


        const systemPrompt = buildUserSystemPrompt(session.user, userPreferences, agent);

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

        // Context truncation optimization
        const truncationResult = truncateConversation(messages, chatModel!);
        logTruncationResult(truncationResult, logger);
        
        // Use truncated messages for the API call
        const optimizedMessages = truncationResult.messages;

        // Log messages before conversion for debugging
        logger.info(`Messages before conversion (last message parts):`, 
          JSON.stringify(optimizedMessages.slice(-1)[0]?.parts, null, 2));

        // Check Pro user limits before making the API call (only for active Pro subscribers)
        const subscription = await subscriptionRepository.getUserActiveSubscription(session.user.id);
        if (subscription?.planType === 'pro' && isSubscriptionActive(subscription)) {
          // Estimate tokens for this message to check if it would exceed limits
          const lastUserMessage = optimizedMessages.slice().reverse().find(m => m.role === 'user');
          if (lastUserMessage) {
            // Rough token estimation: ~4 chars per token
            const estimatedInputTokens = Math.ceil(JSON.stringify(lastUserMessage.parts).length / 4);
            const estimatedOutputTokens = 150; // Conservative estimate for response
            
            const limitCheck = await checkProUserLimits(session.user.id, {
              inputTokens: estimatedInputTokens,
              outputTokens: estimatedOutputTokens,
            });

            if (!limitCheck.canProceed) {
              const errorMessage = formatLimitError(limitCheck);
              logger.warn(`Pro user ${session.user.id} exceeded limits: ${errorMessage}`);
              
              // Throw an error that will be handled by the onError handler
              throw new Error(`Usage limit exceeded: ${errorMessage}`);
            }
          }
        }
        
        const result = streamText({
          model,
          system: systemPrompt,
          messages: convertToModelMessages(optimizedMessages),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 2,
          tools: vercelAITooles,
          stopWhen: stepCountIs(10),
          toolChoice: "auto",
          abortSignal: request.signal,
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

        // Track usage and costs
        if (metadata.usage && metadata.chatModel && session?.user?.id) {
          // Count tool calls from response message
          const toolCallsCount = responseMessage.parts.filter(part => 
            part.type === 'tool-call'
          ).length;
          
          // Count specific tool types used in this conversation
          let imageGenerations = 0;
          let videoGenerations = 0;
          let webSearches = 0;

          responseMessage.parts.forEach(part => {
            if (part.type === 'tool-call' && 'toolName' in part) {
              const toolName = (part as any).toolName || '';
              // Use exact tool names from DefaultToolName enum
              if (toolName === 'generateImage' || toolName.toLowerCase().includes('image')) {
                imageGenerations++;
              } else if (toolName === 'generateVideo' || toolName.toLowerCase().includes('video')) {
                videoGenerations++;
              } else if (toolName === 'webSearch' || toolName === 'webContent' || toolName.toLowerCase().includes('search') || toolName.toLowerCase().includes('web')) {
                webSearches++;
              }
            }
          });
          
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
    logger.error(error);
    return Response.json({ message: error.message }, { status: 500 });
  }
}
