import { pgUsageRepository } from '@/lib/db/pg/repositories/usage-repository.pg'
import { subscriptionRepository } from '@/lib/db/repository'
import { estimateMessageCost, calculateLLMCost, calculateToolCosts } from '@/lib/cost-calculator'
import { PLAN_LIMITS, isSubscriptionActive } from '@/lib/subscription'

export interface LimitCheckResult {
  canProceed: boolean
  limitExceeded?: string
  usage?: {
    current: {
      dailyCost: number
      monthlyCost: number
      imageGenerations: number
      videoGenerations: number
      webSearches: number
    }
    remaining: {
      dailyCost: number
      monthlyCost: number
      imageGenerations: number
      videoGenerations: number
      webSearches: number
    }
  }
}

export interface PendingUsage {
  inputTokens?: number
  outputTokens?: number
  imageGenerations?: number
  videoGenerations?: number
  webSearches?: number
}

/**
 * Check if Pro user can proceed with the requested operation
 */
export async function checkProUserLimits(
  userId: string, 
  pendingUsage: PendingUsage = {}
): Promise<LimitCheckResult> {
  try {
    // Get user's subscription
    const subscription = await subscriptionRepository.getUserActiveSubscription(userId)
    
    // Only apply limits to users with ACTIVE Pro subscriptions
    // Free users and inactive Pro users have no limits
    if (!subscription || subscription.planType !== 'pro' || !isSubscriptionActive(subscription)) {
      return { canProceed: true }
    }

    // Calculate estimated LLM cost for this operation
    const estimatedLLMCost = pendingUsage.inputTokens && pendingUsage.outputTokens 
      ? estimateMessageCost(pendingUsage.inputTokens, pendingUsage.outputTokens, true)
      : 0

    // Check limits using the usage repository
    const limitCheck = await pgUsageRepository.checkProLimits(userId, {
      llmCostUsd: estimatedLLMCost,
      imageGenerations: pendingUsage.imageGenerations || 0,
      videoGenerations: pendingUsage.videoGenerations || 0,
      webSearches: pendingUsage.webSearches || 0,
    })

    if (!limitCheck.canProceed) {
      let limitExceeded = 'Unknown limit exceeded'
      
      if (limitCheck.limits.dailyCostExceeded) {
        limitExceeded = 'Daily cost limit exceeded ($0.05/day)'
      } else if (limitCheck.limits.monthlyCostExceeded) {
        limitExceeded = 'Monthly cost limit exceeded ($1.50/month)'
      } else if (limitCheck.limits.imageGenerationsExceeded) {
        limitExceeded = 'Monthly image generation limit exceeded (10/month)'
      } else if (limitCheck.limits.videoGenerationsExceeded) {
        limitExceeded = 'Monthly video generation limit exceeded (2/month)'
      } else if (limitCheck.limits.webSearchesExceeded) {
        limitExceeded = 'Monthly web search limit exceeded (40/month)'
      }

      return {
        canProceed: false,
        limitExceeded,
        usage: {
          current: limitCheck.current,
          remaining: limitCheck.remaining,
        }
      }
    }

    return {
      canProceed: true,
      usage: {
        current: limitCheck.current,
        remaining: limitCheck.remaining,
      }
    }
  } catch (error) {
    console.error('Error checking Pro user limits:', error)
    // On error, allow the operation to prevent blocking users
    return { canProceed: true }
  }
}

/**
 * Check specifically for tool usage limits
 */
export async function checkToolLimits(
  userId: string,
  toolType: 'image' | 'video' | 'search'
): Promise<LimitCheckResult> {
  const pendingUsage: PendingUsage = {}
  
  switch (toolType) {
    case 'image':
      pendingUsage.imageGenerations = 1
      break
    case 'video':
      pendingUsage.videoGenerations = 1
      break
    case 'search':
      pendingUsage.webSearches = 1
      break
  }

  return checkProUserLimits(userId, pendingUsage)
}

/**
 * Check if video quality is allowed for Pro users
 */
export function checkVideoQuality(quality: string, planType: string): boolean {
  if (planType !== 'pro') {
    return true // Non-pro users can use any quality (handled by other limits)
  }

  const proLimits = PLAN_LIMITS.pro
  return proLimits.allowedVideoQualities.includes(quality as any)
}

/**
 * Format limit error message for user display
 */
export function formatLimitError(limitResult: LimitCheckResult): string {
  if (limitResult.canProceed) {
    return ''
  }

  let message = limitResult.limitExceeded || 'Usage limit exceeded'
  
  if (limitResult.usage) {
    const { current, remaining } = limitResult.usage
    
    if (limitResult.limitExceeded?.includes('Daily cost')) {
      message += `. Current daily usage: $${current.dailyCost.toFixed(4)}, remaining: $${remaining.dailyCost.toFixed(4)}`
    } else if (limitResult.limitExceeded?.includes('Monthly cost')) {
      message += `. Current monthly usage: $${current.monthlyCost.toFixed(4)}, remaining: $${remaining.monthlyCost.toFixed(4)}`
    } else if (limitResult.limitExceeded?.includes('image')) {
      message += `. Images used this month: ${current.imageGenerations}, remaining: ${remaining.imageGenerations}`
    } else if (limitResult.limitExceeded?.includes('video')) {
      message += `. Videos used this month: ${current.videoGenerations}, remaining: ${remaining.videoGenerations}`
    } else if (limitResult.limitExceeded?.includes('search')) {
      message += `. Searches used this month: ${current.webSearches}, remaining: ${remaining.webSearches}`
    }
  }

  return message
}