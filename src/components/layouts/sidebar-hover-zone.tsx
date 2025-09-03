"use client";

import { useSidebar } from "ui/sidebar";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function SidebarHoverZone() {
  const { open, setOpen, openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      const screenWidth = window.innerWidth;
      
      // Much tighter zones for immediate response
      const sidebarZone = screenWidth * 0.08; // Very narrow 8% zone for opening
      const closeZone = screenWidth * 0.25; // Close when past 25% (just outside sidebar area)
      
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
      if (isPastSidebar && currentlyOpen) {
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
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [open, setOpen, openMobile, setOpenMobile, isMobile]);

  return null;
}