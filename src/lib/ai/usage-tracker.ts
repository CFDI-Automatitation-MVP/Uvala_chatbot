import "server-only";
import { LanguageModelUsage } from "ai";
import { ChatModel } from "app-types/chat";
import { calculateTokenCost } from "./cost-calculator";
import { usageRepository } from "../db/repository";
import logger from "logger";

/**
 * Track usage for a chat completion
 */
export async function trackUsage({
  usage,
  userId,
  threadId,
  messageId,
  chatModel,
  toolCallsCount = 0,
  toolUsage,
}: {
  usage: LanguageModelUsage;
  userId: string;
  threadId?: string;
  messageId?: string;
  chatModel: ChatModel;
  toolCallsCount?: number;
  toolUsage?: {
    imageGenerations?: number;
    videoGenerations?: number;
    webSearches?: number;
  };
}) {
  try {
    // Calculate cost based on model and usage
    const modelId = `${chatModel.provider}/${chatModel.model}`;
    const cost = calculateTokenCost(usage, modelId, toolCallsCount);

    // Record detailed API usage
    await usageRepository.recordApiUsage({
      userId,
      threadId,
      messageId,
      modelProvider: chatModel.provider,
      modelName: chatModel.model,
      ...cost,
    });

    // Update aggregated usage data
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Update daily usage
    await usageRepository.updateDailyUsage(userId, now, cost, toolUsage);

    // Update monthly usage
    await usageRepository.updateMonthlyUsage(
      userId,
      year,
      month,
      cost,
      toolUsage,
    );

    // Update thread usage if threadId is provided
    if (threadId) {
      await usageRepository.updateThreadUsage(threadId, userId, cost);
    }

    logger.info(`Usage tracked for user ${userId}:`, {
      modelId,
      totalTokens: cost.totalTokens,
      totalCostUsd: cost.totalCostUsd,
      threadId,
      messageId,
    });

    return cost;
  } catch (error) {
    logger.error("Failed to track usage:", error);
    // Don't throw the error to avoid breaking the chat functionality
    return null;
  }
}

/**
 * Get usage summary for a user
 */
export async function getUserUsageSummary(userId: string) {
  try {
    const totalUsage = await usageRepository.getUserTotalUsage(userId);
    const monthlyHistory = await usageRepository.getUserMonthlyUsageHistory(
      userId,
      6,
    );
    const recentThreads = await usageRepository.getUserThreadUsage(userId, 10);

    return {
      total: totalUsage,
      monthlyHistory,
      recentThreads,
    };
  } catch (error) {
    logger.error("Failed to get user usage summary:", error);
    throw error;
  }
}

/**
 * Get usage for a specific thread
 */
export async function getThreadUsageSummary(threadId: string) {
  try {
    const threadUsage = await usageRepository.getThreadUsage(threadId);
    const apiUsage = await usageRepository.getApiUsageByThread(threadId);

    return {
      summary: threadUsage,
      details: apiUsage,
    };
  } catch (error) {
    logger.error("Failed to get thread usage summary:", error);
    throw error;
  }
}

/**
 * Get system-wide usage statistics
 */
export async function getSystemUsageStats(startDate?: Date, endDate?: Date) {
  try {
    return await usageRepository.getSystemUsageStats(startDate, endDate);
  } catch (error) {
    logger.error("Failed to get system usage stats:", error);
    throw error;
  }
}

/**
 * Track usage for prompt builder specifically
 */
export async function trackPromptBuilderUsage({
  usage,
  userId,
  chatModel,
}: {
  usage: LanguageModelUsage;
  userId: string;
  chatModel: ChatModel;
}) {
  try {
    // Calculate cost based on model and usage (nano model)
    const modelId = `${chatModel.provider}/${chatModel.model}`;
    const cost = calculateTokenCost(usage, modelId, 0);

    // Record detailed API usage with prompt builder flag
    await usageRepository.recordApiUsage({
      userId,
      threadId: undefined, // Prompt builder doesn't have threads
      messageId: undefined,
      modelProvider: chatModel.provider,
      modelName: chatModel.model,
      isPromptBuilder: true,
      ...cost,
    });

    // Update aggregated usage data
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Update daily usage with prompt builder specific tracking
    await usageRepository.updateDailyUsage(userId, now, cost, undefined, {
      promptBuilderTokens: cost.totalTokens,
    });

    // Update monthly usage with prompt builder specific tracking
    await usageRepository.updateMonthlyUsage(
      userId,
      year,
      month,
      cost,
      undefined,
      {
        promptBuilderTokens: cost.totalTokens,
      },
    );

    logger.info(`Prompt builder usage tracked for user ${userId}:`, {
      modelId,
      totalTokens: cost.totalTokens,
      totalCostUsd: cost.totalCostUsd,
    });

    return cost;
  } catch (error) {
    logger.error("Failed to track prompt builder usage:", error);
    return null;
  }
}

/**
 * Check if user is approaching usage limits (can be expanded for quota management)
 */
export async function checkUsageLimits(userId: string): Promise<{
  withinLimits: boolean;
  monthlyUsage: number;
  monthlyCost: number;
  warnings: string[];
}> {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthlyUsage = await usageRepository.getUserMonthlyUsage(
      userId,
      currentYear,
      currentMonth,
    );

    const monthlyTokens = monthlyUsage?.totalTokens || 0;
    const monthlyCostUsd = Number(monthlyUsage?.totalCostUsd || 0);

    const warnings: string[] = [];

    // Example limits (can be made configurable per user)
    const TOKEN_LIMIT = 1_000_000; // 1M tokens per month
    const COST_LIMIT = 100; // $100 per month

    if (monthlyTokens > TOKEN_LIMIT * 0.8) {
      warnings.push(
        `You've used ${monthlyTokens.toLocaleString()} tokens this month (${Math.round((monthlyTokens / TOKEN_LIMIT) * 100)}% of monthly limit)`,
      );
    }

    if (monthlyCostUsd > COST_LIMIT * 0.8) {
      warnings.push(
        `You've spent $${monthlyCostUsd.toFixed(2)} this month (${Math.round((monthlyCostUsd / COST_LIMIT) * 100)}% of monthly limit)`,
      );
    }

    const withinLimits =
      monthlyTokens <= TOKEN_LIMIT && monthlyCostUsd <= COST_LIMIT;

    return {
      withinLimits,
      monthlyUsage: monthlyTokens,
      monthlyCost: monthlyCostUsd,
      warnings,
    };
  } catch (error) {
    logger.error("Failed to check usage limits:", error);
    return {
      withinLimits: true,
      monthlyUsage: 0,
      monthlyCost: 0,
      warnings: [],
    };
  }
}
