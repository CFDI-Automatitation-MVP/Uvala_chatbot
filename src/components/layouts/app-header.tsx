"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import {
  ChevronDown,
  HelpCircle,
  Menu,
  Edit,
  MessageCircleDashed,
} from "lucide-react";
import { Button } from "ui/button";
import { Separator } from "ui/separator";

import { useEffect, useMemo, useState } from "react";
import { ThreadDropdown } from "../thread-dropdown";
import { appStore } from "@/app/store";
import { usePathname, useRouter } from "next/navigation";
import { useShallow } from "zustand/shallow";
import { TextShimmer } from "ui/text-shimmer";
import { useOnboarding } from "@/hooks/use-onboarding";
import { WelcomePopup } from "@/components/onboarding/welcome-popup";
import { useSidebar } from "ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppHeader() {
  const [appStoreMutate] = appStore(useShallow((state) => [state.mutate]));
  const currentPaths = usePathname();
  const { showFeaturesOnly } = useOnboarding();
  const [showPopup, setShowPopup] = useState(false);
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const router = useRouter();

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

  const handleNewChat = () => {
    if (isMobile) {
      // Clear current thread state before navigating for mobile
      appStoreMutate({
        currentThreadId: null,
        threadMentions: {},
      });
      // Force navigation with window.location for reliable new chat on mobile
      window.location.href = "/";
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleTemporaryChat = () => {
    if (isMobile) {
      // Open temporary chat directly in app state for mobile
      appStoreMutate((state) => ({
        temporaryChat: {
          ...state.temporaryChat,
          isOpen: true,
        },
      }));
    } else {
      // For desktop, use navigation
      router.push("/?temp=true");
      router.refresh();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center px-3 py-2">
        {/* Hamburger menu for mobile */}
        {isMobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="sm:h-8 sm:w-8 h-10 w-10 p-0 hover:bg-accent text-foreground hover:text-foreground mr-2 border border-border/20 hover:border-border/40 touch-manipulation"
              >
                <Menu className="sm:w-4 sm:h-4 w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle sidebar</p>
            </TooltipContent>
          </Tooltip>
        )}

        {componentByPage}
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Temporary Chat button - Mobile only */}
          <div className="block sm:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🖱️ Temporary chat button clicked on mobile!");
                    handleTemporaryChat();
                  }}
                  className="sm:h-8 sm:w-8 h-10 w-10 p-0 hover:bg-accent text-foreground hover:text-foreground relative z-50 border border-border/20 hover:border-border/40 touch-manipulation"
                >
                  <MessageCircleDashed className="sm:w-4 sm:h-4 w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Temporary chat</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* New Chat button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("🖱️ New chat button clicked!");
                  handleNewChat();
                }}
                className="sm:h-8 sm:w-8 h-10 w-10 p-0 hover:bg-accent text-foreground hover:text-foreground relative z-50 border border-border/20 hover:border-border/40 touch-manipulation"
              >
                <Edit className="sm:w-4 sm:h-4 w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New chat</p>
            </TooltipContent>
          </Tooltip>

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
                  setShowPopup(true);
                }}
                className="sm:h-8 sm:w-8 h-10 w-10 p-0 hover:bg-accent text-foreground hover:text-foreground relative z-50 border border-border/20 hover:border-border/40 touch-manipulation"
              >
                <HelpCircle className="sm:w-4 sm:h-4 w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Show tutorial</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Fallback popup for manual tutorial trigger */}
      <WelcomePopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        isFirstTimeUser={false}
      />
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
