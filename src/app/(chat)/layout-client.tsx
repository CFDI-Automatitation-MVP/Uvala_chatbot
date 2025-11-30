"use client";

import { SidebarProvider, SidebarInset } from "ui/sidebar";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { SidebarHoverZone } from "@/components/layouts/sidebar-hover-zone";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { SWRConfigProvider } from "./swr-config";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

interface ChatLayoutClientProps {
  children: React.ReactNode;
  session: Session | null;
  isCollapsed: boolean;
}

export function ChatLayoutClient({
  children,
  session,
  isCollapsed,
}: ChatLayoutClientProps) {
  const pathname = usePathname();

  // Check if we're on a presentation view page (the visualization screen)
  // Match /presentation/[id] or /presentations/[id] but NOT /presentations or /presentations/generate/[id]
  const isPresentationView =
    (pathname.startsWith("/presentation/") ||
      pathname.startsWith("/presentations/")) &&
    !pathname.includes("/generate") &&
    pathname !== "/presentation" &&
    pathname !== "/presentations";

  // If on presentation view, render without sidebar or header
  if (isPresentationView) {
    return (
      <SWRConfigProvider>
        <AppPopupProvider />
        <OnboardingProvider />
        <div className="relative bg-background flex flex-col h-screen w-screen overflow-hidden">
          {children}
        </div>
      </SWRConfigProvider>
    );
  }

  // Normal chat layout with sidebar
  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <SWRConfigProvider>
        <AppPopupProvider />
        <OnboardingProvider />
        <AppSidebar session={session} />
        <SidebarHoverZone />
        <SidebarInset className="relative bg-background flex flex-col h-screen">
          <AppHeader />
          <div className="flex-1 overflow-y-auto relative z-30">{children}</div>
        </SidebarInset>
      </SWRConfigProvider>
    </SidebarProvider>
  );
}
