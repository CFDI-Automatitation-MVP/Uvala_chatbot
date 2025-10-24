import {
  SubscriptionEntity,
  UserSubscriptionUsageEntity,
} from "@/lib/db/pg/schema.pg";

export type PlanType = "free" | "plus" | "pro" | "max";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid";

export interface PlanLimits {
  maxTokensPerMonth: number;
  maxTokensPerDay?: number;
  maxApiCallsPerMonth: number;
  maxToolCallsPerMonth: number;
  // Cost-based limits
  maxDailyCostUSD: number;
  maxMonthlyCostUSD: number;
  // Tool-specific limits
  maxImageGenerationsPerMonth: number;
  maxVideoGenerationsPerMonth: number;
  maxWebSearchesPerMonth: number;
  // Prompt builder limits
  maxPromptBuilderTokensPerDay: number;
  // Video quality restrictions
  allowedVideoQualities: ("480p" | "720p" | "1080p")[];
  // Feature flags
  hasFileUploads: boolean;
  hasAdvancedFeatures: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    // 7-day trial with Plus tier limits
    maxTokensPerMonth: 6420000, // 214,000 tokens/day * 30 days
    maxTokensPerDay: 214000, // Updated to 214k daily tokens
    maxApiCallsPerMonth: 1000, // Same as Plus
    maxToolCallsPerMonth: 1000, // Same as Plus
    maxImageGenerationsPerMonth: 35, // Same as Plus
    maxVideoGenerationsPerMonth: 6, // Same as Plus
    maxWebSearchesPerMonth: 180, // Same as Plus
    maxPromptBuilderTokensPerDay: 40000, // Prompt builder daily limit
    maxDailyCostUSD: 0.05, // Same as Plus
    maxMonthlyCostUSD: 1.5, // Same as Plus
    allowedVideoQualities: ["480p"], // Same as Plus
    hasFileUploads: true, // Same as Plus
    hasAdvancedFeatures: true, // Same as Plus
    hasApiAccess: false, // No API access during trial
    hasPrioritySupport: false, // No priority support during trial
  },
  plus: {
    maxTokensPerMonth: 6420000, // 214,000 tokens/day * 30 days
    maxTokensPerDay: 214000, // Updated to 214k daily tokens
    maxApiCallsPerMonth: 1000, // Estimated based on token usage
    maxToolCallsPerMonth: 1000,
    // Tool-specific limits from updated tier image
    maxImageGenerationsPerMonth: 35, // Imagen 4 Fast images
    maxVideoGenerationsPerMonth: 6, // Wan (video) clips
    maxWebSearchesPerMonth: 180, // Exa web searches
    maxPromptBuilderTokensPerDay: 60000, // Prompt builder daily limit
    // Cost limits
    maxDailyCostUSD: 0.05,
    maxMonthlyCostUSD: 1.5,
    allowedVideoQualities: ["480p"],
    // Features
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxTokensPerMonth: 9000000, // 300,000 tokens/day * 30 days
    maxTokensPerDay: 300000, // Updated to 300k daily tokens
    maxApiCallsPerMonth: 1300, // Estimated based on token usage
    maxToolCallsPerMonth: 2000,
    // Tool-specific limits from updated tier image
    maxImageGenerationsPerMonth: 50, // Imagen 4 Fast images
    maxVideoGenerationsPerMonth: 8, // Wan (video) clips
    maxWebSearchesPerMonth: 220, // Exa web searches
    maxPromptBuilderTokensPerDay: 40000, // Prompt builder daily limit
    // Cost limits
    maxDailyCostUSD: 0.1,
    maxMonthlyCostUSD: 3.0,
    allowedVideoQualities: ["480p"],
    // Features
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
  max: {
    maxTokensPerMonth: 12840000, // 428,000 tokens/day * 30 days
    maxTokensPerDay: 428000, // Updated to 428k daily tokens
    maxApiCallsPerMonth: 10000,
    maxToolCallsPerMonth: 5000,
    // Tool-specific limits from updated tier image
    maxImageGenerationsPerMonth: 70, // Imagen 4 Fast images
    maxVideoGenerationsPerMonth: 15, // Wan (video) clips
    maxWebSearchesPerMonth: 300, // Exa web searches
    maxPromptBuilderTokensPerDay: 100000, // Prompt builder daily limit
    // Cost limits
    maxDailyCostUSD: 0.2,
    maxMonthlyCostUSD: 6.0,
    allowedVideoQualities: ["480p"],
    // Features
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
};

export function getPlanTypeFromPriceId(priceId: string): PlanType {
  const priceIdMap: Record<string, PlanType> = {
    // Plus plan price IDs
    price_1S8ZQb1pY9V37Up5ZA7L5GdP: "plus", // Plus USD ($7)
    price_1S8XyI1pY9V37Up5iYJDKtqU: "plus", // Plus MXN (129)
    // Pro plan price IDs
    price_1S8aVQ1pY9V37Up58mNbG5rA: "pro", // Pro USD ($11)
    price_1S8XzW1pY9V37Up5DIUux5pQ: "pro", // Pro MXN (199)
    // Max plan price IDs
    price_1S8aWD1pY9V37Up57JJOhbk0: "max", // Max USD ($14)
    price_1S8aUO1pY9V37Up5TcfjXrNP: "max", // Max MXN (249)
  };

  return priceIdMap[priceId] || "free";
}

export function hasExceededLimits(
  usage: UserSubscriptionUsageEntity,
  limits: PlanLimits,
): {
  hasExceeded: boolean;
  exceededLimits: string[];
} {
  const exceededLimits: string[] = [];

  if (usage.tokensUsed > limits.maxTokensPerMonth) {
    exceededLimits.push("tokens");
  }

  if (usage.apiCallsUsed > limits.maxApiCallsPerMonth) {
    exceededLimits.push("api_calls");
  }

  if (usage.toolCallsUsed > limits.maxToolCallsPerMonth) {
    exceededLimits.push("tool_calls");
  }

  return {
    hasExceeded: exceededLimits.length > 0,
    exceededLimits,
  };
}

export function isSubscriptionActive(
  subscription: SubscriptionEntity,
): boolean {
  return (
    ["active", "trialing"].includes(subscription.status) &&
    new Date(subscription.currentPeriodEnd) > new Date()
  );
}

export function canAccessFeature(
  planType: PlanType,
  feature: keyof PlanLimits,
): boolean {
  const limits = PLAN_LIMITS[planType];
  if (typeof limits[feature] === "boolean") {
    return limits[feature] as boolean;
  }
  return true;
}

export function getRemainingUsage(
  usage: UserSubscriptionUsageEntity,
  planType: PlanType,
): {
  tokens: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  apiCalls: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  toolCalls: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
} {
  const limits = PLAN_LIMITS[planType];

  return {
    tokens: {
      used: usage.tokensUsed,
      limit: limits.maxTokensPerMonth,
      remaining: Math.max(0, limits.maxTokensPerMonth - usage.tokensUsed),
      percentage: Math.min(
        100,
        (usage.tokensUsed / limits.maxTokensPerMonth) * 100,
      ),
    },
    apiCalls: {
      used: usage.apiCallsUsed,
      limit: limits.maxApiCallsPerMonth,
      remaining: Math.max(0, limits.maxApiCallsPerMonth - usage.apiCallsUsed),
      percentage: Math.min(
        100,
        (usage.apiCallsUsed / limits.maxApiCallsPerMonth) * 100,
      ),
    },
    toolCalls: {
      used: usage.toolCallsUsed,
      limit: limits.maxToolCallsPerMonth,
      remaining: Math.max(0, limits.maxToolCallsPerMonth - usage.toolCallsUsed),
      percentage: Math.min(
        100,
        (usage.toolCallsUsed / limits.maxToolCallsPerMonth) * 100,
      ),
    },
  };
}

export function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

export function getCurrentUsagePeriod(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    year: now.getFullYear(),
  };
}

/**
 * Check if a user is within their 7-day trial period
 */
export function isUserInTrialPeriod(userCreatedAt: Date): boolean {
  const now = new Date();
  const trialEndDate = new Date(userCreatedAt);
  trialEndDate.setDate(trialEndDate.getDate() + 7); // Add 7 days

  return now <= trialEndDate;
}

/**
 * Get remaining trial days for a user
 */
export function getRemainingTrialDays(userCreatedAt: Date): number {
  const now = new Date();
  const trialEndDate = new Date(userCreatedAt);
  trialEndDate.setDate(trialEndDate.getDate() + 7);

  const diffTime = trialEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Check if user's trial has expired and they need to upgrade
 */
export function isTrialExpired(userCreatedAt: Date): boolean {
  return !isUserInTrialPeriod(userCreatedAt);
}
