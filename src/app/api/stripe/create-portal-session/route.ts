import { NextRequest, NextResponse } from "next/server";
import { createPortalSession } from "@/lib/stripe";
import { BASE_URL } from "@/lib/const";
import { getSession } from "@/lib/auth/supabase-auth";
import { subscriptionRepository } from "@/lib/db/repository";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    // Verify customer ownership by checking if the authenticated user has a subscription with this customer ID
    const userSubscription =
      await subscriptionRepository.getUserActiveSubscription(session.user.id);

    if (!userSubscription || userSubscription.stripeCustomerId !== customerId) {
      return NextResponse.json(
        { error: "Access denied: Customer not found or not owned by user" },
        { status: 403 },
      );
    }

    const origin = request.headers.get("origin") || BASE_URL;

    const portalSession = await createPortalSession(
      customerId,
      `${origin}/pricing`,
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
