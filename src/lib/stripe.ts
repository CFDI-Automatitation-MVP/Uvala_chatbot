import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true
})

export const getStripeSession = async (sessionId: string) => {
  return await stripe.checkout.sessions.retrieve(sessionId)
}

export const createCheckoutSession = async ({
  priceId,
  userId,
  userEmail,
  successUrl,
  cancelUrl
}: {
  priceId: string
  userId?: string
  userEmail?: string
  successUrl: string
  cancelUrl: string
}) => {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: userId || ''
    }
  }

  if (userEmail) {
    sessionParams.customer_email = userEmail
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

export const createPortalSession = async (customerId: string, returnUrl: string) => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  })
}