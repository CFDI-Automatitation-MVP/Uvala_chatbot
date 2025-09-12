import { SidebarProvider, SidebarInset } from "ui/sidebar";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { SidebarHoverZone } from "@/components/layouts/sidebar-hover-zone";
import { cookies } from "next/headers";

import { getSessionWithRedirect } from "@/lib/auth/supabase-auth";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { SWRConfigProvider } from "./swr-config";

export const experimental_ppr = true;

export default async function ChatLayout({
  children,
}: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await getSessionWithRedirect();
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";
  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <SWRConfigProvider>
        <AppPopupProvider />
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
