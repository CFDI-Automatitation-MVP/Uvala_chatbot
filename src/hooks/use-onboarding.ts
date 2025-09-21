"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/use-supabase-session";
import { useRouter } from "next/navigation";

const ONBOARDING_STORAGE_KEY = "uvala-onboarding-completed";
const LANGUAGE_SELECTED_KEY = "uvala-language-selected";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTrueFirstTimeUser, setIsTrueFirstTimeUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, isLoading: sessionLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("🔍 Onboarding check:", {
      sessionLoading,
      session,
      user: session?.user,
    });

    if (sessionLoading) return;

    // If no user, don't show onboarding
    if (!session?.user) {
      console.log("❌ No user found, not showing onboarding");
      setIsLoading(false);
      return;
    }

    const user = session.user;

    // Check if user has completed onboarding
    const storageKey = `${ONBOARDING_STORAGE_KEY}-${user.id}`;
    const languageSelectedKey = `${LANGUAGE_SELECTED_KEY}-${user.id}`;
    const hasCompletedOnboarding = localStorage.getItem(storageKey);
    const hasSelectedLanguage = localStorage.getItem(languageSelectedKey);

    console.log("🔑 Onboarding storage check:", {
      storageKey,
      hasCompletedOnboarding,
      hasSelectedLanguage,
      userId: user.id,
    });

    // Determine if this is a true first-time user (no onboarding AND no language selection)
    const isTruelyFirstTime = !hasCompletedOnboarding && !hasSelectedLanguage;

    // For first-time users, show onboarding
    if (!hasCompletedOnboarding) {
      console.log(
        "✅ Showing onboarding for user, isTruelyFirstTime:",
        isTruelyFirstTime,
      );
      setIsTrueFirstTimeUser(isTruelyFirstTime);
      setShowOnboarding(true);
    } else {
      console.log("⏭️ User has already completed onboarding");
    }

    setIsLoading(false);
  }, [session, sessionLoading, router]);

  const completeOnboarding = () => {
    if (session?.user) {
      localStorage.setItem(
        `${ONBOARDING_STORAGE_KEY}-${session.user.id}`,
        "true",
      );
    }
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  // Function to manually trigger onboarding (for testing or help menu)
  const showOnboardingManually = () => {
    console.log("🚀 Manually triggering onboarding popup");
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isTrueFirstTimeUser,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    showOnboardingManually,
  };
}
