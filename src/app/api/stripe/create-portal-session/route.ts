import { NextRequest, NextResponse } from 'next/server'
import { createPortalSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'
    
    const session = await createPortalSession(
      customerId,
      `${origin}/pricing`
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}