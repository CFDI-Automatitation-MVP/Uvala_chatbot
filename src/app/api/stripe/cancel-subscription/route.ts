import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { subscriptionRepository } from "@/lib/db/repository";

export async function POST(_request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get user's subscription
    const userSubscription =
      await subscriptionRepository.getUserActiveSubscription(session.user.id);

    if (!userSubscription || !userSubscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    // Cancel the subscription at period end using Stripe's cancel endpoint
    const stripe = (await import("@/lib/stripe")).getStripe();

    // Update the subscription to cancel at period end
    await stripe.subscriptions.update(userSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update the subscription in our database to reflect cancellation
    await subscriptionRepository.updateSubscription(userSubscription.id, {
      cancelAtPeriodEnd: true,
    });

    return NextResponse.json({
      success: true,
      message:
        "Subscription will be canceled at the end of the current billing period",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: userSubscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
