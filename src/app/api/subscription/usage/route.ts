import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/supabase-auth'
import { pgUsageRepository } from '@/lib/db/pg/repositories/usage-repository.pg'
import { subscriptionRepository } from '@/lib/db/repository'
import { PLAN_LIMITS, isSubscriptionActive } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get user's subscription
    const subscription = await subscriptionRepository.getUserActiveSubscription(session.user.id)
    const planType = subscription?.planType || 'free'
    const isActivePro = subscription?.planType === 'pro' && isSubscriptionActive(subscription)
    const limits = PLAN_LIMITS[planType]

    // Get current usage data
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()

    const [dailyUsage, monthlyUsage] = await Promise.all([
      pgUsageRepository.getUserDailyUsage(session.user.id, today),
      pgUsageRepository.getUserMonthlyUsage(session.user.id, currentYear, currentMonth),
    ])

    // Calculate usage percentages and remaining quotas
    const currentDaily = parseFloat(dailyUsage?.totalCostUsd || '0')
    const currentMonthly = parseFloat(monthlyUsage?.totalCostUsd || '0')

    const response = {
      subscription: {
        planType,
        status: subscription?.status || 'free',
        currentPeriodEnd: subscription?.currentPeriodEnd,
      },
      limits: {
        // LLM Usage (cost-based for Pro)
        dailyCost: {
          used: currentDaily,
          limit: isActivePro ? 0.05 : null,
          remaining: isActivePro ? Math.max(0, 0.05 - currentDaily) : null,
          percentage: isActivePro ? Math.min(100, (currentDaily / 0.05) * 100) : 0,
        },
        monthlyCost: {
          used: currentMonthly,
          limit: isActivePro ? 1.50 : null,
          remaining: isActivePro ? Math.max(0, 1.50 - currentMonthly) : null,
          percentage: isActivePro ? Math.min(100, (currentMonthly / 1.50) * 100) : 0,
        },
        // Tool Usage (count-based for active Pro users only)
        imageGenerations: {
          used: monthlyUsage?.imageGenerationsCount || 0,
          limit: isActivePro ? 10 : null,
          remaining: isActivePro ? Math.max(0, 10 - (monthlyUsage?.imageGenerationsCount || 0)) : null,
          percentage: isActivePro ? Math.min(100, ((monthlyUsage?.imageGenerationsCount || 0) / 10) * 100) : 0,
        },
        videoGenerations: {
          used: monthlyUsage?.videoGenerationsCount || 0,
          limit: isActivePro ? 2 : null,
          remaining: isActivePro ? Math.max(0, 2 - (monthlyUsage?.videoGenerationsCount || 0)) : null,
          percentage: isActivePro ? Math.min(100, ((monthlyUsage?.videoGenerationsCount || 0) / 2) * 100) : 0,
        },
        webSearches: {
          used: monthlyUsage?.webSearchesCount || 0,
          limit: isActivePro ? 40 : null,
          remaining: isActivePro ? Math.max(0, 40 - (monthlyUsage?.webSearchesCount || 0)) : null,
          percentage: isActivePro ? Math.min(100, ((monthlyUsage?.webSearchesCount || 0) / 40) * 100) : 0,
        },
      },
      usage: {
        today: {
          cost: currentDaily,
          apiCalls: dailyUsage?.apiCallsCount || 0,
          tokens: dailyUsage?.totalTokens || 0,
        },
        thisMonth: {
          cost: currentMonthly,
          apiCalls: monthlyUsage?.apiCallsCount || 0,
          tokens: monthlyUsage?.totalTokens || 0,
          imageGenerations: monthlyUsage?.imageGenerationsCount || 0,
          videoGenerations: monthlyUsage?.videoGenerationsCount || 0,
          webSearches: monthlyUsage?.webSearchesCount || 0,
        },
      },
      nextResetDate: new Date(currentYear, currentMonth, 1), // Next month
    }

    return Response.json(response)
  } catch (error) {
    console.error('Error fetching usage data:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}