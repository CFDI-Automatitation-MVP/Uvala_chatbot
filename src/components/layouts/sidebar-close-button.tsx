"use client";

import { useSidebar } from "ui/sidebar";
import { PanelLeftClose } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useLocale } from "next-intl";

export function SidebarCloseButton() {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const locale = useLocale();

  const translations: Record<string, string> = {
    en: "Close sidebar",
    es: "Cerrar barra lateral",
  };

  const closeSidebarText = translations[locale] || translations.en;

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMobile) {
      setOpenMobile(false);
    } else {
      toggleSidebar();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClose}
          className="p-2.5 rounded-md hover:bg-accent transition-all duration-200 active:scale-95 group"
          aria-label={closeSidebarText}
          type="button"
        >
          <PanelLeftClose className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{closeSidebarText}</TooltipContent>
    </Tooltip>
  );
}
