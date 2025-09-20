"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { WelcomePopup } from "./welcome-popup";

export function OnboardingProvider() {
  const { showOnboarding, isTrueFirstTimeUser, completeOnboarding, isLoading } =
    useOnboarding();

  console.log("🎭 OnboardingProvider render:", { showOnboarding, isLoading });

  // Don't render anything while loading
  if (isLoading) {
    console.log("⏳ OnboardingProvider: Still loading...");
    return null;
  }

  if (showOnboarding) {
    console.log("🎉 OnboardingProvider: Rendering welcome popup");
  }

  return (
    <WelcomePopup
      isOpen={showOnboarding}
      onClose={completeOnboarding}
      isFirstTimeUser={isTrueFirstTimeUser}
    />
  );
}
