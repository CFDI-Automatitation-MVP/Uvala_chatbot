"use client";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "ui/drawer";
import { Button } from "ui/button";
import { X, RotateCcw, Eye } from "lucide-react";
import { SimpleChatCoder } from "./coder/simple-chat-coder";
import { useArtifactStore } from "@/stores/artifact-store";

export function CoderPopup() {
  const [coder, appStoreMutate] = appStore(
    useShallow((state) => [state.coder, state.mutate]),
  );
  const { activeArtifactId } = useArtifactStore();

  const setOpen = (bool: boolean) => {
    appStoreMutate({
      coder: {
        isOpen: bool,
      },
    });
  };

  const handleShowPreview = () => {
    console.log("[CODER POPUP] Manual preview trigger clicked");
    // Dispatch event to show preview
    const showPreviewEvent = new CustomEvent("coderShowPreview");
    window.dispatchEvent(showPreviewEvent);
  };

  return (
    <Drawer
      handleOnly
      direction="right"
      open={coder.isOpen}
      onOpenChange={setOpen}
    >
      <DrawerContent
        style={{
          userSelect: "text",
        }}
        className="w-full px-2 flex flex-col h-[90vh] md:h-full"
      >
        <DrawerHeader className="px-3 md:px-6">
          <DrawerTitle className="flex items-center gap-2">
            {/* macOS-style traffic light buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
              </div>
            </div>

            <div className="flex-1" />

            {/* Manual Preview Trigger Button - Apple styled */}
            {activeArtifactId && (
              <Button
                variant={"ghost"}
                size={"sm"}
                onClick={handleShowPreview}
                className="rounded-full h-8 px-3 gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                title="Show component preview"
              >
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Preview</span>
              </Button>
            )}

            <Button
              variant={"ghost"}
              size={"sm"}
              onClick={() => {
                const resetEvent = new CustomEvent("coderReset");
                window.dispatchEvent(resetEvent);
              }}
              className="rounded-full h-8 w-8 p-0"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <DrawerClose asChild>
              <Button
                variant={"secondary"}
                className="flex items-center gap-1 rounded-full h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            AI coding assistant powered by Qwen3 Coder
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden">
          <SimpleChatCoder />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
