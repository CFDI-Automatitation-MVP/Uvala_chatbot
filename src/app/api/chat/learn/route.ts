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
import { LEARN_SYSTEM } from "@/lib/ai/mode-prompts";
import { preprocessFileAttachments } from "@/lib/ai/vision-preprocessor";

const logger = globalLogger.withDefaults({
  message: colorize("greenBright", `Learn API: `),
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
      `🎓 LEARN MODE - Using model: ${chatModel?.provider}/${chatModel?.model}`,
    );
    const model = customModelProvider.getModel(chatModel);
    logger.info(
      `🔧 LEARN MODE - Resolved to actual model: qwen3-32b (uvala-sensei)`,
    );

    // ============= VISION PREPROCESSING =============
    const lastMessage = messages[messages.length - 1];
    const fileParts = lastMessage.parts?.filter((p) => p.type === "file") || [];

    let visionTokensUsed = 0;
    let visionCost = 0;
    let preprocessedMessages = messages;

    if (fileParts.length > 0) {
      logger.info(`🔍 LEARN - Detected ${fileParts.length} file attachment(s)`);

      const { contextString, analyses, totalTokens, totalCost } =
        await preprocessFileAttachments(fileParts);

      visionTokensUsed = totalTokens;
      visionCost = totalCost;

      logger.info(
        `📊 LEARN - Vision preprocessing: ${totalTokens} tokens, $${totalCost.toFixed(6)}`,
      );

      // Log each analysis summary
      analyses.forEach((analysis) => {
        logger.info(
          `  - ${analysis.type === "image" ? "🖼️" : "📄"} ${analysis.filename}: ${analysis.tokensUsed} tokens (${analysis.processingTimeMs}ms)`,
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
      preprocessedMessages = [...messages.slice(0, -1), enhancedMessage];

      logger.info(`✅ LEARN - File preprocessing complete`);
    }
    // ================================================

    // Estimate token usage for limit checking (include vision tokens)
    const estimatedInputTokens =
      preprocessedMessages.reduce((acc, msg) => {
        const textParts =
          msg.parts?.filter((part) => part.type === "text") || [];
        return acc + Math.ceil(JSON.stringify(textParts).length / 4);
      }, 0) +
      Math.ceil(LEARN_SYSTEM.length / 4) +
      visionTokensUsed; // Add vision preprocessing tokens

    const estimatedOutputTokens = 1000; // Estimate for tutor responses
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;

    // Check limits before proceeding
    const limitCheck = await checkUserLimits(session.user.id);

    logger.info(`🔍 LEARN - Limit check for user ${session.user.id}:`, {
      estimatedTokens: estimatedTotalTokens,
      visionTokens: visionTokensUsed,
      visionCost: `$${visionCost.toFixed(6)}`,
      canProceed: limitCheck.canProceed,
      limitExceeded: limitCheck.limitExceeded,
    });

    if (!limitCheck.canProceed) {
      logger.warn(`🚫 LEARN - Limit exceeded for user ${session.user.id}`);
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
      system: LEARN_SYSTEM,
      messages: convertToModelMessages(preprocessedMessages), // Use preprocessed messages
      experimental_transform: smoothStream({ chunking: "word" }),
      maxOutputTokens: 16000, // Qwen3-32B supports up to 16k tokens
      onFinish: async (completion) => {
        if (completion.usage) {
          logger.info(`🔍 LEARN - USAGE BREAKDOWN:`, {
            visionTokens: visionTokensUsed,
            visionCost: `$${visionCost.toFixed(6)}`,
            qwenInputTokens: completion.usage.inputTokens,
            qwenOutputTokens: completion.usage.outputTokens,
            qwenTotalTokens: completion.usage.totalTokens,
            combinedTotal: completion.usage.totalTokens + visionTokensUsed,
          });

          // Track usage (include vision tokens in total)
          await trackUsage({
            usage: {
              ...completion.usage,
              // Add vision tokens to input tokens for accurate tracking
              inputTokens: completion.usage.inputTokens + visionTokensUsed,
              totalTokens: completion.usage.totalTokens + visionTokensUsed,
            },
            userId: session.user.id,
            chatModel: chatModel || {
              provider: "Internal",
              model: "uvala-sensei",
            },
            toolCallsCount: 0, // Learn mode doesn't use tools
          });

          logger.info(
            `✅ LEARN - Session completed for user ${session.user.id} (vision: ${visionTokensUsed} tokens, qwen: ${completion.usage.totalTokens} tokens)`,
          );
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("Learn API error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred during the learn session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
