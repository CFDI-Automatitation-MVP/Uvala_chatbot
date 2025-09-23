import { eq, desc, and, sql, gte, lte, sum } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import {
  ApiUsageSchema,
  UserDailyUsageSchema,
  UserMonthlyUsageSchema,
  ThreadUsageSchema,
  type ApiUsageEntity,
  type UserDailyUsageEntity,
  type UserMonthlyUsageEntity,
  type ThreadUsageEntity,
} from "../schema.pg";
import { TokenCost } from "@/lib/ai/cost-calculator";

export interface UsageRepository {
  // API Usage tracking
  recordApiUsage(
    usage: {
      userId: string;
      threadId?: string;
      messageId?: string;
      modelProvider: string;
      modelName: string;
      isPromptBuilder?: boolean;
    } & TokenCost,
  ): Promise<ApiUsageEntity>;

  getApiUsageByUser(userId: string, limit?: number): Promise<ApiUsageEntity[]>;
  getApiUsageByThread(threadId: string): Promise<ApiUsageEntity[]>;

  // Daily usage aggregation
  updateDailyUsage(
    userId: string,
    date: Date,
    usage: TokenCost,
    toolUsage?: {
      imageGenerations?: number;
      videoGenerations?: number;
      webSearches?: number;
    },
    promptBuilderUsage?: {
      promptBuilderTokens?: number;
      promptBuilderCost?: number;
    },
  ): Promise<UserDailyUsageEntity>;
  getUserDailyUsage(
    userId: string,
    date: Date,
  ): Promise<UserDailyUsageEntity | null>;
  getUserDailyUsageRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UserDailyUsageEntity[]>;

  // Monthly usage aggregation
  updateMonthlyUsage(
    userId: string,
    year: number,
    month: number,
    usage: TokenCost,
    toolUsage?: {
      imageGenerations?: number;
      videoGenerations?: number;
      webSearches?: number;
    },
    promptBuilderUsage?: {
      promptBuilderTokens?: number;
      promptBuilderCost?: number;
    },
  ): Promise<UserMonthlyUsageEntity>;
  getUserMonthlyUsage(
    userId: string,
    year: number,
    month: number,
  ): Promise<UserMonthlyUsageEntity | null>;
  getUserMonthlyUsageHistory(
    userId: string,
    limit?: number,
  ): Promise<UserMonthlyUsageEntity[]>;

  // Thread usage aggregation
  updateThreadUsage(
    threadId: string,
    userId: string,
    usage: TokenCost,
  ): Promise<ThreadUsageEntity>;
  getThreadUsage(threadId: string): Promise<ThreadUsageEntity | null>;
  getUserThreadUsage(
    userId: string,
    limit?: number,
  ): Promise<ThreadUsageEntity[]>;

  // Analytics and reporting
  getUserTotalUsage(userId: string): Promise<{
    totalTokens: number;
    totalCost: number;
    apiCalls: number;
    toolCalls: number;
  }>;

  getSystemUsageStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalUsers: number;
    totalTokens: number;
    totalCost: number;
    totalApiCalls: number;
    totalToolCalls: number;
    avgCostPerUser: number;
    avgTokensPerUser: number;
  }>;

  // Legacy Pro user limit checking - DEPRECATED - Use checkUserLimits from subscription-limits.ts instead
  checkProLimits(
    userId: string,
    plannedUsage?: {
      llmCostUsd?: number;
      imageGenerations?: number;
      videoGenerations?: number;
      webSearches?: number;
    },
  ): Promise<{
    canProceed: boolean;
    limits: {
      dailyCostExceeded: boolean;
      monthlyCostExceeded: boolean;
      imageGenerationsExceeded: boolean;
      videoGenerationsExceeded: boolean;
      webSearchesExceeded: boolean;
    };
    current: {
      dailyCost: number;
      monthlyCost: number;
      imageGenerations: number;
      videoGenerations: number;
      webSearches: number;
    };
    remaining: {
      dailyCost: number;
      monthlyCost: number;
      imageGenerations: number;
      videoGenerations: number;
      webSearches: number;
    };
  }>;
}

