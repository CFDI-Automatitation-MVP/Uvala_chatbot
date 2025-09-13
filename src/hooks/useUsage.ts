import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface UsageData {
  subscription: {
    planType: 'free' | 'pro' | 'max'
    status: string
    currentPeriodEnd?: string
  }
  limits: {
    dailyCost: {
      used: number
      limit: number | null
      remaining: number | null
      percentage: number
    }
    monthlyCost: {
      used: number
      limit: number | null
      remaining: number | null
      percentage: number
    }
    imageGenerations: {
      used: number
      limit: number | null
      remaining: number | null
      percentage: number
    }
    videoGenerations: {
      used: number
      limit: number | null
      remaining: number | null
      percentage: number
    }
    webSearches: {
      used: number
      limit: number | null
      remaining: number | null
      percentage: number
    }
  }
  usage: {
    today: {
      cost: number
      apiCalls: number
      tokens: number
    }
    thisMonth: {
      cost: number
      apiCalls: number
      tokens: number
      imageGenerations: number
      videoGenerations: number
      webSearches: number
    }
  }
  nextResetDate: string
}

interface UsageStatus {
  data: UsageData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUsage(): UsageStatus {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchUsage = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setData(null)
        setLoading(false)
        return
      }

      const response = await fetch('/api/subscription/usage')
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }

      const usageData = await response.json()
      setData(usageData)
    } catch (error) {
      console.error('Error fetching usage:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!mounted) return

      if (!user) {
        setData(null)
        setLoading(false)
        return
      }

      await fetchUsage()
    }

    fetchData()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchData()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    data,
    loading,
    error,
    refetch: fetchUsage
  }
}