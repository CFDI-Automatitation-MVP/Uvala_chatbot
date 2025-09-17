import { pgUsageRepository } from "@/lib/db/pg/repositories/usage-repository.pg";
import { subscriptionRepository } from "@/lib/db/repository";
import { estimateMessageCost } from "@/lib/cost-calculator";
import { PLAN_LIMITS, PlanType, PlanLimits } from "@/lib/subscription";

export interface LimitCheckResult {
  canProceed: boolean;
  limitExceeded?: string;
  usage?: {
    current: {
      dailyCost: number;
      monthlyCost: number;
      dailyTokens: number;
      imageGenerations: number;
      videoGenerations: number;
      webSearches: number;
    };
    remaining: {
      dailyCost: number;
      monthlyCost: number;
      dailyTokens: number;
      imageGenerations: number;
      videoGenerations: number;
      webSearches: number;
    };
  };
}

export interface PendingUsage {
  inputTokens?: number;
  outputTokens?: number;
  imageGenerations?: number;
  videoGenerations?: number;
  webSearches?: number;
}

/**
 * Get subscription limits from database
 */
async function getSubscriptionLimitsFromDb(
  planType: PlanType,
): Promise<PlanLimits | null> {
  try {
    // Use the PLAN_LIMITS from code for now since it matches the database
    // and we have type safety. The database values are kept in sync via migrations.
    return PLAN_LIMITS[planType];
  } catch (error) {
    console.error("Error getting subscription limits:", error);
    return null;
  }
}

/**
 * Check user limits against their specific plan limits
 */
async function checkUserPlanLimits(
  userId: string,
  planLimits: PlanLimits,
  plannedUsage?: {
    llmCostUsd?: number;
    inputTokens?: number;
    outputTokens?: number;
    imageGenerations?: number;
    videoGenerations?: number;
    webSearches?: number;
  },
) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Get current daily and monthly usage
  const dailyUsage = await pgUsageRepository.getUserDailyUsage(userId, today);
  const monthlyUsage = await pgUsageRepository.getUserMonthlyUsage(
    userId,
    currentYear,
    currentMonth,
  );

  const currentDailyCost = parseFloat(dailyUsage?.totalCostUsd || "0");
  const currentMonthlyCost = parseFloat(monthlyUsage?.totalCostUsd || "0");

  // Check LLM cost limits using plan-specific limits
  const wouldExceedDailyLimit =
    currentDailyCost + (plannedUsage?.llmCostUsd || 0) >
    planLimits.maxDailyCostUSD;
  const wouldExceedMonthlyLimit =
    currentMonthlyCost + (plannedUsage?.llmCostUsd || 0) >
    planLimits.maxMonthlyCostUSD;

  // Check daily token limits
  const currentDailyTokens = dailyUsage?.totalTokens || 0;
  const plannedTokens =
    (plannedUsage?.inputTokens || 0) + (plannedUsage?.outputTokens || 0);
  const wouldExceedDailyTokenLimit = planLimits.maxTokensPerDay
    ? currentDailyTokens + plannedTokens > planLimits.maxTokensPerDay
    : false;

  // Check tool limits (monthly) using plan-specific limits
  const currentImages = monthlyUsage?.imageGenerationsCount || 0;
  const currentVideos = monthlyUsage?.videoGenerationsCount || 0;
  const currentSearches = monthlyUsage?.webSearchesCount || 0;

  // Only check tool limits if those tools are actually being used
  const wouldExceedImageLimit = plannedUsage?.imageGenerations
    ? currentImages + plannedUsage.imageGenerations >
      planLimits.maxImageGenerationsPerMonth
    : false;
  const wouldExceedVideoLimit = plannedUsage?.videoGenerations
    ? currentVideos + plannedUsage.videoGenerations >
      planLimits.maxVideoGenerationsPerMonth
    : false;
  const wouldExceedSearchLimit = plannedUsage?.webSearches
    ? currentSearches + plannedUsage.webSearches >
      planLimits.maxWebSearchesPerMonth
    : false;

  const canProceed =
    !wouldExceedDailyLimit &&
    !wouldExceedMonthlyLimit &&
    !wouldExceedDailyTokenLimit &&
    !wouldExceedImageLimit &&
    !wouldExceedVideoLimit &&
    !wouldExceedSearchLimit;

  return {
    canProceed,
    limits: {
      dailyCostExceeded: wouldExceedDailyLimit,
      monthlyCostExceeded: wouldExceedMonthlyLimit,
      dailyTokensExceeded: wouldExceedDailyTokenLimit,
      imageGenerationsExceeded: wouldExceedImageLimit,
      videoGenerationsExceeded: wouldExceedVideoLimit,
      webSearchesExceeded: wouldExceedSearchLimit,
    },
    current: {
      dailyCost: currentDailyCost,
      monthlyCost: currentMonthlyCost,
      dailyTokens: currentDailyTokens,
      imageGenerations: currentImages,
      videoGenerations: currentVideos,
      webSearches: currentSearches,
    },
    remaining: {
      dailyCost: Math.max(0, planLimits.maxDailyCostUSD - currentDailyCost),
      monthlyCost: Math.max(
        0,
        planLimits.maxMonthlyCostUSD - currentMonthlyCost,
      ),
      dailyTokens: planLimits.maxTokensPerDay
        ? Math.max(0, planLimits.maxTokensPerDay - currentDailyTokens)
        : Number.MAX_SAFE_INTEGER,
      imageGenerations: Math.max(
        0,
        planLimits.maxImageGenerationsPerMonth - currentImages,
      ),
      videoGenerations: Math.max(
        0,
        planLimits.maxVideoGenerationsPerMonth - currentVideos,
      ),
      webSearches: Math.max(
        0,
        planLimits.maxWebSearchesPerMonth - currentSearches,
      ),
    },
  };
}

