'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Zap } from 'lucide-react'

type Currency = 'USD' | 'MXN'

interface PricingPlan {
  id: string
  name: string
  description: string
  price: {
    USD: number
    MXN: number
  }
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
  stripePriceId: {
    USD: string
    MXN: string
  }
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: {
      USD: 0,
      MXN: 0
    },
    interval: 'month',
    stripePriceId: {
      USD: '',
      MXN: ''
    },
    features: [
      '10 AI conversations per month',
      'Basic chat features',
      'Standard response time',
      'Community support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For regular users',
    price: {
      USD: 7,
      MXN: 119
    },
    interval: 'month',
    stripePriceId: {
      USD: 'price_1S3WO31pY9V37Up55MxEAfbh',
      MXN: ''
    },
    popular: true,
    features: [
      'Unlimited AI conversations',
      'Advanced chat features',
      'Priority response time',
      'File uploads',
      'Email support'
    ]
  },
  {
    id: 'max',
    name: 'Max',
    description: 'For power users and professionals',
    price: {
      USD: 11,
      MXN: 199
    },
    interval: 'month',
    stripePriceId: {
      USD: 'price_1S3WNc1pY9V37Up5kRxJfKSG',
      MXN: 'price_1S3WMv1pY9V37Up5gCETgD4x'
    },
    features: [
      'Everything in Pro',
      'Custom AI models',
      'API access',
      'Priority support',
      'Advanced integrations',
      'Analytics dashboard',
      'Higher usage limits'
    ]
  }
]

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>('MXN')

  const handleSubscribe = async (plan: PricingPlan) => {
    if (plan.price[currency] === 0) return // Free plan doesn't need checkout

    const priceId = plan.stripePriceId[currency]
    if (!priceId) {
      alert(`Stripe price ID not configured for this plan in ${currency}. Please contact support.`)
      return
    }

    setIsLoading(plan.id)
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId: priceId,
          planId: plan.id,
          currency: currency
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout. Please try again later.')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Unlock the full potential of AI-powered conversations with our flexible pricing plans.
        </p>
        
        {/* Currency Selector */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setCurrency('MXN')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                currency === 'MXN'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              MXN (Pesos)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                currency === 'USD'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              USD (Dollars)
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {pricingPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Zap className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            )}
            
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {plan.name}
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {plan.price[currency] === 0 ? 'Free' : 
                      `$${plan.price[currency]} ${currency}`
                    }
                    {plan.price[currency] > 0 && (
                      <span className="text-base font-normal text-muted-foreground">
                        /{plan.interval}
                      </span>
                    )}
                  </div>
                </div>
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                onClick={() => handleSubscribe(plan)}
                disabled={isLoading === plan.id || (plan.price[currency] > 0 && !plan.stripePriceId[currency])}
                variant={plan.popular ? 'default' : 'outline'}
              >
                {isLoading === plan.id ? (
                  'Loading...'
                ) : plan.price[currency] === 0 ? (
                  'Get Started'
                ) : !plan.stripePriceId[currency] ? (
                  'Coming Soon'
                ) : (
                  `Subscribe to ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-sm text-muted-foreground">
          All plans include a 14-day free trial. Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  )
}