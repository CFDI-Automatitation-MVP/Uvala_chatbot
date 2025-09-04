import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { db } from '@/lib/db/pg/db.pg'
import { SubscriptionRepository } from '@/lib/db/pg/repositories/subscription-repository.pg'
import { getPlanTypeFromPriceId } from '@/lib/subscription'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Payment succeeded for session:', session.id)
        
        // Handle successful payment
        await handlePaymentSuccess(session)
        break

      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription created:', subscription.id)
        
        // Handle subscription creation
        await handleSubscriptionCreated(subscription)
        break

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', updatedSubscription.id)
        
        // Handle subscription updates
        await handleSubscriptionUpdated(updatedSubscription)
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription
        console.log('Subscription canceled:', deletedSubscription.id)
        
        // Handle subscription cancellation
        await handleSubscriptionCanceled(deletedSubscription)
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment succeeded:', invoice.id)
        
        // Handle successful recurring payment
        await handleInvoicePaymentSucceeded(invoice)
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment failed:', failedInvoice.id)
        
        // Handle failed payment
        await handleInvoicePaymentFailed(failedInvoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  const { customer, metadata } = session
  
  console.log('Processing payment success for customer:', customer)
  console.log('Session metadata:', metadata)
  
  if (!metadata?.userId) {
    console.error('No userId in session metadata')
    return
  }

  const subscriptionRepo = new SubscriptionRepository(db)
  
  // Get line items to find the price ID
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
  const priceId = lineItems.data[0]?.price?.id
  
  if (!priceId) {
    console.error('No price ID found in session line items')
    return
  }

  const planType = getPlanTypeFromPriceId(priceId)
  
  console.log('Payment success processed:', {
    userId: metadata.userId,
    customerId: customer,
    priceId,
    planType
  })
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { customer, items, status } = subscription
  const priceId = items.data[0]?.price.id
  
  if (!priceId) {
    console.error('No price ID found in subscription items')
    return
  }

  const subscriptionRepo = new SubscriptionRepository(db)
  const planType = getPlanTypeFromPriceId(priceId)
  
  // Get customer to find userId (assuming we stored it in customer metadata)
  const stripeCustomer = await stripe.customers.retrieve(customer as string)
  
  let userId: string | null = null
  if ('metadata' in stripeCustomer && stripeCustomer.metadata?.userId) {
    userId = stripeCustomer.metadata.userId
  }
  
  if (!userId) {
    console.error('No userId found in customer metadata')
    return
  }

  try {
    await subscriptionRepo.createSubscription({
      userId,
      stripeCustomerId: customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      planType,
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      metadata: subscription.metadata,
    })

    console.log('Subscription created successfully:', {
      userId,
      subscriptionId: subscription.id,
      planType,
      status
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { customer, status, items } = subscription
  
  const subscriptionRepo = new SubscriptionRepository(db)
  const priceId = items.data[0]?.price.id
  const planType = priceId ? getPlanTypeFromPriceId(priceId) : undefined
  
  try {
    await subscriptionRepo.updateSubscription(subscription.id, {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripePriceId: priceId,
      planType,
      metadata: subscription.metadata,
    })

    console.log('Subscription updated successfully:', {
      subscriptionId: subscription.id,
      status,
      planType
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { customer } = subscription
  
  const subscriptionRepo = new SubscriptionRepository(db)
  
  try {
    await subscriptionRepo.cancelSubscription(subscription.id)
    
    console.log('Subscription canceled successfully:', {
      subscriptionId: subscription.id,
      customerId: customer
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const { customer } = invoice
  
  // Handle successful recurring payment
  console.log('Recurring payment succeeded:', {
    customerId: customer,
    invoiceId: invoice.id,
    amount: invoice.amount_paid
  })
  
  // Example: Extend subscription period, send receipt email
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { customer } = invoice
  
  // Handle failed payment - maybe send email notification
  console.log('Payment failed for customer:', customer)
  
  // Example: Send payment failure email, update subscription status
}