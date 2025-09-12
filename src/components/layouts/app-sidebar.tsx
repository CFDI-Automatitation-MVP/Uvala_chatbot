"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "ui/sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppSidebarMenus } from "./app-sidebar-menus";
import { AppSidebarAgents } from "./app-sidebar-agents";
import { AppSidebarThreads } from "./app-sidebar-threads";

import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";
import { AppSidebarUser } from "./app-sidebar-user";
import { PanelLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "ui/button";
import { useTheme } from "next-themes";
type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
};

export function AppSidebar({ session }: { session?: { user: SessionUser } }) {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80">
      <SidebarHeader className="p-2">
        {/* Logo Container - Bigger than menu icons */}
        <div className="flex items-center justify-center p-2 group-data-[collapsible=icon]:p-1">
          <div className="flex items-center justify-center group-data-[collapsible=icon]:w-16 group-data-[collapsible=icon]:h-16 group-data-[collapsible=icon]:bg-accent/10 group-data-[collapsible=icon]:rounded-lg">
            <img
              src={
                theme === "dark"
                  ? "/uvala-white-log.svg"
                  : "/uvala-black-log.svg"
              }
              alt="Uvala"
              className="size-8 group-data-[collapsible=icon]:size-12"
            />
            <span className="ml-2 font-bold text-lg group-data-[collapsible=icon]:sr-only">
              Uvala
            </span>
          </div>
        </div>

        {/* Mobile close trigger */}
        <div
          className="absolute right-2 top-2 block sm:hidden z-50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpenMobile(false);
          }}
        >
          <PanelLeft className="size-4" />
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
