"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/use-supabase-session";
import { useRouter } from "next/navigation";

const ONBOARDING_STORAGE_KEY = "uvala-onboarding-completed";
const LANGUAGE_SELECTED_KEY = "uvala-language-selected";
const TERMS_ACCEPTED_KEY = "uvala-terms-accepted";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTrueFirstTimeUser, setIsTrueFirstTimeUser] = useState(false);
  const [isManualTrigger, setIsManualTrigger] = useState(false);
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
    // Only mark as completed in localStorage if it's not a manual trigger
    if (session?.user && !isManualTrigger) {
      localStorage.setItem(
        `${ONBOARDING_STORAGE_KEY}-${session.user.id}`,
        "true",
      );
      // Also mark terms as accepted when completing onboarding
      localStorage.setItem(`${TERMS_ACCEPTED_KEY}-${session.user.id}`, "true");
    }
    setShowOnboarding(false);
    setIsManualTrigger(false); // Reset manual trigger flag
  };

  const acceptTerms = () => {
    if (session?.user) {
      localStorage.setItem(`${TERMS_ACCEPTED_KEY}-${session.user.id}`, "true");
    }
  };

  const hasAcceptedTerms = () => {
    if (session?.user) {
      return (
        localStorage.getItem(`${TERMS_ACCEPTED_KEY}-${session.user.id}`) ===
        "true"
      );
    }
    return false;
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  // Function to show only features tutorial (for ? button)
  const showFeaturesOnly = () => {
    console.log("🎯 FEATURES TUTORIAL TRIGGERED");
    setIsManualTrigger(true);
    setShowOnboarding(true);
    console.log(
      "✅ States set: manual=true, showOnboarding=true (features only)",
    );
  };

  return {
    showOnboarding,
    isTrueFirstTimeUser: isManualTrigger ? false : isTrueFirstTimeUser, // Manual triggers are not first-time users
    isLoading,
    completeOnboarding,
    skipOnboarding,
    showFeaturesOnly,
    acceptTerms,
    hasAcceptedTerms,
  };
}
