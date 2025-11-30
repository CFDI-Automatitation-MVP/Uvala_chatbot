import { SidebarProvider, SidebarInset } from "ui/sidebar";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { SidebarHoverZone } from "@/components/layouts/sidebar-hover-zone";
import { cookies } from "next/headers";

import { getSessionWithRedirect } from "@/lib/auth/supabase-auth";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { SWRConfigProvider } from "./swr-config";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { ChatLayoutClient } from "./layout-client";

export const experimental_ppr = true;

export default async function ChatLayout({
  children,
}: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionWithRedirect();
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";

  return (
    <ChatLayoutClient session={session} isCollapsed={isCollapsed}>
      {children}
    </ChatLayoutClient>
  );
}
