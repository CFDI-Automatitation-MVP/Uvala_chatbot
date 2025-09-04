import { and, desc, eq } from 'drizzle-orm'
import { PgDatabase } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { 
  SubscriptionSchema, 
  SubscriptionLimitsSchema, 
  UserSubscriptionUsageSchema,
  type SubscriptionEntity,
  type SubscriptionLimitsEntity,
  type UserSubscriptionUsageEntity
} from '../schema.pg'
import { PlanType, getCurrentUsagePeriod, getNextResetDate, PLAN_LIMITS } from '@/lib/subscription'

export class SubscriptionRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async createSubscription(data: {
    userId: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    stripePriceId: string
    planType: PlanType
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    trialStart?: Date
    trialEnd?: Date
    metadata?: any
  }): Promise<SubscriptionEntity> {
    const [subscription] = await this.db
      .insert(SubscriptionSchema)
      .values({
        userId: data.userId,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        planType: data.planType,
        status: data.status as any,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        trialStart: data.trialStart,
        trialEnd: data.trialEnd,
        metadata: data.metadata,
      })
      .returning()

    return subscription
  }

  async updateSubscription(
    stripeSubscriptionId: string,
    data: Partial<{
      status: string
      currentPeriodStart: Date
      currentPeriodEnd: Date
      cancelAtPeriodEnd: boolean
      canceledAt: Date
      stripePriceId: string
      planType: PlanType
      metadata: any
    }>
  ): Promise<SubscriptionEntity | null> {
    const [subscription] = await this.db
      .update(SubscriptionSchema)
      .set({
        ...data,
        status: data.status as any,
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionSchema.stripeSubscriptionId, stripeSubscriptionId))
      .returning()

    return subscription || null
  }

  async getUserActiveSubscription(userId: string): Promise<SubscriptionEntity | null> {
    const subscription = await this.db
      .select()
      .from(SubscriptionSchema)
      .where(
        and(
          eq(SubscriptionSchema.userId, userId),
          eq(SubscriptionSchema.status, 'active')
        )
      )
      .orderBy(desc(SubscriptionSchema.createdAt))
      .limit(1)

    return subscription[0] || null
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<SubscriptionEntity | null> {
    const subscription = await this.db
      .select()
      .from(SubscriptionSchema)
      .where(eq(SubscriptionSchema.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1)

    return subscription[0] || null
  }

  async getUserCurrentUsage(userId: string): Promise<UserSubscriptionUsageEntity | null> {
    const { month, year } = getCurrentUsagePeriod()
    
    const usage = await this.db
      .select()
      .from(UserSubscriptionUsageSchema)
      .where(
        and(
          eq(UserSubscriptionUsageSchema.userId, userId),
          eq(UserSubscriptionUsageSchema.usageMonth, month),
          eq(UserSubscriptionUsageSchema.usageYear, year)
        )
      )
      .limit(1)

    return usage[0] || null
  }

  async createOrUpdateUsage(
    userId: string,
    subscriptionId: string,
    usage: {
      tokensUsed?: number
      apiCallsUsed?: number
      toolCallsUsed?: number
    }
  ): Promise<UserSubscriptionUsageEntity> {
    const { month, year } = getCurrentUsagePeriod()
    const resetAt = getNextResetDate()

    const existingUsage = await this.getUserCurrentUsage(userId)

    if (existingUsage) {
      const [updatedUsage] = await this.db
        .update(UserSubscriptionUsageSchema)
        .set({
          tokensUsed: existingUsage.tokensUsed + (usage.tokensUsed || 0),
          apiCallsUsed: existingUsage.apiCallsUsed + (usage.apiCallsUsed || 0),
          toolCallsUsed: existingUsage.toolCallsUsed + (usage.toolCallsUsed || 0),
          updatedAt: new Date(),
        })
        .where(eq(UserSubscriptionUsageSchema.id, existingUsage.id))
        .returning()

      return updatedUsage
    } else {
      const [newUsage] = await this.db
        .insert(UserSubscriptionUsageSchema)
        .values({
          userId,
          subscriptionId,
          usageMonth: month,
          usageYear: year,
          tokensUsed: usage.tokensUsed || 0,
          apiCallsUsed: usage.apiCallsUsed || 0,
          toolCallsUsed: usage.toolCallsUsed || 0,
          resetAt,
        })
        .returning()

      return newUsage
    }
  }

  async getUserPlanType(userId: string): Promise<PlanType> {
    const subscription = await this.getUserActiveSubscription(userId)
    return subscription?.planType || 'free'
  }

  async initializePlanLimits(): Promise<void> {
    for (const [planType, limits] of Object.entries(PLAN_LIMITS)) {
      await this.db
        .insert(SubscriptionLimitsSchema)
        .values({
          planType: planType as PlanType,
          maxTokensPerMonth: limits.maxTokensPerMonth,
          maxApiCallsPerMonth: limits.maxApiCallsPerMonth,
          maxToolCallsPerMonth: limits.maxToolCallsPerMonth,
          hasFileUploads: limits.hasFileUploads,
          hasAdvancedFeatures: limits.hasAdvancedFeatures,
          hasApiAccess: limits.hasApiAccess,
          hasPrioritySupport: limits.hasPrioritySupport,
        })
        .onConflictDoNothing()
    }
  }

  async getPlanLimits(planType: PlanType): Promise<SubscriptionLimitsEntity | null> {
    const limits = await this.db
      .select()
      .from(SubscriptionLimitsSchema)
      .where(eq(SubscriptionLimitsSchema.planType, planType))
      .limit(1)

    return limits[0] || null
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<SubscriptionEntity | null> {
    return this.updateSubscription(stripeSubscriptionId, {
      status: 'canceled',
      canceledAt: new Date(),
    })
  }
}