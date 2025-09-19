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
import { X, RotateCcw } from "lucide-react";
import { SimpleChatPromptBuilder } from "./prompt-builder/simple-chat-prompt-builder";

export function PromptBuilderPopup() {
  const [promptBuilder, appStoreMutate] = appStore(
    useShallow((state) => [state.promptBuilder, state.mutate]),
  );

  const setOpen = (bool: boolean) => {
    appStoreMutate({
      promptBuilder: {
        isOpen: bool,
      },
    });
  };

  return (
    <Drawer
      handleOnly
      direction="right"
      open={promptBuilder.isOpen}
      onOpenChange={setOpen}
    >
      <DrawerContent
        style={{
          userSelect: "text",
        }}
        className="w-full md:w-2xl px-2 flex flex-col"
      >
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Button
              variant={"ghost"}
              size={"sm"}
              onClick={() => {
                // Reset function will be called through a ref or context
                const resetEvent = new CustomEvent("promptBuilderReset");
                window.dispatchEvent(resetEvent);
              }}
              className="rounded-full"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <DrawerClose asChild>
              <Button
                variant={"secondary"}
                className="flex items-center gap-1 rounded-full"
              >
                <X />
              </Button>
            </DrawerClose>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            AI assistant that builds optimized prompts for you
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden">
          <SimpleChatPromptBuilder />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
