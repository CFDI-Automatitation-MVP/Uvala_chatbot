"use server";

import {
  generateObject,
  generateText,
  LanguageModel,
  type UIMessage,
} from "ai";

import {
  CREATE_THREAD_TITLE_PROMPT,
} from "lib/ai/prompts";

import type { ChatModel, ChatThread } from "app-types/chat";

import {
  agentRepository,
  chatRepository,
} from "lib/db/repository";
import { customModelProvider } from "lib/ai/models";
import { toAny } from "lib/utils";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { getSession } from "@/lib/auth/supabase-auth";
import logger from "logger";

import { JSONSchema7 } from "json-schema";
import { ObjectJsonSchema7 } from "app-types/util";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { Agent } from "app-types/agent";

export async function getUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function generateTitleFromUserMessageAction({
  message,
  model,
}: { message: UIMessage; model: LanguageModel }) {
  await getSession();
  const prompt = toAny(message.parts?.at(-1))?.text || "unknown";

  const { text: title } = await generateText({
    model,
    system: CREATE_THREAD_TITLE_PROMPT,
    prompt,
  });

  return title.trim();
}

export async function selectThreadWithMessagesAction(threadId: string) {
  const session = await getSession();
  const thread = await chatRepository.selectThread(threadId);

  if (!thread) {
    logger.error("Thread not found", threadId);
    return null;
  }
  if (thread.userId !== session?.user?.id) {
    return null;
  }
  const messages = await chatRepository.selectMessagesByThreadId(threadId);
  return { ...thread, messages: messages ?? [] };
}

export async function deleteMessageAction(messageId: string) {
  await chatRepository.deleteChatMessage(messageId);
}

export async function deleteThreadAction(threadId: string) {
  await chatRepository.deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  "use server";
  await chatRepository.deleteMessagesByChatIdAfterTimestamp(messageId);
}

export async function updateThreadAction(
  id: string,
  thread: Partial<Omit<ChatThread, "createdAt" | "updatedAt" | "userId">>,
) {
  const userId = await getUserId();
  await chatRepository.updateThread(id, { ...thread, userId });
}

export async function deleteThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteAllThreads(userId);
}

export async function deleteUnarchivedThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteUnarchivedThreads(userId);
}



export async function generateObjectAction({
  model,
  prompt,
  schema,
}: {
  model?: ChatModel;
  prompt: {
    system?: string;
    user?: string;
  };
  schema: JSONSchema7 | ObjectJsonSchema7;
}) {
  const result = await generateObject({
    model: customModelProvider.getModel(model),
    system: prompt.system,
    prompt: prompt.user || "",
    schema: jsonSchemaToZod(schema),
  });
  return result.object;
}

export async function rememberAgentAction(
  agent: string | undefined,
  userId: string,
) {
  if (!agent) return undefined;
  const key = CacheKeys.agentInstructions(agent);
  let cachedAgent = await serverCache.get<Agent | null>(key);
  if (!cachedAgent) {
    cachedAgent = await agentRepository.selectAgentById(agent, userId);
    await serverCache.set(key, cachedAgent);
  }
  return cachedAgent as Agent | undefined;
}
