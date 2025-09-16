import { SubscriptionEntity, UserSubscriptionUsageEntity } from '@/lib/db/pg/schema.pg'

export type PlanType = 'free' | 'plus' | 'pro' | 'max'
export type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'

export interface PlanLimits {
  maxTokensPerMonth: number
  maxTokensPerDay?: number
  maxApiCallsPerMonth: number
  maxApiCallsPerDay?: number
  maxToolCallsPerMonth: number
  // Cost-based limits
  maxDailyCostUSD: number
  maxMonthlyCostUSD: number
  // Tool-specific limits
  maxImageGenerationsPerMonth: number
  maxVideoGenerationsPerMonth: number
  maxWebSearchesPerMonth: number
  // Video quality restrictions
  allowedVideoQualities: ('480p' | '720p' | '1080p')[]
  // Feature flags
  hasFileUploads: boolean
  hasAdvancedFeatures: boolean
  hasApiAccess: boolean
  hasPrioritySupport: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxTokensPerMonth: 135000, // 4,500 tokens/day * 30 days
    maxTokensPerDay: 4500, // From tier image
    maxApiCallsPerMonth: 300, // Estimated based on token usage
    maxToolCallsPerMonth: 50,
    // Tool-specific limits from tier image
    maxImageGenerationsPerMonth: 2, // Flux images
    maxVideoGenerationsPerMonth: 1, // Wan videos  
    maxWebSearchesPerMonth: 10, // Exa web searches
    // Cost limits
    maxDailyCostUSD: 0.01, // Conservative for free tier
    maxMonthlyCostUSD: 0.30,
    allowedVideoQualities: ['480p', '720p', '1080p'],
    // Features
    hasFileUploads: false,
    hasAdvancedFeatures: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  plus: {
    maxTokensPerMonth: 1110000, // 37,000 tokens/day * 30 days  
    maxTokensPerDay: 37000, // From tier image
    maxApiCallsPerMonth: 850, // Estimated based on token usage
    maxApiCallsPerDay: 28,
    maxToolCallsPerMonth: 1000,
    // Tool-specific limits from tier image
    maxImageGenerationsPerMonth: 15, // Flux images
    maxVideoGenerationsPerMonth: 2, // Wan videos
    maxWebSearchesPerMonth: 80, // Exa web searches
    // Cost limits
    maxDailyCostUSD: 0.05,
    maxMonthlyCostUSD: 1.50,
    allowedVideoQualities: ['480p', '720p', '1080p'],
    // Features
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxTokensPerMonth: 1350000, // 45,000 tokens/day * 30 days
    maxTokensPerDay: 45000, // From tier image
    maxApiCallsPerMonth: 1200, // Estimated based on token usage
    maxApiCallsPerDay: 40,
    maxToolCallsPerMonth: 2000,
    // Tool-specific limits from tier image  
    maxImageGenerationsPerMonth: 25, // Flux images
    maxVideoGenerationsPerMonth: 8, // Wan videos
    maxWebSearchesPerMonth: 120, // Exa web searches
    // Cost limits
    maxDailyCostUSD: 0.10,
    maxMonthlyCostUSD: 3.00,
    allowedVideoQualities: ['480p', '720p'],
    // Features
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
  max: {
    maxTokensPerMonth: 1830000, // 61,000 tokens/day * 30 days
    maxTokensPerDay: 61000, // From tier image
    maxApiCallsPerMonth: 10000,
    maxToolCallsPerMonth: 5000,
    // Tool-specific limits from tier image
    maxImageGenerationsPerMonth: 40, // Flux images
    maxVideoGenerationsPerMonth: 20, // Wan videos
    maxWebSearchesPerMonth: 250, // Exa web searches
    // Cost limits
    maxDailyCostUSD: 0.20,
    maxMonthlyCostUSD: 6.00,
    allowedVideoQualities: ['480p', '720p', '1080p'],
    // Features
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  }
}

export function getPlanTypeFromPriceId(priceId: string): PlanType {
  const priceIdMap: Record<string, PlanType> = {
    // Current "pro" price IDs now map to "plus"
    'price_1S4o7A1pY9V37Up5u2I6dxIL': 'plus', // Plus USD (formerly Pro)
    'price_1S4o7G1pY9V37Up5qN2yNxCt': 'plus', // Plus MXN (formerly Pro)
    // Max tier price IDs remain the same
    'price_1S4o7U1pY9V37Up5PUtup870': 'max', // Max USD
    'price_1S4o7a1pY9V37Up5AeSbRFSs': 'max', // Max MXN
    // New Pro tier price IDs (to be created in Stripe)
    // 'price_NEW_PRO_USD': 'pro', // New Pro USD (to be added)
    // 'price_NEW_PRO_MXN': 'pro', // New Pro MXN (to be added)
  }
  
  return priceIdMap[priceId] || 'free'
}

export function hasExceededLimits(
  usage: UserSubscriptionUsageEntity,
  limits: PlanLimits
): {
  hasExceeded: boolean
  exceededLimits: string[]
} {
  const exceededLimits: string[] = []
  
  if (usage.tokensUsed > limits.maxTokensPerMonth) {
    exceededLimits.push('tokens')
  }
  
  if (usage.apiCallsUsed > limits.maxApiCallsPerMonth) {
    exceededLimits.push('api_calls')
  }
  
  if (usage.toolCallsUsed > limits.maxToolCallsPerMonth) {
    exceededLimits.push('tool_calls')
  }
  
  return {
    hasExceeded: exceededLimits.length > 0,
    exceededLimits
  }
}

export function isSubscriptionActive(subscription: SubscriptionEntity): boolean {
  return ['active', 'trialing'].includes(subscription.status) && 
         new Date(subscription.currentPeriodEnd) > new Date()
}

export function canAccessFeature(planType: PlanType, feature: keyof PlanLimits): boolean {
  const limits = PLAN_LIMITS[planType]
  if (typeof limits[feature] === 'boolean') {
    return limits[feature] as boolean
  }
  return true
}

export function getRemainingUsage(
  usage: UserSubscriptionUsageEntity,
  planType: PlanType
): {
  tokens: { used: number; limit: number; remaining: number; percentage: number }
  apiCalls: { used: number; limit: number; remaining: number; percentage: number }
  toolCalls: { used: number; limit: number; remaining: number; percentage: number }
} {
  const limits = PLAN_LIMITS[planType]
  
  return {
    tokens: {
      used: usage.tokensUsed,
      limit: limits.maxTokensPerMonth,
      remaining: Math.max(0, limits.maxTokensPerMonth - usage.tokensUsed),
      percentage: Math.min(100, (usage.tokensUsed / limits.maxTokensPerMonth) * 100)
    },
    apiCalls: {
      used: usage.apiCallsUsed,
      limit: limits.maxApiCallsPerMonth,
      remaining: Math.max(0, limits.maxApiCallsPerMonth - usage.apiCallsUsed),
      percentage: Math.min(100, (usage.apiCallsUsed / limits.maxApiCallsPerMonth) * 100)
    },
    toolCalls: {
      used: usage.toolCallsUsed,
      limit: limits.maxToolCallsPerMonth,
      remaining: Math.max(0, limits.maxToolCallsPerMonth - usage.toolCallsUsed),
      percentage: Math.min(100, (usage.toolCallsUsed / limits.maxToolCallsPerMonth) * 100)
    }
  }
}

export function getNextResetDate(): Date {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth
}

export function getCurrentUsagePeriod(): { month: number; year: number } {
  const now = new Date()
  return {
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    year: now.getFullYear()
  }
}