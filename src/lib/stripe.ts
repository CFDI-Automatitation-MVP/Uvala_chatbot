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
    },
    subscription_data: {
      metadata: {
        userId: userId || ''
      }
    },
    custom_text: {
      submit: {
        message: 'We\'ll email you instructions on how to get started.'
      }
    }
  }

  // If we have userId, create or update customer with metadata
  if (userId) {
    // Try to find existing customer by email or create new one
    let customerId: string | undefined;
    
    if (userEmail) {
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        // Update existing customer metadata
        await stripe.customers.update(customerId, {
          metadata: { userId }
        });
      }
    }
    
    if (!customerId) {
      // Create new customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId }
      });
      customerId = customer.id;
    }
    
    sessionParams.customer = customerId;
  } else if (userEmail) {
    // Only set customer_email if we don't have a userId (fallback case)
    sessionParams.customer_email = userEmail;
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

export const createPortalSession = async (customerId: string, returnUrl: string) => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  })
}