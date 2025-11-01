import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/supabase-auth";
import {
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import { customModelProvider } from "lib/ai/models";
import globalLogger from "logger";
import { colorize } from "consola/utils";
import { checkUserLimits } from "@/lib/subscription-limits";
import { trackUsage } from "@/lib/ai/usage-tracker";
import { COMPONENTS_SYSTEM } from "@/lib/ai/mode-prompts";
import { chatRepository } from "lib/db/repository";
import { generateUUID } from "lib/utils";
import { handleError } from "../shared.chat";

const logger = globalLogger.withDefaults({
  message: colorize("magentaBright", `Components API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user?.id) {
      return redirect("/sign-in");
    }

    const { id, messages, chatModel } = json as {
      id: string;
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
    };

    // Get or create thread
    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      logger.info(`📝 Create Components thread: ${id}`);
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

    logger.info(
      `🎨 COMPONENTS MODE - Using model: ${chatModel?.provider}/${chatModel?.model}`,
    );
    const model = customModelProvider.getModel(chatModel);
    logger.info(
      `🔧 COMPONENTS MODE - Resolved to actual model: qwen3-coder-30b (uvala-components)`,
    );

    // Estimate token usage for limit checking
    const estimatedInputTokens =
      (messages || []).reduce((acc, msg) => {
        if (!msg || !msg.parts) return acc;
        const textParts =
          msg.parts.filter((part) => part && part.type === "text") || [];
        return acc + Math.ceil(JSON.stringify(textParts).length / 4);
      }, 0) + Math.ceil(COMPONENTS_SYSTEM.length / 4);

    const estimatedOutputTokens = 2000; // Estimate for component responses
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;

    // Check limits before proceeding
    const limitCheck = await checkUserLimits(session.user.id);

    logger.info(`🔍 COMPONENTS - Limit check for user ${session.user.id}:`, {
      estimatedTokens: estimatedTotalTokens,
      canProceed: limitCheck.canProceed,
      limitExceeded: limitCheck.limitExceeded,
    });

    if (!limitCheck.canProceed) {
      logger.warn(`🚫 COMPONENTS - Limit exceeded for user ${session.user.id}`);
      return new Response(
        JSON.stringify({
          error: limitCheck.limitExceeded,
          limitExceededKey: limitCheck.limitExceededKey,
          limitExceededParams: limitCheck.limitExceededParams,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1];
    const metadata: any = {};

    // Create UI message stream for proper message handling
    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model,
          system: COMPONENTS_SYSTEM,
          messages: convertToModelMessages(messages),
          maxOutputTokens: 16000, // Qwen3 Coder 30B supports up to 16k tokens
        });

        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type === "finish") {
                metadata.usage = part.totalUsage;
                metadata.chatModel = chatModel || {
                  provider: "Internal",
                  model: "uvala-components",
                };
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        // Save user and assistant messages
        if (responseMessage.id === lastUserMessage.id) {
          // Single message case
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...responseMessage,
            parts: responseMessage.parts,
            metadata,
          });
        } else {
          // User message and assistant message are separate
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: lastUserMessage.role,
            parts: lastUserMessage.parts,
            id: lastUserMessage.id,
          });
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: responseMessage.parts,
            metadata,
          });
        }

        if (metadata.usage) {
          logger.info(`🔍 COMPONENTS - USAGE BREAKDOWN:`, {
            inputTokens: metadata.usage.inputTokens,
            outputTokens: metadata.usage.outputTokens,
            totalTokens: metadata.usage.totalTokens,
          });

          // Track usage (counts toward main limits)
          await trackUsage({
            usage: metadata.usage,
            userId: session.user.id,
            chatModel: metadata.chatModel,
            toolCallsCount: 0, // Components mode doesn't use tools
          });

          logger.info(
            `✅ COMPONENTS - Messages saved and session completed for user ${session.user.id}`,
          );
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error) {
    logger.error("Components API error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred during the components session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
