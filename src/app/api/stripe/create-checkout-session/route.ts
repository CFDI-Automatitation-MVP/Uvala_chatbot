import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId } = body

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'
    
    const session = await createCheckoutSession({
      priceId,
      successUrl: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/pricing?canceled=true`,
      // You can add user info here if available from session/auth
      // userId: user?.id,
      // userEmail: user?.email
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}