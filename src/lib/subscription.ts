import { SubscriptionEntity, SubscriptionLimitsEntity, UserSubscriptionUsageEntity } from '@/lib/db/pg/schema.pg'

export type PlanType = 'free' | 'pro' | 'max'
export type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'

export interface PlanLimits {
  maxTokensPerMonth: number
  maxApiCallsPerMonth: number
  maxToolCallsPerMonth: number
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
    maxTokensPerMonth: 1000000, // 1M tokens per month
    maxApiCallsPerMonth: 2000,
    maxToolCallsPerMonth: 1000,
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
    'price_1S3WO31pY9V37Up55MxEAfbh': 'pro', // Pro USD
    'price_1S3WGo1pY9V37Up5I1Q1YUgA': 'pro', // Pro MXN
    'price_1S3WNc1pY9V37Up5kRxJfKSG': 'max', // Max USD
    'price_1S3WMv1pY9V37Up5gCETgD4x': 'max', // Max MXN
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