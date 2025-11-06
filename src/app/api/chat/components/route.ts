import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/supabase-auth";
import {
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
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
// import { pexelsSearchTool } from "@/lib/ai/tools/image/pexels-search"; // Disabled for AI-only testing
import { generateImageComponentsTool } from "@/lib/ai/tools/image/generate-image-components";

const logger = globalLogger.withDefaults({
  message: colorize("magentaBright", `Components API: `),
});

/**
 * Replace fake replicate.delivery URLs with real ones from tool responses
 * This fixes the model's hallucination issue where it creates plausible-looking URLs
 * instead of using the actual URLs returned by the generateImage tool.
 */
function replaceFakeURLsWithReal(
  messageParts: any[],
  realUrls: string[],
): any[] {
  if (realUrls.length === 0) {
    return messageParts; // No real URLs to replace with
  }

  // Regex to match replicate.delivery URLs
  const replicateUrlRegex =
    /https:\/\/replicate\.delivery\/[a-zA-Z0-9]+\/[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+\.[a-z]+/g;

  return messageParts.map((part) => {
    if (part.type === "text" && typeof part.text === "string") {
      const originalText = part.text;
      let replacementCount = 0;

      // Find all replicate.delivery URLs in the text
      const urlsInText = originalText.match(replicateUrlRegex) || [];

      // Check which URLs are fake (not in realUrls list)
      const fakeUrls = urlsInText.filter((url) => !realUrls.includes(url));

      if (fakeUrls.length > 0) {
        logger.info(
          `🔧 COMPONENTS - URL Replacement: Found ${fakeUrls.length} fake URLs, ${realUrls.length} real URLs available`,
        );

        let modifiedText = originalText;

        // Replace ALL fake URLs with real ones (cycle through real URLs if needed)
        fakeUrls.forEach((fakeUrl, index) => {
          // Cycle through real URLs if we have more fake URLs than real ones
          const realUrl = realUrls[index % realUrls.length];
          // Replace ALL occurrences of this fake URL with the real one
          const regex = new RegExp(
            fakeUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g",
          );
          modifiedText = modifiedText.replace(regex, realUrl);
          replacementCount++;
          logger.info(
            `🔄 COMPONENTS - Replaced fake URL:\n  FROM: ${fakeUrl}\n  TO: ${realUrl}`,
          );
        });

        if (replacementCount > 0) {
          logger.info(
            `✅ COMPONENTS - Successfully replaced ${replacementCount} fake URL(s) with real ones`,
          );
        }

        return {
          ...part,
          text: modifiedText,
        };
      }
    }
    return part;
  });
}

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
      `🔧 COMPONENTS MODE - Resolved to actual model: gpt-oss-120b with medium reasoning (uvala-components)`,
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
    let toolCallsCount = 0; // Track tool usage for this session
    let imageGenerations = 0; // Track AI image generations
    const generatedImageUrls: string[] = []; // Store real URLs from generateImage tool

    // Create UI message stream for proper message handling
    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model,
          system: COMPONENTS_SYSTEM,
          messages: convertToModelMessages(messages),
          maxOutputTokens: 16000, // GPT-OSS 120B supports up to 16k tokens
          temperature: 0.4, // Low temperature for determinism with slight flexibility
          topP: 1.0, // Full vocabulary distribution
          stopWhen: stepCountIs(5), // CRITICAL: Enable multi-step execution (tool calls → automatic continuation → code generation) - AI SDK 5.0 syntax
          tools: {
            // searchStockImages: pexelsSearchTool, // Pexels stock photos (free) - DISABLED for testing
            generateImage: generateImageComponentsTool, // AI image generation (AI-only mode)
          },
          toolChoice: "auto", // Model uses AI generation for all images
          // AWS Bedrock-specific settings for GPT-OSS 120B (uvala-components)
          ...{
            additionalModelRequestFields: {
              reasoning_effort: "high", // High = deep reasoning for tool calling workflows
            },
          },
          onStepFinish: async ({ toolCalls, toolResults }) => {
            // Log tool usage for debugging
            if (toolCalls && toolCalls.length > 0) {
              toolCallsCount += toolCalls.length; // Track total tool calls

              // Count image generations
              toolCalls.forEach((call: any) => {
                if (call.toolName === "generateImage") {
                  imageGenerations++;
                }
              });

              logger.info(`🔧 COMPONENTS - Tool calls detected:`, {
                count: toolCalls.length,
                tools: toolCalls.map((call: any) => ({
                  name: call.toolName,
                  args: call.args,
                })),
              });
            }
            if (toolResults && toolResults.length > 0) {
              // Collect real image URLs from generateImage tool responses
              toolResults.forEach((result: any) => {
                if (
                  result.toolName === "generateImage" &&
                  result.output?.success === true &&
                  result.output?.imageUrl
                ) {
                  generatedImageUrls.push(result.output.imageUrl);
                  logger.info(
                    `📸 COMPONENTS - Captured real URL: ${result.output.imageUrl}`,
                  );
                }
              });

              // Log full result structure for debugging
              logger.info(`✅ COMPONENTS - Tool results received (RAW):`, {
                fullResults: JSON.stringify(toolResults, null, 2),
              });
              logger.info(`✅ COMPONENTS - Tool results (formatted):`, {
                count: toolResults.length,
                results: toolResults.map((result: any) => ({
                  name: result.toolName,
                  success: !result.output?.isError,
                  imageCount: result.output?.count || 0,
                  hasImages: !!result.output?.images,
                  firstImageUrl: result.output?.images?.[0]?.urls?.medium,
                  photographer: result.output?.images?.[0]?.photographer,
                })),
              });
            }
          },
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
        // POST-PROCESSING: Replace fake URLs with real ones from generateImage tool
        const correctedParts = replaceFakeURLsWithReal(
          responseMessage.parts,
          generatedImageUrls,
        );

        // Create corrected message
        const correctedMessage = {
          ...responseMessage,
          parts: correctedParts,
        };

        // Save user and assistant messages with corrected URLs
        if (responseMessage.id === lastUserMessage.id) {
          // Single message case
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...correctedMessage,
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
            role: correctedMessage.role,
            id: correctedMessage.id,
            parts: correctedMessage.parts,
            metadata,
          });
        }

        if (metadata.usage) {
          logger.info(`🔍 COMPONENTS - USAGE BREAKDOWN:`, {
            inputTokens: metadata.usage.inputTokens,
            outputTokens: metadata.usage.outputTokens,
            totalTokens: metadata.usage.totalTokens,
            toolCalls: toolCallsCount,
            imageGenerations: imageGenerations,
          });

          // Track usage (counts toward main limits)
          await trackUsage({
            usage: metadata.usage,
            userId: session.user.id,
            chatModel: metadata.chatModel,
            toolCallsCount, // Track total tool calls
            toolUsage: {
              imageGenerations, // Track AI image generations separately
            },
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
