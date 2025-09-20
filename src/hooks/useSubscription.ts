import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface SubscriptionData {
  id: string;
  planType: "free" | "pro" | "max";
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  planType: "free" | "pro" | "max";
  subscription: SubscriptionData | null;
  userCreatedAt: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionStatus {
  const [data, setData] = useState<SubscriptionStatus>({
    hasSubscription: false,
    planType: "free",
    subscription: null,
    userCreatedAt: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const fetchSubscription = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setData((prev) => ({
          ...prev,
          hasSubscription: false,
          planType: "free",
          subscription: null,
          userCreatedAt: null,
          loading: false,
        }));
        return;
      }

      const response = await fetch("/api/subscription/status");

      if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
      }

      const subscriptionData = await response.json();

      setData((prev) => ({
        ...prev,
        ...subscriptionData,
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setData((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      }));
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // Initial fetch
    fetchSubscription();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if ((event === "SIGNED_IN" || event === "SIGNED_OUT") && mounted) {
        fetchSubscription();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove fetchSubscription from dependencies to avoid infinite loop

  return {
    ...data,
    refetch: fetchSubscription,
  };
}
