"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { appStore } from "@/app/store";

import { AppSidebarMenus } from "./app-sidebar-menus";
import { AppSidebarAgents } from "./app-sidebar-agents";
import { AppSidebarThreads } from "./app-sidebar-threads";
import { SidebarCloseButton } from "./sidebar-close-button";

import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";
import { AppSidebarUser } from "./app-sidebar-user";
import { PanelLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import Image from "next/image";
type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
};

export function AppSidebar({ session }: { session?: { user: SessionUser } }) {
  const { toggleSidebar, setOpenMobile, open } = useSidebar();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const sidebarHoverZoneActive = appStore(
    (state) => state.sidebarHoverZoneActive,
  );

  const currentPath = usePathname();

  // global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.openNewChat)) {
        e.preventDefault();
        router.push("/");
        router.refresh();
      }
      if (isShortcutEvent(e, Shortcuts.toggleSidebar)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toggleSidebar]);

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/80 relative"
    >
      <SidebarHeader className="p-2 relative">
        {/* STATE 1: Sidebar COLLAPSED (closed) - Show only logo or hover icon */}
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center p-1">
          <div className="flex items-center justify-center w-16 h-16 bg-accent/10 rounded-lg transition-all duration-200">
            {/* Show PanelLeft icon ONLY when hovering over trigger zone */}
            {sidebarHoverZoneActive ? (
              <PanelLeft className="size-6 text-primary animate-pulse" />
            ) : (
              <Image
                src={
                  theme === "dark"
                    ? "/uvala-white-log.svg"
                    : "/uvala-black-log.svg"
                }
                alt="uvala"
                width={48}
                height={48}
                className="size-12"
              />
            )}
          </div>
        </div>

        {/* STATE 2: Sidebar EXPANDED (open) - Show logo + close button */}
        <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
          {/* Logo Container */}
          <div className="flex items-center">
            <Image
              src={
                theme === "dark"
                  ? "/uvala-white-log.svg"
                  : "/uvala-black-log.svg"
              }
              alt="uvala"
              width={32}
              height={32}
              className="size-8"
            />
            <span className="ml-2 font-bold text-lg">uvala</span>
          </div>

          {/* Close button - ONLY visible in expanded state */}
          {open && <SidebarCloseButton />}
        </div>

        {/* Mobile close trigger - Only for mobile devices */}
        <div
          className="absolute right-2 top-2 block sm:hidden z-50 p-2 hover:bg-accent rounded-md cursor-pointer touch-manipulation"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpenMobile(false);
          }}
        >
          <PanelLeft className="size-5" />
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-2 overflow-hidden relative">
        <div className="flex flex-col overflow-y-auto">
          <AppSidebarMenus />
          {false && <AppSidebarAgents />}
          <AppSidebarThreads />
        </div>
      </SidebarContent>
      <SidebarFooter className="flex flex-col items-stretch space-y-2">
        <AppSidebarUser session={session} />
      </SidebarFooter>
    </Sidebar>
  );
}
