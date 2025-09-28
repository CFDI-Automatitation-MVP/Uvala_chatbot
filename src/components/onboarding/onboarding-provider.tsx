"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { WelcomePopup } from "./welcome-popup";

export function OnboardingProvider() {
  const { showOnboarding, isTrueFirstTimeUser, completeOnboarding, isLoading } =
    useOnboarding();

  if (isLoading) {
    return null;
  }

  console.log(
    "🎭 OnboardingProvider - showOnboarding:",
    showOnboarding,
    "isFirstTimeUser:",
    isTrueFirstTimeUser,
  );

  return (
    <WelcomePopup
      isOpen={showOnboarding}
      onClose={completeOnboarding}
      isFirstTimeUser={isTrueFirstTimeUser}
    />
  );
}
