import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { SubscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { pgUserRepository } from "@/lib/db/pg/repositories/user-repository.pg";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No need to set cookies in API route
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const subscriptionRepo = new SubscriptionRepository(db);

    // Get user's active subscription
    const subscription = await subscriptionRepo.getUserActiveSubscription(
      user.id,
    );

    // Get user creation date from database
    const userRecord = await pgUserRepository.findById(user.id);
    const userCreatedAt = userRecord?.createdAt || new Date();

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        planType: "free",
        subscription: null,
        userCreatedAt: userCreatedAt.toISOString(),
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      planType: subscription.planType,
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        createdAt: subscription.createdAt,
      },
      userCreatedAt: userCreatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
