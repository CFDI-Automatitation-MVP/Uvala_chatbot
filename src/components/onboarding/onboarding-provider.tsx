"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { WelcomePopup } from "./welcome-popup";

export function OnboardingProvider() {
  const { showOnboarding, isTrueFirstTimeUser, completeOnboarding, isLoading } =
    useOnboarding();

  if (isLoading) {
    console.log("⏳ OnboardingProvider: Still loading...");
    return null;
  }

  console.log(
    "🎭 OnboardingProvider - showOnboarding:",
    showOnboarding,
    "isFirstTimeUser:",
    isTrueFirstTimeUser,
  );

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
