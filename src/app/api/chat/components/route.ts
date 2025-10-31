import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/supabase-auth";
import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { customModelProvider } from "lib/ai/models";
import globalLogger from "logger";
import { colorize } from "consola/utils";
import { checkUserLimits } from "@/lib/subscription-limits";
import { trackUsage } from "@/lib/ai/usage-tracker";
import { COMPONENTS_SYSTEM } from "@/lib/ai/mode-prompts";

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

    const { messages, chatModel } = json as {
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
    };

    logger.info(
      `🎨 COMPONENTS MODE - Using model: ${chatModel?.provider}/${chatModel?.model}`,
    );
    const model = customModelProvider.getModel(chatModel);
    logger.info(
      `🔧 COMPONENTS MODE - Resolved to actual model: qwen3-32b (uvala-components)`,
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

    // Create the streaming response with usage tracking
    const result = streamText({
      model,
      system: COMPONENTS_SYSTEM,
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
      maxOutputTokens: 16000, // Qwen3-32B supports up to 16k tokens
      onFinish: async (completion) => {
        if (completion.usage) {
          logger.info(`🔍 COMPONENTS - USAGE BREAKDOWN:`, {
            inputTokens: completion.usage.inputTokens,
            outputTokens: completion.usage.outputTokens,
            totalTokens: completion.usage.totalTokens,
          });

          // Track usage (counts toward main limits)
          await trackUsage({
            usage: completion.usage,
            userId: session.user.id,
            chatModel: chatModel || {
              provider: "Internal",
              model: "uvala-components",
            },
            toolCallsCount: 0, // Components mode doesn't use tools
          });

          logger.info(
            `✅ COMPONENTS - Session completed for user ${session.user.id}`,
          );
        }
      },
    });

    return result.toUIMessageStreamResponse();
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
