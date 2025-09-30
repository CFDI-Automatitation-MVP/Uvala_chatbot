"use client";

import { useSidebar } from "ui/sidebar";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";

export function SidebarHoverZone() {
  const { open, setOpen, openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [profileDropdownOpen, threadDropdownOpen] = appStore(
    useShallow((state) => [
      state.profileDropdownOpen,
      state.threadDropdownOpen,
    ]),
  );
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      const screenWidth = window.innerWidth;

      // Much tighter zones for immediate response
      const sidebarZone = screenWidth * 0.08; // Very narrow 8% zone for opening
      // Bigger close zone on mobile for easier return to chat
      const closeZone = isMobile ? screenWidth * 0.4 : screenWidth * 0.25; // 40% on mobile, 25% on desktop

      const currentlyOpen = isMobile ? openMobile : open;
      const isInSidebarZone = currentX <= sidebarZone;
      const isPastSidebar = currentX >= closeZone;

      // Clear close timeout when in sidebar zone
      if (isInSidebarZone && closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      // Open sidebar immediately when in narrow left zone
      if (isInSidebarZone && !currentlyOpen) {
        if (isMobile) {
          setOpenMobile(true);
        } else {
          setOpen(true);
        }
      }

      // Close sidebar immediately when leaving sidebar area
      // BUT don't close if any dropdown is open
      if (
        isPastSidebar &&
        currentlyOpen &&
        !profileDropdownOpen &&
        !threadDropdownOpen
      ) {
        // Clear any existing timeout
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }

        // Immediate closing - no delay
        closeTimeoutRef.current = setTimeout(() => {
          if (isMobile) {
            setOpenMobile(false);
          } else {
            setOpen(false);
          }
        }, 10); // Almost instant
      }
    };

    // High frequency event listening for smooth experience
    document.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    profileDropdownOpen,
    threadDropdownOpen,
  ]);

  return null;
}
