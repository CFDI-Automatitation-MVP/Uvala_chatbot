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
import { loadAppDefaultTools } from "@/app/api/chat/shared.chat";
import { safe } from "ts-safe";
import { AppDefaultToolkit } from "lib/ai/tools";

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
      `🔧 LEARN MODE - Resolved to actual model: GPT-OSS-120B (uvala-sensei) with high thinking effort`,
    );

    // ============= VISION PREPROCESSING (IMAGES ONLY) =============
    const lastMessage = messages[messages.length - 1];
    const fileParts = lastMessage.parts?.filter((p) => p.type === "file") || [];

    // Separate images from documents (PDFs, text files, etc.)
    const imageParts = fileParts.filter((p) =>
      p.mediaType?.startsWith("image/"),
    );
    const documentParts = fileParts.filter(
      (p) => !p.mediaType?.startsWith("image/"),
    );

    let visionTokensUsed = 0;
    let visionCost = 0;
    let preprocessedMessages = messages;

    // Process IMAGES with vision preprocessing (GPT-5 mini vision)
    if (imageParts.length > 0) {
      logger.info(`🔍 LEARN - Detected ${imageParts.length} image(s)`);

      const { contextString, analyses, totalTokens, totalCost } =
        await preprocessFileAttachments(imageParts);

      visionTokensUsed = totalTokens;
      visionCost = totalCost;

      logger.info(
        `📊 LEARN - Vision preprocessing: ${totalTokens} tokens, $${totalCost.toFixed(6)}`,
      );

      // Log each analysis summary
      analyses.forEach((analysis) => {
        logger.info(
          `  - 🖼️ ${analysis.filename}: ${analysis.tokensUsed} tokens (${analysis.processingTimeMs}ms)`,
        );
      });

      // Inject image analysis into the user's message
      const textContent = lastMessage.parts
        ?.filter((p) => p.type === "text")
        .map((p) => (p as any).text)
        .join("\n");

      // Create enhanced message with image context
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

      logger.info(`✅ LEARN - Image preprocessing complete`);
    }

    // DOCUMENTS: Will be accessed via file search tools (same as Chat Mode)
    // Remove document file parts from messages since Qwen doesn't support document attachments
    if (documentParts.length > 0) {
      logger.info(
        `📄 LEARN - Detected ${documentParts.length} document(s) - enabling file search tools`,
      );

      // Strip document file parts from the last message (keep only text and images)
      const lastMsg = preprocessedMessages[preprocessedMessages.length - 1];
      const filteredParts = lastMsg.parts?.filter(
        (p) => p.type !== "file" || (p as any).mediaType?.startsWith("image/"),
      );

      const cleanedMessage: UIMessage = {
        ...lastMsg,
        parts: filteredParts,
      };

      preprocessedMessages = [
        ...preprocessedMessages.slice(0, -1),
        cleanedMessage,
      ];

      logger.info(
        `🧹 LEARN - Removed document file parts from message (AI will access via tools)`,
      );
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

    // Create file tools using Chat Mode's proven pattern (with proper wrapping for Bedrock)
    // For Learn Mode, only load fileSearch and filesList (exclude UUID-based tools that confuse the AI)
    const fileTools =
      documentParts.length > 0
        ? safe()
            .map(() =>
              loadAppDefaultTools({
                mentions: [],
                allowedAppDefaultToolkit: [AppDefaultToolkit.FileSearch],
                userId: session.user.id,
                messages: preprocessedMessages,
                onlyFileSearch: true, // Learn Mode: only fileSearch and filesList
              }),
            )
            .orElse({})
        : {};

    // Enhance system prompt if documents are available
    let enhancedSystemPrompt = LEARN_SYSTEM;
    if (documentParts.length > 0) {
      enhancedSystemPrompt = `${LEARN_SYSTEM}

<document_access>
The student has uploaded document(s) for learning assistance. The documents have been processed and chunked into a searchable vector database.

**AVAILABLE TOOLS:**

1. **fileSearch** - Search document content (USE THIS TO READ THE DOCUMENT)
   - Input: { query: "what to search for", searchMode: "semantic" | "exact" }
   - Output: Array of results with "content" field containing REAL document text
   - Use searchMode: "semantic" for concepts, topics, themes
   - Use searchMode: "exact" for specific terms, quotes, section numbers
   - Example: fileSearch({ query: "introduction main topic", searchMode: "semantic" })

2. **filesList** - Get list of uploaded files (rarely needed)
   - Use when student asks "what files do I have?"

**HOW TO TEACH WITH DOCUMENTS:**

Step 1: Call fileSearch with relevant query
   - Student asks: "What is this document about?"
   - You call: fileSearch({ query: "introduction purpose overview", searchMode: "semantic" })

Step 2: Read the "content" field from results
   - Tool returns: [{ content: "This paper presents...", fileName: "doc.pdf", similarity: 95 }]
   - The "content" field contains ACTUAL text from the PDF - READ IT!

Step 3: Base your teaching on that REAL content
   - Quote specific parts from what you read
   - Use Socratic method to guide the student
   - Ask questions that help them discover insights

**CRITICAL RULES:**
✅ DO: Base ALL answers on content returned by fileSearch
✅ DO: Quote or reference specific parts you read
✅ DO: Call fileSearch multiple times with different queries if needed
❌ DON'T: Make up or hallucinate document content
❌ DON'T: Say the document isn't searchable (it IS via fileSearch)
❌ DON'T: Ignore the tool results

The documents ARE searchable and you CAN read them via fileSearch!
</document_access>`;

      logger.info(
        `📚 LEARN - File tools loaded via Chat Mode pattern: ${Object.keys(fileTools).join(", ")}`,
      );
    }

    // Create the streaming response with usage tracking
    const result = streamText({
      model,
      system: enhancedSystemPrompt,
      messages: convertToModelMessages(preprocessedMessages), // Use preprocessed messages
      experimental_transform: smoothStream({ chunking: "word" }),
      maxOutputTokens: 8000, // Qwen3-32B supports 32K context, 8K output for teaching
      tools: fileTools, // Enable file tools if documents present
      onFinish: async (completion) => {
        if (completion.usage) {
          logger.info(`🔍 LEARN - USAGE BREAKDOWN:`, {
            visionTokens: visionTokensUsed,
            visionCost: `$${visionCost.toFixed(6)}`,
            qwenInputTokens: completion.usage.inputTokens,
            qwenOutputTokens: completion.usage.outputTokens,
            qwenTotalTokens: completion.usage.totalTokens,
            combinedTotal:
              (completion.usage.totalTokens || 0) + visionTokensUsed,
          });

          // Count tool calls (file search tools)
          const toolCallsCount = completion.toolCalls?.length || 0;

          // Track usage (include vision tokens in total)
          await trackUsage({
            usage: {
              ...completion.usage,
              // Add vision tokens to input tokens for accurate tracking
              inputTokens:
                (completion.usage.inputTokens || 0) + visionTokensUsed,
              totalTokens:
                (completion.usage.totalTokens || 0) + visionTokensUsed,
            },
            userId: session.user.id,
            chatModel: chatModel || {
              provider: "Internal",
              model: "uvala-sensei",
            },
            toolCallsCount, // Track file search tool usage
          });

          logger.info(
            `✅ LEARN - Session completed for user ${session.user.id} (vision: ${visionTokensUsed} tokens, qwen: ${completion.usage.totalTokens} tokens, tool calls: ${toolCallsCount})`,
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
