import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { SubscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { pgUserRepository } from "@/lib/db/pg/repositories/user-repository.pg";
import { getPlanTypeFromPriceId } from "@/lib/subscription";
import { brevoEmailService } from "@/lib/email/brevo";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Payment succeeded for session:", session.id);

        // Handle successful payment
        await handlePaymentSuccess(session);
        break;

      case "customer.subscription.created":
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription created:", subscription.id);

        // Handle subscription creation
        await handleSubscriptionCreated(subscription);
        break;

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", updatedSubscription.id);

        // Handle subscription updates
        await handleSubscriptionUpdated(updatedSubscription);
        break;

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log("Subscription canceled:", deletedSubscription.id);

        // Handle subscription cancellation
        await handleSubscriptionCanceled(deletedSubscription);
        break;

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment succeeded:", invoice.id);

        // Handle successful recurring payment
        await handleInvoicePaymentSucceeded(invoice);
        break;

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment failed:", failedInvoice.id);

        // Handle failed payment
        await handleInvoicePaymentFailed(failedInvoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  const { customer, metadata } = session;

  console.log("Processing payment success for customer:", customer);
  console.log("Session metadata:", metadata);

  if (!metadata?.userId) {
    console.error("No userId in session metadata");
    return;
  }

  // Get line items to find the price ID
  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const priceId = lineItems.data[0]?.price?.id;

  if (!priceId) {
    console.error("No price ID found in session line items");
    return;
  }

  const planType = getPlanTypeFromPriceId(priceId);

  console.log("Payment success processed:", {
    userId: metadata.userId,
    customerId: customer,
    priceId,
    planType,
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("🚀 WEBHOOK: handleSubscriptionCreated called");
  console.log(
    "🔍 Raw subscription object:",
    JSON.stringify(subscription, null, 2),
  );

  const { customer, items, status, metadata } = subscription;
  const priceId = items.data[0]?.price.id;

  console.log("💰 Price ID:", priceId);
  console.log("👤 Customer:", customer);
  console.log("📝 Status:", status);
  console.log("🏷️ Metadata:", metadata);

  if (!priceId) {
    console.error("❌ No price ID found in subscription items");
    return;
  }

  const subscriptionRepo = new SubscriptionRepository(db);
  const planType = getPlanTypeFromPriceId(priceId);

  console.log("📋 Plan type resolved:", planType);

  // Get userId from subscription metadata (set during checkout session creation)
  const userId = metadata?.userId;

  if (!userId) {
    console.error("❌ No userId found in subscription metadata");
    console.log("🔍 Available metadata keys:", Object.keys(metadata || {}));
    return;
  }

  console.log("🆔 User ID found:", userId);

  try {
    // Check if user exists in our database
    console.log("👀 Checking if user exists in database...");
    const existingUser = await pgUserRepository.findById(userId);

    if (!existingUser) {
      console.log("❌ User not found in database, fetching from Stripe...");

      // Get customer details from Stripe
      const stripe = getStripe();
      const stripeCustomer = await stripe.customers.retrieve(
        customer as string,
      );

      if (stripeCustomer.deleted) {
        console.error("❌ Stripe customer was deleted");
        return;
      }

      console.log("📝 Stripe customer data:", stripeCustomer);

      // Create user if they don't exist
      if (stripeCustomer.email) {
        console.log("👤 Creating user in database...");
        await pgUserRepository.createUser({
          id: userId,
          name: stripeCustomer.name || stripeCustomer.email.split("@")[0],
          email: stripeCustomer.email,
          image: null,
        });
        console.log("✅ User created successfully!");
      } else {
        console.error("❌ No email found for Stripe customer");
        return;
      }
    } else {
      console.log("✅ User already exists in database");
    }

    console.log("💾 Attempting subscription database insertion...");

    const subscriptionData = {
      userId,
      stripeCustomerId: customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      planType,
      status,
      currentPeriodStart: (subscription as any).current_period_start
        ? new Date((subscription as any).current_period_start * 1000)
        : new Date(),
      currentPeriodEnd: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : new Date(),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : undefined,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
      metadata: subscription.metadata,
    };

    console.log(
      "📊 Subscription data to insert:",
      JSON.stringify(subscriptionData, null, 2),
    );

    const result = await subscriptionRepo.createSubscription(subscriptionData);

    console.log("✅ Database insertion successful!");
    console.log("🎉 Created subscription record:", result);

    // Send subscription confirmation email
    try {
      const user = await pgUserRepository.findById(userId);
      if (user) {
        brevoEmailService
          .sendSubscriptionCreatedEmail(user.email, user.name, planType)
          .then(() =>
            console.log(
              "✅ Subscription confirmation email sent to:",
              user.email,
            ),
          )
          .catch((emailError) =>
            console.error("❌ Failed to send subscription email:", emailError),
          );
      }
    } catch (emailError) {
      console.error(
        "⚠️ Error sending subscription confirmation email:",
        emailError,
      );
    }

    console.log("Subscription created successfully:", {
      userId,
      subscriptionId: subscription.id,
      planType,
      status,
    });
  } catch (error) {
    console.error("💥 CRITICAL ERROR creating subscription:");
    console.error("Error details:", error);
    console.error("Error stack:", (error as Error).stack);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { status, items } = subscription;

  const subscriptionRepo = new SubscriptionRepository(db);
  const priceId = items.data[0]?.price.id;
  const planType = priceId ? getPlanTypeFromPriceId(priceId) : undefined;

  try {
    // Check if subscription exists in our database first
    const existingSubscription =
      await subscriptionRepo.getUserSubscriptionByStripeId(subscription.id);

    if (!existingSubscription) {
      console.log(
        "⚠️ Subscription not found in database, skipping update:",
        subscription.id,
      );
      return;
    }

    await subscriptionRepo.updateSubscription(subscription.id, {
      status,
      currentPeriodStart: (subscription as any).current_period_start
        ? new Date((subscription as any).current_period_start * 1000)
        : undefined,
      currentPeriodEnd: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : undefined,
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      stripePriceId: priceId,
      planType,
      metadata: subscription.metadata,
    });

    console.log("Subscription updated successfully:", {
      subscriptionId: subscription.id,
      status,
      planType,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { customer } = subscription;

  const subscriptionRepo = new SubscriptionRepository(db);

  try {
    await subscriptionRepo.cancelSubscription(subscription.id);

    // Get subscription and user details for email
    const existingSubscription =
      await subscriptionRepo.getUserSubscriptionByStripeId(subscription.id);
    if (existingSubscription) {
      const user = await pgUserRepository.findById(existingSubscription.userId);
      if (user) {
        // Send cancellation email
        brevoEmailService
          .sendSubscriptionCancelledEmail(
            user.email,
            user.name,
            existingSubscription.planType,
          )
          .then(() =>
            console.log(
              "✅ Subscription cancellation email sent to:",
              user.email,
            ),
          )
          .catch((emailError) =>
            console.error("❌ Failed to send cancellation email:", emailError),
          );
      }
    }

    console.log("Subscription canceled successfully:", {
      subscriptionId: subscription.id,
      customerId: customer,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const { customer } = invoice;

  // Handle successful recurring payment
  console.log("Recurring payment succeeded:", {
    customerId: customer,
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
  });

  // Example: Extend subscription period, send receipt email
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { customer } = invoice;

  // Handle failed payment - maybe send email notification
  console.log("Payment failed for customer:", customer);

  // Example: Send payment failure email, update subscription status
}
