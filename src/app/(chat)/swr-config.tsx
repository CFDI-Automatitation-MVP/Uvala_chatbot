"use client";
import { useEffect } from "react";
import { SWRConfig } from "swr";

export function SWRConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    console.log(
      "%c█ █ █ █ ▄▀█ █   ▄▀█\n█▄█ ▀▄▀ █▀█ █▄▄ █▀█\n\n%c🤖 uvala - intelligent AI assistant",
      "color: #2563eb; font-weight: bold; font-family: monospace; font-size: 16px; text-shadow: 0 0 10px #2563eb;",
      "color: #888; font-size: 12px;",
    );

    // Add onboarding testing helper
    if (typeof window !== "undefined") {
      (window as any).showOnboarding = () => {
        // Clear all onboarding completion flags
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("uvala-onboarding-completed-")) {
            localStorage.removeItem(key);
          }
        });
        window.location.reload();
      };
      console.log("💡 Type 'showOnboarding()' to test the welcome popup");
    }
  }, []);
  return (
    <SWRConfig
      value={{
        focusThrottleInterval: 30000,
        dedupingInterval: 2000,
        errorRetryCount: 1,
      }}
    >
      {children}
    </SWRConfig>
  );
}
