"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/use-supabase-session";
import { useRouter } from "next/navigation";

const ONBOARDING_STORAGE_KEY = "uvala-onboarding-completed";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, isLoading: sessionLoading } = useSession();
  const router = useRouter();

  // Detect system language and set locale
  const detectAndSetSystemLanguage = () => {
    if (typeof window !== "undefined") {
      const systemLanguage =
        navigator.language || navigator.languages?.[0] || "en";
      const supportedLanguages = ["en", "es", "fr", "ja"];

      // Extract language code (e.g., 'en-US' -> 'en')
      const langCode = systemLanguage.split("-")[0];
      const targetLanguage = supportedLanguages.includes(langCode)
        ? langCode
        : "en";

      // Get current URL path without locale
      const currentPath = window.location.pathname;
      const isAlreadyLocalized = supportedLanguages.some((lang) =>
        currentPath.startsWith(`/${lang}`),
      );

      // Only redirect if not already on the correct locale
      if (
        !isAlreadyLocalized ||
        !currentPath.startsWith(`/${targetLanguage}`)
      ) {
        const newPath = `/${targetLanguage}${currentPath}`;
        console.log(
          `🌍 Detected system language: ${systemLanguage}, redirecting to: ${newPath}`,
        );
        router.push(newPath);
      }
    }
  };

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
    const hasCompletedOnboarding = localStorage.getItem(storageKey);

    console.log("🔑 Onboarding storage check:", {
      storageKey,
      hasCompletedOnboarding,
      userId: user.id,
    });

    // For first-time users, detect and set system language
    if (!hasCompletedOnboarding) {
      detectAndSetSystemLanguage();
      console.log("✅ Showing onboarding for new user");
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
    isLoading,
    completeOnboarding,
    skipOnboarding,
    showOnboardingManually,
  };
}
