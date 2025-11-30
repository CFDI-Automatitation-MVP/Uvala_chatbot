"use client";
import { usePresentationState } from "@/states/presentation-state";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

// Import our new components
import AllweoneText from "@/components/globals/allweone-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExportButton } from "./buttons/ExportButton";
import { PresentButton } from "./buttons/PresentButton";
import { SaveStatus } from "./buttons/SaveStatus";
import { ShareButton } from "./buttons/ShareButton";

interface PresentationHeaderProps {
  title?: string;
}

export default function PresentationHeader({ title }: PresentationHeaderProps) {
  const t = useTranslations("Presentation");
  const currentPresentationTitle = usePresentationState(
    (s) => s.currentPresentationTitle,
  );
  const isPresenting = usePresentationState((s) => s.isPresenting);
  const currentPresentationId = usePresentationState(
    (s) => s.currentPresentationId,
  );
  const [presentationTitle, setPresentationTitle] =
    useState<string>("Presentation");
  const pathname = usePathname();
  // Check if we're on the generate/outline page
  const isPresentationPage =
    pathname.startsWith("/presentation/") && !pathname.includes("generate");

  // Update title when it changes in the state
  useEffect(() => {
    if (currentPresentationTitle) {
      setPresentationTitle(currentPresentationTitle);
    } else if (title) {
      setPresentationTitle(title);
    }
  }, [currentPresentationTitle, title]);

  if (pathname === "/presentation/create")
    return (
      <header className="flex h-12 max-w-[100vw] items-center justify-between overflow-clip border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/uvala-black-log.svg"
                  alt="Uvala Logo"
                  width={24}
                  height={24}
                  className="dark:hidden"
                />
                <Image
                  src="/uvala-white-log.svg"
                  alt="Uvala Logo"
                  width={24}
                  height={24}
                  className="hidden dark:block"
                />
                <AllweoneText className="text-lg font-bold" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("goBackToUvalaChat")}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    );

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-border bg-background px-4">
      {/* Left section with breadcrumb navigation */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/uvala-black-log.svg"
                alt="Uvala Logo"
                width={20}
                height={20}
                className="dark:hidden"
              />
              <Image
                src="/uvala-white-log.svg"
                alt="Uvala Logo"
                width={20}
                height={20}
                className="hidden dark:block"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("goBackToUvalaChat")}
          </TooltipContent>
        </Tooltip>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">{presentationTitle}</span>
      </div>

      {/* Right section with actions */}
      <div className="flex items-center gap-2">
        {/* Save status indicator */}
        <SaveStatus />

        {/* Export button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && (
          <ExportButton presentationId={currentPresentationId ?? ""} />
        )}

        {/* Share button - Only in presentation page, not outline */}
        {isPresentationPage && !isPresenting && <ShareButton />}

        {/* Present button - Only in presentation page, not outline */}
        {isPresentationPage && <PresentButton />}
      </div>
    </header>
  );
}
