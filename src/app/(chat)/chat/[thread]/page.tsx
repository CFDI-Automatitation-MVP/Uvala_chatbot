import { selectThreadWithMessagesAction } from "@/app/api/chat/actions";
import ChatBot from "@/components/chat-bot";

import { ChatMessage, ChatThread } from "app-types/chat";
import { redirect, RedirectType } from "next/navigation";
import logger from "logger";

const fetchThread = async (
  threadId: string,
): Promise<(ChatThread & { messages: ChatMessage[] }) | null> => {
  try {
    logger.info("fetchThread called", { threadId });
    const result = await selectThreadWithMessagesAction(threadId);
    logger.info("fetchThread result", {
      threadId,
      success: !!result,
      hasMessages: result?.messages?.length ?? 0,
    });
    return result;
  } catch (error) {
    logger.error("fetchThread failed", { threadId, error: error?.toString() });
    return null;
  }
};

export default async function Page({
  params,
}: { params: Promise<{ thread: string }> }) {
  const { thread: threadId } = await params;

  logger.info("Chat page loading", { threadId });

  const thread = await fetchThread(threadId);

  if (!thread) {
    logger.warn("Thread not found, redirecting to home", { threadId });
    redirect("/", RedirectType.replace);
  }

  logger.info("Chat page loaded successfully", {
    threadId,
    messageCount: thread.messages.length,
  });

  return <ChatBot threadId={threadId} initialMessages={thread.messages} />;
}
