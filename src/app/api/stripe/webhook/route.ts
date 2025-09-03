import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

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
  
  // Here you would typically:
  // 1. Retrieve user from your database using metadata.userId
  // 2. Update user's subscription status
  // 3. Grant access to premium features
  // 4. Send confirmation email
  
  console.log('Processing payment success for customer:', customer)
  console.log('Session metadata:', metadata)
  
  // Example database update (implement with your database):
  // await updateUserSubscription(metadata?.userId, {
  //   stripeCustomerId: customer,
  //   subscriptionStatus: 'active',
  //   planType: getPlanFromPriceId(session.line_items?.data[0]?.price?.id)
  // })
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { customer, items, status } = subscription
  
  // Update user's subscription in your database
  console.log('Creating subscription record:', {
    customerId: customer,
    subscriptionId: subscription.id,
    status,
    priceId: items.data[0]?.price.id
  })
  
  // Example database operation:
  // await createUserSubscription({
  //   stripeCustomerId: customer,
  //   stripeSubscriptionId: subscription.id,
  //   status,
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
  // })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { customer, status } = subscription
  
  // Update subscription status in your database
  console.log('Updating subscription:', {
    customerId: customer,
    subscriptionId: subscription.id,
    newStatus: status
  })
  
  // Example database operation:
  // await updateUserSubscription(subscription.id, {
  //   status,
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
  // })
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { customer } = subscription
  
  // Update user's access in your database
  console.log('Canceling subscription access for customer:', customer)
  
  // Example database operation:
  // await updateUserSubscription(subscription.id, {
  //   status: 'canceled',
  //   canceledAt: new Date()
  // })
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