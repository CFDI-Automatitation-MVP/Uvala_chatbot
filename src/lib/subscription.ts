import { SubscriptionEntity, UserSubscriptionUsageEntity } from '@/lib/db/pg/schema.pg'

export type PlanType = 'free' | 'pro' | 'max'
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
    maxTokensPerMonth: 50000, // 50K tokens per month
    maxApiCallsPerMonth: 100,
    maxToolCallsPerMonth: 50,
    hasFileUploads: false,
    hasAdvancedFeatures: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxTokensPerMonth: 1100000, // 1.1M tokens per month (based on $1.50 budget)
    maxTokensPerDay: 37000, // ~37K tokens per day (based on $0.05 budget)
    maxApiCallsPerMonth: 850, // ~850 messages per month
    maxApiCallsPerDay: 28, // ~28 messages per day
    maxToolCallsPerMonth: 1000,
    // Cost limits - LLM usage based on cost only
    maxDailyCostUSD: 0.05, // $0.05 per day
    maxMonthlyCostUSD: 1.50, // $1.50 per month
    // Tool-specific limits
    maxImageGenerationsPerMonth: 10, // 10 images
    maxVideoGenerationsPerMonth: 2, // 2 videos
    maxWebSearchesPerMonth: 40, // 40 EXA searches
    allowedVideoQualities: ['480p'], // Only 480p quality, no 720p
    // Features
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  max: {
    maxTokensPerMonth: 5000000, // 5M tokens per month
    maxApiCallsPerMonth: 10000,
    maxToolCallsPerMonth: 5000,
    hasFileUploads: true,
    hasAdvancedFeatures: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  }
}

export function getPlanTypeFromPriceId(priceId: string): PlanType {
  const priceIdMap: Record<string, PlanType> = {
    'price_1S4o7A1pY9V37Up5u2I6dxIL': 'pro', // Pro USD
    'price_1S4o7G1pY9V37Up5qN2yNxCt': 'pro', // Pro MXN
    'price_1S4o7U1pY9V37Up5PUtup870': 'max', // Max USD
    'price_1S4o7a1pY9V37Up5AeSbRFSs': 'max', // Max MXN
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