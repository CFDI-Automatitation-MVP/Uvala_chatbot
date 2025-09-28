"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Button } from "ui/button";
import { Separator } from "ui/separator";

import { useEffect, useMemo } from "react";
import { ThreadDropdown } from "../thread-dropdown";
import { appStore } from "@/app/store";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/shallow";
import { TextShimmer } from "ui/text-shimmer";
import { useOnboarding } from "@/hooks/use-onboarding";

export function AppHeader() {
  const [_appStoreMutate] = appStore(useShallow((state) => [state.mutate]));
  const currentPaths = usePathname();
  const { showFeaturesOnly } = useOnboarding();

  const componentByPage = useMemo(() => {
    if (currentPaths.startsWith("/chat/")) {
      return <ThreadDropdownComponent />;
    }
  }, [currentPaths]);

  // Hide header on pricing page and archive pages - after all hooks are called
  if (currentPaths === "/pricing" || currentPaths.startsWith("/archive/")) {
    console.log("🚫 Header hidden for path:", currentPaths);
    return null;
  }

  console.log("✅ Header rendering for path:", currentPaths);

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center px-3 py-2">
        {componentByPage}
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Onboarding trigger button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("🖱️ ? button clicked!");
                  showFeaturesOnly();
                }}
                className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground relative z-50"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Show tutorial</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </>
  );
}

function ThreadDropdownComponent() {
  const [threadList, currentThreadId, generatingTitleThreadIds] = appStore(
    useShallow((state) => [
      state.threadList,
      state.currentThreadId,
      state.generatingTitleThreadIds,
    ]),
  );
  const currentThread = useMemo(() => {
    return threadList.find((thread) => thread.id === currentThreadId);
  }, [threadList, currentThreadId]);

  useEffect(() => {
    if (currentThread?.id) {
      document.title = currentThread.title || "New Chat";
    }
  }, [currentThread?.id]);

  if (!currentThread) return null;

  return (
    <div className="items-center gap-1 hidden md:flex">
      <div className="w-1 h-4">
        <Separator orientation="vertical" />
      </div>

      <ThreadDropdown
        threadId={currentThread.id}
        beforeTitle={currentThread.title}
      >
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-input! hover:text-foreground cursor-pointer flex gap-1 items-center px-2 py-1 rounded-md hover:bg-accent"
              >
                {generatingTitleThreadIds.includes(currentThread.id) ? (
                  <TextShimmer className="truncate max-w-60 min-w-0 mr-1">
                    {currentThread.title || "New Chat"}
                  </TextShimmer>
                ) : (
                  <p className="truncate max-w-60 min-w-0 mr-1">
                    {currentThread.title || "New Chat"}
                  </p>
                )}

                <ChevronDown size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] p-4 break-all overflow-y-auto max-h-[200px]">
              {currentThread.title || "New Chat"}
            </TooltipContent>
          </Tooltip>
        </div>
      </ThreadDropdown>
    </div>
  );
}
