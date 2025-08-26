import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import logger from 'logger'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data.session) {
        logger.info(`OAuth callback successful for user: ${data.user?.email}`)
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        if (isLocalEnv) {
          // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      } else {
        logger.error('OAuth callback error:', error)
        return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`)
      }
    } catch (err) {
      logger.error('OAuth callback exception:', err)
      return NextResponse.redirect(`${origin}/sign-in?error=server_error`)
    }
  }

  // return the user to an error page with instructions
  logger.error('OAuth callback: no code provided')
  return NextResponse.redirect(`${origin}/sign-in?error=no_code_provided`)
}