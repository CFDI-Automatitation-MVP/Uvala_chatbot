"use client";

import { useSidebar } from "ui/sidebar";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";

export function SidebarHoverZone() {
  const { open, setOpen, openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [isHovering, setIsHovering] = useState(false);
  const [profileDropdownOpen, threadDropdownOpen, appStoreMutate] = appStore(
    useShallow((state) => [
      state.profileDropdownOpen,
      state.threadDropdownOpen,
      state.mutate,
    ]),
  );
  // const _closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      const screenWidth = window.innerWidth;

      // Narrow zone for hover detection (8% of screen width)
      const sidebarZone = screenWidth * 0.08;

      const currentlyOpen = isMobile ? openMobile : open;
      const isInSidebarZone = currentX <= sidebarZone;

      // Update hover state
      setIsHovering(isInSidebarZone);

      // Update global store for sidebar logo change (only when closed)
      if (!currentlyOpen) {
        appStoreMutate({ sidebarHoverZoneActive: isInSidebarZone });
      } else {
        appStoreMutate({ sidebarHoverZoneActive: false });
      }
    };

    const handleClick = (e: MouseEvent) => {
      const currentX = e.clientX;
      const screenWidth = window.innerWidth;
      const sidebarZone = screenWidth * 0.08;
      const isInSidebarZone = currentX <= sidebarZone;
      const currentlyOpen = isMobile ? openMobile : open;

      // Open sidebar when clicking in the hover zone
      if (isInSidebarZone && !currentlyOpen) {
        if (isMobile) {
          setOpenMobile(true);
        } else {
          setOpen(true);
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick);
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

  // Visual indicator zone - shows when hovering over the trigger area
  return (
    <div
      className={`fixed left-0 top-0 bottom-0 w-[8vw] z-40 pointer-events-none transition-opacity duration-200 ${
        isHovering && !open && !openMobile ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent" />
    </div>
  );
}