/**
 * Check if user can proceed with the requested operation based on their tier
 */
export async function checkUserLimits(
  userId: string,
  pendingUsage: PendingUsage = {},
): Promise<LimitCheckResult> {
  try {
    // Get user's subscription
    const subscription =
      await subscriptionRepository.getUserActiveSubscription(userId);

    // Get plan type (defaults to 'free' if no active subscription)
    const planType = subscription?.planType || "free";

    // Apply limits to ALL users based on their plan type
    // Free users get the most restrictive limits, paid users get higher limits

    // Calculate estimated LLM cost for this operation
    const estimatedLLMCost =
      pendingUsage.inputTokens && pendingUsage.outputTokens
        ? estimateMessageCost(
            pendingUsage.inputTokens,
            pendingUsage.outputTokens,
            true,
          )
        : 0;

    // Get plan-specific limits (matches database values)
    const planLimits = await getSubscriptionLimitsFromDb(planType);
    if (!planLimits) {
      return { canProceed: true }; // Allow operation if we can't check limits
    }

    // Check limits using current monthly usage
    const limitCheck = await checkUserPlanLimits(userId, planLimits, {
      llmCostUsd: estimatedLLMCost,
      inputTokens: pendingUsage.inputTokens || 0,
      outputTokens: pendingUsage.outputTokens || 0,
      imageGenerations: pendingUsage.imageGenerations || 0,
      videoGenerations: pendingUsage.videoGenerations || 0,
      webSearches: pendingUsage.webSearches || 0,
    });

    if (!limitCheck.canProceed) {
      let limitExceeded = "Unknown limit exceeded";
      const planLimits = PLAN_LIMITS[planType];

      if (limitCheck.limits.dailyCostExceeded) {
        limitExceeded = `Daily cost limit exceeded ($${planLimits.maxDailyCostUSD}/day for ${planType.toUpperCase()} plan)`;
      } else if (limitCheck.limits.dailyTokensExceeded) {
        limitExceeded = `Daily token limit exceeded. Upgrade for more usage.`;
      } else if (limitCheck.limits.monthlyCostExceeded) {
        limitExceeded = `Monthly cost limit exceeded ($${planLimits.maxMonthlyCostUSD}/month for ${planType.toUpperCase()} plan)`;
      } else if (limitCheck.limits.imageGenerationsExceeded) {
        limitExceeded = `Monthly image generation limit exceeded (${planLimits.maxImageGenerationsPerMonth}/month for ${planType.toUpperCase()} plan)`;
      } else if (limitCheck.limits.videoGenerationsExceeded) {
        limitExceeded = `Monthly video generation limit exceeded (${planLimits.maxVideoGenerationsPerMonth}/month for ${planType.toUpperCase()} plan)`;
      } else if (limitCheck.limits.webSearchesExceeded) {
        limitExceeded = `Monthly web search limit exceeded (${planLimits.maxWebSearchesPerMonth}/month for ${planType.toUpperCase()} plan)`;
      }

      return {
        canProceed: false,
        limitExceeded,
        usage: {
          current: limitCheck.current,
          remaining: limitCheck.remaining,
        },
      };
    }

    return {
      canProceed: true,
      usage: {
        current: limitCheck.current,
        remaining: limitCheck.remaining,
      },
    };
  } catch (error) {
    console.error("Error checking Pro user limits:", error);
    // On error, allow the operation to prevent blocking users
    return { canProceed: true };
  }
}

/**
 * Legacy function for backward compatibility - redirects to checkUserLimits
 * @deprecated Use checkUserLimits instead
 */
export async function checkProUserLimits(
  userId: string,
  pendingUsage: PendingUsage = {},
): Promise<LimitCheckResult> {
  return checkUserLimits(userId, pendingUsage);
}

/**
 * Check if video quality is allowed for user's plan type
 */
export function checkVideoQuality(quality: string, planType: string): boolean {
  // Validate plan type
  if (!["free", "plus", "pro", "max"].includes(planType)) {
    return false;
  }

  const planLimits = PLAN_LIMITS[planType as PlanType];
  return planLimits.allowedVideoQualities.includes(quality as any);
}

/**
 * Format limit error message for user display
 */
export function formatLimitError(limitResult: LimitCheckResult): string {
  if (limitResult.canProceed) {
    return "";
  }

  let message = limitResult.limitExceeded || "Usage limit exceeded";

  if (limitResult.usage) {
    const { current, remaining } = limitResult.usage;

    if (limitResult.limitExceeded?.includes("Daily cost")) {
      message += `. Current daily usage: $${current.dailyCost.toFixed(4)}, remaining: $${remaining.dailyCost.toFixed(4)}`;
    } else if (limitResult.limitExceeded?.includes("Daily token")) {
      // Don't add detailed usage info for daily token limits - keep message clean
      return message;
    } else if (limitResult.limitExceeded?.includes("Monthly cost")) {
      message += `. Current monthly usage: $${current.monthlyCost.toFixed(4)}, remaining: $${remaining.monthlyCost.toFixed(4)}`;
    } else if (limitResult.limitExceeded?.includes("image")) {
      message += `. Images used this month: ${current.imageGenerations}, remaining: ${remaining.imageGenerations}`;
    } else if (limitResult.limitExceeded?.includes("video")) {
      message += `. Videos used this month: ${current.videoGenerations}, remaining: ${remaining.videoGenerations}`;
    } else if (limitResult.limitExceeded?.includes("search")) {
      message += `. Searches used this month: ${current.webSearches}, remaining: ${remaining.webSearches}`;
    }
  }

  return message;
}
