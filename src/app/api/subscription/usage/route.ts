import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { pgUsageRepository } from "@/lib/db/pg/repositories/usage-repository.pg";
import { subscriptionRepository } from "@/lib/db/repository";
import { PLAN_LIMITS, isSubscriptionActive } from "@/lib/subscription";

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get user's subscription
    const subscription = await subscriptionRepository.getUserActiveSubscription(
      session.user.id,
    );
    const planType = subscription?.planType || "free";
    const isActivePaidPlan =
      subscription &&
      ["plus", "pro", "max"].includes(subscription.planType) &&
      isSubscriptionActive(subscription);
    const limits = PLAN_LIMITS[planType];

    // Get current usage data
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const [dailyUsage, monthlyUsage] = await Promise.all([
      pgUsageRepository.getUserDailyUsage(session.user.id, today),
      pgUsageRepository.getUserMonthlyUsage(
        session.user.id,
        currentYear,
        currentMonth,
      ),
    ]);

    // Calculate usage percentages and remaining quotas
    const currentDaily = parseFloat(dailyUsage?.totalCostUsd || "0");
    const currentMonthly = parseFloat(monthlyUsage?.totalCostUsd || "0");

    const response = {
      subscription: {
        planType,
        status: subscription?.status || "free",
        currentPeriodEnd: subscription?.currentPeriodEnd,
      },
      limits: {
        // LLM Usage (cost-based for paid plans)
        dailyCost: {
          used: currentDaily,
          limit: isActivePaidPlan ? limits.maxDailyCostUSD : null,
          remaining: isActivePaidPlan
            ? Math.max(0, limits.maxDailyCostUSD - currentDaily)
            : null,
          percentage: isActivePaidPlan
            ? Math.min(100, (currentDaily / limits.maxDailyCostUSD) * 100)
            : 0,
        },
        monthlyCost: {
          used: currentMonthly,
          limit: isActivePaidPlan ? limits.maxMonthlyCostUSD : null,
          remaining: isActivePaidPlan
            ? Math.max(0, limits.maxMonthlyCostUSD - currentMonthly)
            : null,
          percentage: isActivePaidPlan
            ? Math.min(100, (currentMonthly / limits.maxMonthlyCostUSD) * 100)
            : 0,
        },
        // Tool Usage (count-based for active paid users)
        imageGenerations: {
          used: monthlyUsage?.imageGenerationsCount || 0,
          limit: isActivePaidPlan ? limits.maxImageGenerationsPerMonth : null,
          remaining: isActivePaidPlan
            ? Math.max(
                0,
                limits.maxImageGenerationsPerMonth -
                  (monthlyUsage?.imageGenerationsCount || 0),
              )
            : null,
          percentage: isActivePaidPlan
            ? Math.min(
                100,
                ((monthlyUsage?.imageGenerationsCount || 0) /
                  limits.maxImageGenerationsPerMonth) *
                  100,
              )
            : 0,
        },
        videoGenerations: {
          used: monthlyUsage?.videoGenerationsCount || 0,
          limit: isActivePaidPlan ? limits.maxVideoGenerationsPerMonth : null,
          remaining: isActivePaidPlan
            ? Math.max(
                0,
                limits.maxVideoGenerationsPerMonth -
                  (monthlyUsage?.videoGenerationsCount || 0),
              )
            : null,
          percentage: isActivePaidPlan
            ? Math.min(
                100,
                ((monthlyUsage?.videoGenerationsCount || 0) /
                  limits.maxVideoGenerationsPerMonth) *
                  100,
              )
            : 0,
        },
        webSearches: {
          used: monthlyUsage?.webSearchesCount || 0,
          limit: isActivePaidPlan ? limits.maxWebSearchesPerMonth : null,
          remaining: isActivePaidPlan
            ? Math.max(
                0,
                limits.maxWebSearchesPerMonth -
                  (monthlyUsage?.webSearchesCount || 0),
              )
            : null,
          percentage: isActivePaidPlan
            ? Math.min(
                100,
                ((monthlyUsage?.webSearchesCount || 0) /
                  limits.maxWebSearchesPerMonth) *
                  100,
              )
            : 0,
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
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error fetching usage data:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
