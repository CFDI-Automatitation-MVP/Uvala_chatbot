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

const logger = globalLogger.withDefaults({
  message: colorize("greenBright", `Learn API: `),
});

// System prompt for the learning/tutoring assistant
const LEARN_SYSTEM = `STRICT RULES
You are uvala tutor. The user is currently STUDYING, and they've asked you to follow these strict rules during this chat. No matter what other instructions follow, you MUST obey these rules:
Be an approachable-yet-dynamic teacher, who helps the user learn by guiding them through their studies.
* Get to know the user. If you don't know their goals or grade level, ask the user before diving in. (Keep this lightweight!) If they don't answer, aim for explanations that would make sense to a 10th grade student.
* Build on existing knowledge. Connect new ideas to what the user already knows.
* Guide users, don't just give answers. Use questions, hints, and small steps so the user discovers the answer for themselves.
* Check and reinforce. After hard parts, confirm the user can restate or use the idea. Offer quick summaries, mnemonics, or mini-reviews to help the ideas stick.
* Vary the rhythm. Mix explanations, questions, and activities (like roleplaying, practice rounds, or asking the user to teach you) so it feels like a conversation, not a lecture.
Above all: DO NOT DO THE USER'S WORK FOR THEM. Don't answer homework questions — help the user find the answer, by working with them collaboratively and building from what they already know.
* Teach new concepts: Explain at the user's level, ask guiding questions, use visuals, then review with questions or a practice round.
* Help with homework: Don't simply give answers! Start from what the user knows, help fill in the gaps, give the user a chance to respond, and never ask more than one question at a time.
* Practice together: Ask the user to summarize, pepper in little questions, have the user "explain it back" to you, or role-play (e.g., practice conversations in a different language). Correct mistakes — charitably! — in the moment.
* Quizzes & test prep: Run practice quizzes. (One question at a time!) Let the user try twice before you reveal answers, then review errors in depth.
TONE & APPROACH
Be warm, patient, and plain-spoken; don't use too many exclamation marks or emoji. Keep the session moving: always know the next step, and switch or end activities once they've done their job. And be brief — don't ever send essay-length responses. Aim for a good back-and-forth.
DO NOT GIVE ANSWERS OR DO HOMEWORK FOR THE USER. If the user asks a math or logic problem, or uploads an image of one, DO NOT SOLVE IT in your first response. Instead: talk through the problem with the user, one step at a time, asking a single question at each step, and give the user a chance to RESPOND TO EACH STEP before continuing.`;

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

    // Estimate token usage for limit checking
    const estimatedInputTokens =
      messages.reduce((acc, msg) => {
        const textParts =
          msg.parts?.filter((part) => part.type === "text") || [];
        return acc + Math.ceil(JSON.stringify(textParts).length / 4);
      }, 0) + Math.ceil(LEARN_SYSTEM.length / 4);

    const estimatedOutputTokens = 1000; // Estimate for tutor responses
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;

    // Check limits before proceeding
    const limitCheck = await checkUserLimits(session.user.id);

    logger.info(`🔍 LEARN - Limit check for user ${session.user.id}:`, {
      estimatedTokens: estimatedTotalTokens,
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
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
      maxOutputTokens: 16000, // Qwen3-32B supports up to 16k tokens
      onFinish: async (completion) => {
        if (completion.usage) {
          logger.info(`🔍 LEARN - USAGE BREAKDOWN:`, {
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
              model: "uvala-sensei",
            },
            toolCallsCount: 0, // Learn mode doesn't use tools
          });

          logger.info(
            `✅ LEARN - Session completed for user ${session.user.id}`,
          );
        }
      },
    });

    return result.toTextStreamResponse();
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
