'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [_session, _setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      // You could fetch session details here if needed
      // fetch(`/api/stripe/session/${sessionId}`)
      //   .then(res => res.json())
      //   .then(setSession)
      //   .finally(() => setLoading(false))
      
      // For now, just show success message
      setLoading(false)
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Payment Successful!</CardTitle>
            <CardDescription>
              Thank you for your subscription. Your account has been upgraded.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You should receive a confirmation email shortly. You can now access all premium features.
            </p>
            
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/">
                  Start Using Premium Features
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/pricing" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Pricing
                </Link>
              </Button>
            </div>
            
            {sessionId && (
              <p className="text-xs text-muted-foreground mt-4">
                Session ID: {sessionId}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}