import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/supabase-auth";
import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { customModelProvider } from "lib/ai/models";
import { chatRepository } from "lib/db/repository";
import globalLogger from "logger";
import { colorize } from "consola/utils";
import { checkUserLimits } from "@/lib/subscription-limits";
import { trackUsage } from "@/lib/ai/usage-tracker";
import { COMPONENTS_SYSTEM } from "@/lib/ai/mode-prompts";
import { chatApiSchemaRequestBodySchema } from "app-types/chat";

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
      messages?: UIMessage[];
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

    let normalizedMessages: UIMessage[] | undefined = Array.isArray(messages)
      ? messages
      : undefined;

    if (!normalizedMessages) {
      const legacyRequest = chatApiSchemaRequestBodySchema.safeParse(json);
      if (legacyRequest.success) {
        const { id, message } = legacyRequest.data;

        let thread = await chatRepository.selectThreadDetails(id);

        if (!thread) {
          logger.info(`🧵 COMPONENTS - Creating new thread for id ${id}`);
          const newThread = await chatRepository.insertThread({
            id,
            title: "",
            userId: session.user.id,
          });
          thread = await chatRepository.selectThreadDetails(newThread.id);
        }

        if (!thread || thread.userId !== session.user.id) {
          return new Response("Forbidden", { status: 403 });
        }

        normalizedMessages = (thread.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          parts: m.parts,
          metadata: m.metadata,
        }));

        if (normalizedMessages.at(-1)?.id === message.id) {
          normalizedMessages.pop();
        }

        normalizedMessages.push(message);

        logger.info(
          `🔁 COMPONENTS - Reconstructed ${normalizedMessages.length} messages from thread ${id}`,
        );
      } else if ((json as { message?: UIMessage }).message) {
        const fallbackMessage = (json as { message?: UIMessage }).message;
        normalizedMessages = fallbackMessage ? [fallbackMessage] : undefined;

        logger.warn(
          `⚠️ COMPONENTS - Received legacy payload without valid thread context; proceeding with ${normalizedMessages?.length ?? 0} message(s)`,
          {
            issues: legacyRequest.error.flatten(),
          },
        );
      }
    }

    if (!normalizedMessages?.length) {
      logger.error("❌ COMPONENTS - No messages provided in request body");
      return new Response(
        JSON.stringify({
          error: "No messages provided",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let processedMessages = [...normalizedMessages];

    const latestUserMessage = processedMessages.at(-1);
    const previousAssistantMessage = processedMessages
      .slice(0, -1)
      .reverse()
      .find((msg) => msg.role === "assistant");

    const extractExistingComponentCode = (message?: UIMessage) => {
      if (!message) return null;
      const combinedText = message.parts
        .filter(
          (part): part is Extract<typeof part, { type: "text" }> =>
            part.type === "text" && !!part.text,
        )
        .map((part) => part.text || "")
        .join("\n\n");

      const codeMatch =
        combinedText.match(/```(?:jsx|tsx|js|ts)?\s*[\r\n]+([\s\S]*?)```/) ??
        combinedText.match(/~~~(?:jsx|tsx|js|ts)?\s*[\r\n]+([\s\S]*?)~~~/);

      return codeMatch?.[1]?.trim() || null;
    };

    if (
      latestUserMessage?.role === "user" &&
      previousAssistantMessage?.role === "assistant"
    ) {
      const existingComponentCode = extractExistingComponentCode(
        previousAssistantMessage,
      );

      if (existingComponentCode) {
        const instructionMarker =
          "Modify only the parts needed for the requested changes while keeping the rest intact.";

        const hasInstruction = latestUserMessage.parts?.some(
          (part) =>
            part.type === "text" &&
            part.text?.includes(instructionMarker) &&
            part.text.includes(existingComponentCode),
        );

        if (!hasInstruction) {
          const contextInstruction = [
            "",
            "Please update the existing component below instead of rebuilding it. Modify only the parts needed for the requested changes while keeping the rest intact.",
            "",
            "```jsx",
            existingComponentCode,
            "```",
          ].join("\n");

          let appended = false;
          const updatedParts =
            latestUserMessage.parts?.map((part) => {
              if (!appended && part.type === "text") {
                appended = true;
                const baseText = part.text ?? "";
                const separator =
                  baseText.endsWith("\n") || baseText === "" ? "" : "\n";
                return {
                  ...part,
                  text: `${baseText}${separator}${contextInstruction}`,
                };
              }
              return part;
            }) ?? [];

          if (!appended) {
            updatedParts.push({
              type: "text",
              text: contextInstruction.trimStart(),
            } as UIMessage["parts"][number]);
          }

          const updatedUserMessage: UIMessage = {
            ...latestUserMessage,
            parts: updatedParts,
          };

          processedMessages = [
            ...processedMessages.slice(0, -1),
            updatedUserMessage,
          ];
        }
      }
    }

    // Estimate token usage for limit checking
    const estimatedInputTokens =
      processedMessages.reduce((acc, msg) => {
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
      messages: convertToModelMessages(processedMessages),
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
