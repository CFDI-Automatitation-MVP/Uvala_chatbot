"use client";

import { appStore, ChatMode } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { MessageSquare, Code, Brain } from "lucide-react";

export function ChatModeSelector() {
  const t = useTranslations("ChatMode");
  const [chatMode, appStoreMutate] = appStore(
    useShallow((state) => [state.chatMode, state.mutate]),
  );

  const handleModeChange = (newMode: ChatMode) => {
    appStoreMutate((state) => {
      const updates: any = { chatMode: newMode };

      // Auto-switch models based on mode
      if (newMode === "coder") {
        updates.chatModel = {
          provider: "Internal",
          model: "uvala-coder",
        };
      } else if (newMode === "promptBuilder") {
        updates.chatModel = {
          provider: "Internal",
          model: "uvala-prompter",
        };
      } else {
        // Return to default normal chat model if not already set
        if (
          state.chatModel?.model === "uvala-coder" ||
          state.chatModel?.model === "uvala-prompter"
        ) {
          updates.chatModel = {
            provider: "Fast & Direct",
            model: "uvala-fuji",
          };
        }
      }

      return updates;
    });
  };

  return (
    <Select value={chatMode} onValueChange={handleModeChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="normal">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>{t("normal")}</span>
          </div>
        </SelectItem>
        <SelectItem value="coder">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>{t("coder")}</span>
          </div>
        </SelectItem>
        <SelectItem value="promptBuilder">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span>{t("promptBuilder")}</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