export const pgUsageRepository: UsageRepository = {
  async recordApiUsage(usage): Promise<ApiUsageEntity> {
    const [result] = await db
      .insert(ApiUsageSchema)
      .values({
        userId: usage.userId,
        threadId: usage.threadId || null,
        messageId: usage.messageId || null,
        modelProvider: usage.modelProvider,
        modelName: usage.modelName,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        reasoningTokens: usage.reasoningTokens,
        totalTokens: usage.totalTokens,
        inputCostUsd: usage.inputCostUsd.toString(),
        outputCostUsd: usage.outputCostUsd.toString(),
        cachedInputCostUsd: usage.cachedInputCostUsd.toString(),
        reasoningCostUsd: usage.reasoningCostUsd.toString(),
        totalCostUsd: usage.totalCostUsd.toString(),
        toolCallsCount: usage.toolCallsCount,
        toolCallsCostUsd: usage.toolCallsCostUsd.toString(),
        isPromptBuilder: usage.isPromptBuilder || false,
      })
      .returning();

    return result;
  },

  async getApiUsageByUser(
    userId: string,
    limit = 100,
  ): Promise<ApiUsageEntity[]> {
    return await db
      .select()
      .from(ApiUsageSchema)
      .where(eq(ApiUsageSchema.userId, userId))
      .orderBy(desc(ApiUsageSchema.createdAt))
      .limit(limit);
  },

  async getApiUsageByThread(threadId: string): Promise<ApiUsageEntity[]> {
    return await db
      .select()
      .from(ApiUsageSchema)
      .where(eq(ApiUsageSchema.threadId, threadId))
      .orderBy(desc(ApiUsageSchema.createdAt));
  },

  async updateDailyUsage(
    userId: string,
    date: Date,
    usage: TokenCost,
    toolUsage?: {
      imageGenerations?: number;
      videoGenerations?: number;
      webSearches?: number;
    },
    promptBuilderUsage?: {
      promptBuilderTokens?: number;
      promptBuilderCost?: number;
    },
  ): Promise<UserDailyUsageEntity> {
    const usageDate = date.toISOString().split("T")[0]; // YYYY-MM-DD format

    const [result] = await db
      .insert(UserDailyUsageSchema)
      .values({
        userId,
        usageDate,
        totalTokens: usage.totalTokens,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        reasoningTokens: usage.reasoningTokens,
        totalCostUsd: usage.totalCostUsd.toString(),
        apiCallsCount: 1,
        toolCallsCount: usage.toolCallsCount,
        toolCallsCostUsd: usage.toolCallsCostUsd.toString(),
        imageGenerationsCount: toolUsage?.imageGenerations || 0,
        videoGenerationsCount: toolUsage?.videoGenerations || 0,
        webSearchesCount: toolUsage?.webSearches || 0,
        promptBuilderTokensUsed: promptBuilderUsage?.promptBuilderTokens || 0,
        promptBuilderCostUsd: (
          promptBuilderUsage?.promptBuilderCost || 0
        ).toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [UserDailyUsageSchema.userId, UserDailyUsageSchema.usageDate],
        set: {
          totalTokens: sql`${UserDailyUsageSchema.totalTokens} + ${usage.totalTokens}`,
          inputTokens: sql`${UserDailyUsageSchema.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${UserDailyUsageSchema.outputTokens} + ${usage.outputTokens}`,
          cachedInputTokens: sql`${UserDailyUsageSchema.cachedInputTokens} + ${usage.cachedInputTokens}`,
          reasoningTokens: sql`${UserDailyUsageSchema.reasoningTokens} + ${usage.reasoningTokens}`,
          totalCostUsd: sql`${UserDailyUsageSchema.totalCostUsd} + ${usage.totalCostUsd}`,
          apiCallsCount: sql`${UserDailyUsageSchema.apiCallsCount} + 1`,
          toolCallsCount: sql`${UserDailyUsageSchema.toolCallsCount} + ${usage.toolCallsCount}`,
          toolCallsCostUsd: sql`${UserDailyUsageSchema.toolCallsCostUsd} + ${usage.toolCallsCostUsd}`,
          imageGenerationsCount: sql`${UserDailyUsageSchema.imageGenerationsCount} + ${toolUsage?.imageGenerations || 0}`,
          videoGenerationsCount: sql`${UserDailyUsageSchema.videoGenerationsCount} + ${toolUsage?.videoGenerations || 0}`,
          webSearchesCount: sql`${UserDailyUsageSchema.webSearchesCount} + ${toolUsage?.webSearches || 0}`,
          promptBuilderTokensUsed: sql`${UserDailyUsageSchema.promptBuilderTokensUsed} + ${promptBuilderUsage?.promptBuilderTokens || 0}`,
          promptBuilderCostUsd: sql`${UserDailyUsageSchema.promptBuilderCostUsd} + ${promptBuilderUsage?.promptBuilderCost || 0}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async getUserDailyUsage(
    userId: string,
    date: Date,
  ): Promise<UserDailyUsageEntity | null> {
    const usageDate = date.toISOString().split("T")[0];

    const [result] = await db
      .select()
      .from(UserDailyUsageSchema)
      .where(
        and(
          eq(UserDailyUsageSchema.userId, userId),
          eq(UserDailyUsageSchema.usageDate, usageDate),
        ),
      );

    return result || null;
  },

  async getUserDailyUsageRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UserDailyUsageEntity[]> {
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    return await db
      .select()
      .from(UserDailyUsageSchema)
      .where(
        and(
          eq(UserDailyUsageSchema.userId, userId),
          gte(UserDailyUsageSchema.usageDate, startDateStr),
          lte(UserDailyUsageSchema.usageDate, endDateStr),
        ),
      )
      .orderBy(desc(UserDailyUsageSchema.usageDate));
  },

  async updateMonthlyUsage(
    userId: string,
    year: number,
    month: number,
    usage: TokenCost,
    toolUsage?: {
      imageGenerations?: number;
      videoGenerations?: number;
      webSearches?: number;
    },
    promptBuilderUsage?: {
      promptBuilderTokens?: number;
      promptBuilderCost?: number;
    },
  ): Promise<UserMonthlyUsageEntity> {
    const [result] = await db
      .insert(UserMonthlyUsageSchema)
      .values({
        userId,
        usageYear: year,
        usageMonth: month,
        totalTokens: usage.totalTokens,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        reasoningTokens: usage.reasoningTokens,
        totalCostUsd: usage.totalCostUsd.toString(),
        apiCallsCount: 1,
        toolCallsCount: usage.toolCallsCount,
        toolCallsCostUsd: usage.toolCallsCostUsd.toString(),
        imageGenerationsCount: toolUsage?.imageGenerations || 0,
        videoGenerationsCount: toolUsage?.videoGenerations || 0,
        webSearchesCount: toolUsage?.webSearches || 0,
        promptBuilderTokensUsed: promptBuilderUsage?.promptBuilderTokens || 0,
        promptBuilderCostUsd: (
          promptBuilderUsage?.promptBuilderCost || 0
        ).toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          UserMonthlyUsageSchema.userId,
          UserMonthlyUsageSchema.usageMonth,
          UserMonthlyUsageSchema.usageYear,
        ],
        set: {
          totalTokens: sql`${UserMonthlyUsageSchema.totalTokens} + ${usage.totalTokens}`,
          inputTokens: sql`${UserMonthlyUsageSchema.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${UserMonthlyUsageSchema.outputTokens} + ${usage.outputTokens}`,
          cachedInputTokens: sql`${UserMonthlyUsageSchema.cachedInputTokens} + ${usage.cachedInputTokens}`,
          reasoningTokens: sql`${UserMonthlyUsageSchema.reasoningTokens} + ${usage.reasoningTokens}`,
          totalCostUsd: sql`${UserMonthlyUsageSchema.totalCostUsd} + ${usage.totalCostUsd}`,
          apiCallsCount: sql`${UserMonthlyUsageSchema.apiCallsCount} + 1`,
          toolCallsCount: sql`${UserMonthlyUsageSchema.toolCallsCount} + ${usage.toolCallsCount}`,
          toolCallsCostUsd: sql`${UserMonthlyUsageSchema.toolCallsCostUsd} + ${usage.toolCallsCostUsd}`,
          imageGenerationsCount: sql`${UserMonthlyUsageSchema.imageGenerationsCount} + ${toolUsage?.imageGenerations || 0}`,
          videoGenerationsCount: sql`${UserMonthlyUsageSchema.videoGenerationsCount} + ${toolUsage?.videoGenerations || 0}`,
          webSearchesCount: sql`${UserMonthlyUsageSchema.webSearchesCount} + ${toolUsage?.webSearches || 0}`,
          promptBuilderTokensUsed: sql`${UserMonthlyUsageSchema.promptBuilderTokensUsed} + ${promptBuilderUsage?.promptBuilderTokens || 0}`,
          promptBuilderCostUsd: sql`${UserMonthlyUsageSchema.promptBuilderCostUsd} + ${promptBuilderUsage?.promptBuilderTokens ? usage.totalCostUsd : 0}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async getUserMonthlyUsage(
    userId: string,
    year: number,
    month: number,
  ): Promise<UserMonthlyUsageEntity | null> {
    const [result] = await db
      .select()
      .from(UserMonthlyUsageSchema)
      .where(
        and(
          eq(UserMonthlyUsageSchema.userId, userId),
          eq(UserMonthlyUsageSchema.usageYear, year),
          eq(UserMonthlyUsageSchema.usageMonth, month),
        ),
      );

    return result || null;
  },

  async getUserMonthlyUsageHistory(
    userId: string,
    limit = 12,
  ): Promise<UserMonthlyUsageEntity[]> {
    return await db
      .select()
      .from(UserMonthlyUsageSchema)
      .where(eq(UserMonthlyUsageSchema.userId, userId))
      .orderBy(
        desc(UserMonthlyUsageSchema.usageYear),
        desc(UserMonthlyUsageSchema.usageMonth),
      )
      .limit(limit);
  },

  async updateThreadUsage(
    threadId: string,
    userId: string,
    usage: TokenCost,
  ): Promise<ThreadUsageEntity> {
    const [result] = await db
      .insert(ThreadUsageSchema)
      .values({
        threadId,
        userId,
        totalTokens: usage.totalTokens,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        reasoningTokens: usage.reasoningTokens,
        totalCostUsd: usage.totalCostUsd.toString(),
        apiCallsCount: 1,
        toolCallsCount: usage.toolCallsCount,
        toolCallsCostUsd: usage.toolCallsCostUsd.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [ThreadUsageSchema.threadId],
        set: {
          totalTokens: sql`${ThreadUsageSchema.totalTokens} + ${usage.totalTokens}`,
          inputTokens: sql`${ThreadUsageSchema.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${ThreadUsageSchema.outputTokens} + ${usage.outputTokens}`,
          cachedInputTokens: sql`${ThreadUsageSchema.cachedInputTokens} + ${usage.cachedInputTokens}`,
          reasoningTokens: sql`${ThreadUsageSchema.reasoningTokens} + ${usage.reasoningTokens}`,
          totalCostUsd: sql`${ThreadUsageSchema.totalCostUsd} + ${usage.totalCostUsd}`,
          apiCallsCount: sql`${ThreadUsageSchema.apiCallsCount} + 1`,
          toolCallsCount: sql`${ThreadUsageSchema.toolCallsCount} + ${usage.toolCallsCount}`,
          toolCallsCostUsd: sql`${ThreadUsageSchema.toolCallsCostUsd} + ${usage.toolCallsCostUsd}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async getThreadUsage(threadId: string): Promise<ThreadUsageEntity | null> {
    const [result] = await db
      .select()
      .from(ThreadUsageSchema)
      .where(eq(ThreadUsageSchema.threadId, threadId));

    return result || null;
  },

  async getUserThreadUsage(
    userId: string,
    limit = 50,
  ): Promise<ThreadUsageEntity[]> {
    return await db
      .select()
      .from(ThreadUsageSchema)
      .where(eq(ThreadUsageSchema.userId, userId))
      .orderBy(desc(ThreadUsageSchema.updatedAt))
      .limit(limit);
  },

  async getUserTotalUsage(userId: string) {
    const result = await db
      .select({
        totalTokens: sum(UserDailyUsageSchema.totalTokens),
        totalCost: sum(UserDailyUsageSchema.totalCostUsd),
        apiCalls: sum(UserDailyUsageSchema.apiCallsCount),
        toolCalls: sum(UserDailyUsageSchema.toolCallsCount),
      })
      .from(UserDailyUsageSchema)
      .where(eq(UserDailyUsageSchema.userId, userId));

    const stats = result[0];
    return {
      totalTokens: Number(stats.totalTokens || 0),
      totalCost: Number(stats.totalCost || 0),
      apiCalls: Number(stats.apiCalls || 0),
      toolCalls: Number(stats.toolCalls || 0),
    };
  },

  async getSystemUsageStats(startDate?: Date, endDate?: Date) {
    const baseQuery = db
      .select({
        totalTokens: sum(UserDailyUsageSchema.totalTokens),
        totalCost: sum(UserDailyUsageSchema.totalCostUsd),
        totalApiCalls: sum(UserDailyUsageSchema.apiCallsCount),
        totalToolCalls: sum(UserDailyUsageSchema.toolCallsCount),
        totalUsers: sql<number>`COUNT(DISTINCT ${UserDailyUsageSchema.userId})`,
      })
      .from(UserDailyUsageSchema);

    const result =
      startDate && endDate
        ? await baseQuery.where(
            and(
              gte(
                UserDailyUsageSchema.usageDate,
                startDate.toISOString().split("T")[0],
              ),
              lte(
                UserDailyUsageSchema.usageDate,
                endDate.toISOString().split("T")[0],
              ),
            ),
          )
        : await baseQuery;
    const stats = result[0];

    const totalUsers = Number(stats.totalUsers || 0);
    const totalTokens = Number(stats.totalTokens || 0);
    const totalCost = Number(stats.totalCost || 0);
    const totalApiCalls = Number(stats.totalApiCalls || 0);
    const totalToolCalls = Number(stats.totalToolCalls || 0);

    return {
      totalUsers,
      totalTokens,
      totalCost,
      totalApiCalls,
      totalToolCalls,
      avgCostPerUser: totalUsers > 0 ? totalCost / totalUsers : 0,
      avgTokensPerUser: totalUsers > 0 ? totalTokens / totalUsers : 0,
    };
  },

  // DEPRECATED - Legacy Pro user limit checking function
  // Use checkUserLimits from subscription-limits.ts instead for proper plan-aware limits
  async checkProLimits(
    userId: string,
    plannedUsage?: {
      llmCostUsd?: number;
      imageGenerations?: number;
      videoGenerations?: number;
      webSearches?: number;
    },
  ) {
    // This function is deprecated - it uses hardcoded "plus" plan limits
    // For proper plan-aware checking, use checkUserLimits from subscription-limits.ts
    console.warn(
      "checkProLimits is deprecated. Use checkUserLimits from subscription-limits.ts instead",
    );

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Get current daily and monthly usage
    const dailyUsage = await this.getUserDailyUsage(userId, today);
    const monthlyUsage = await this.getUserMonthlyUsage(
      userId,
      currentYear,
      currentMonth,
    );

    const currentDailyCost = parseFloat(dailyUsage?.totalCostUsd || "0");
    const currentMonthlyCost = parseFloat(monthlyUsage?.totalCostUsd || "0");

    // Use PLUS plan limits as this was originally "Pro" but is now "Plus"
    const PLUS_DAILY_COST_LIMIT = 0.05;
    const PLUS_MONTHLY_COST_LIMIT = 1.5;
    const PLUS_IMAGE_LIMIT = 15;
    const PLUS_VIDEO_LIMIT = 2;
    const PLUS_SEARCH_LIMIT = 80;

    // Check LLM cost limits
    const wouldExceedDailyLimit =
      currentDailyCost + (plannedUsage?.llmCostUsd || 0) >
      PLUS_DAILY_COST_LIMIT;
    const wouldExceedMonthlyLimit =
      currentMonthlyCost + (plannedUsage?.llmCostUsd || 0) >
      PLUS_MONTHLY_COST_LIMIT;

    // Check tool limits (monthly)
    const currentImages = monthlyUsage?.imageGenerationsCount || 0;
    const currentVideos = monthlyUsage?.videoGenerationsCount || 0;
    const currentSearches = monthlyUsage?.webSearchesCount || 0;

    const wouldExceedImageLimit =
      currentImages + (plannedUsage?.imageGenerations || 0) > PLUS_IMAGE_LIMIT;
    const wouldExceedVideoLimit =
      currentVideos + (plannedUsage?.videoGenerations || 0) > PLUS_VIDEO_LIMIT;
    const wouldExceedSearchLimit =
      currentSearches + (plannedUsage?.webSearches || 0) > PLUS_SEARCH_LIMIT;

    return {
      canProceed:
        !wouldExceedDailyLimit &&
        !wouldExceedMonthlyLimit &&
        !wouldExceedImageLimit &&
        !wouldExceedVideoLimit &&
        !wouldExceedSearchLimit,
      limits: {
        dailyCostExceeded: wouldExceedDailyLimit,
        monthlyCostExceeded: wouldExceedMonthlyLimit,
        imageGenerationsExceeded: wouldExceedImageLimit,
        videoGenerationsExceeded: wouldExceedVideoLimit,
        webSearchesExceeded: wouldExceedSearchLimit,
      },
      current: {
        dailyCost: currentDailyCost,
        monthlyCost: currentMonthlyCost,
        imageGenerations: currentImages,
        videoGenerations: currentVideos,
        webSearches: currentSearches,
      },
      remaining: {
        dailyCost: Math.max(0, PLUS_DAILY_COST_LIMIT - currentDailyCost),
        monthlyCost: Math.max(0, PLUS_MONTHLY_COST_LIMIT - currentMonthlyCost),
        imageGenerations: Math.max(0, PLUS_IMAGE_LIMIT - currentImages),
        videoGenerations: Math.max(0, PLUS_VIDEO_LIMIT - currentVideos),
        webSearches: Math.max(0, PLUS_SEARCH_LIMIT - currentSearches),
      },
    };
  },
};
