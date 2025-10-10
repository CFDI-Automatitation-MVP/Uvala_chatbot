"use client";

import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { MessageSquare, Code, Brain } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChatMode } from "@/app/store";

interface ChatModeSelectorInlineProps {
  messageCount?: number;
}

export function ChatModeSelectorInline({
  messageCount = 0,
}: ChatModeSelectorInlineProps) {
  const t = useTranslations("ChatMode");
  const [chatMode, appStoreMutate] = appStore(
    useShallow((state) => [state.chatMode, state.mutate]),
  );

  const handleModeChange = (newMode: ChatMode) => {
    appStoreMutate((state) => {
      const updates: any = { chatMode: newMode };

      // Auto-switch model based on mode
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
      } else if (newMode === "normal") {
        // When switching back to normal mode, reset to default normal chat model
        // Check if current model is a special mode model
        const currentModel = state.chatModel;
        if (
          currentModel?.model === "uvala-coder" ||
          currentModel?.model === "uvala-prompter"
        ) {
          // Reset to default normal chat model
          updates.chatModel = {
            provider: "Fast & Direct",
            model: "uvala-fuji",
          };
        }
        // Otherwise keep the user's selected normal chat model
      }

      return updates;
    });
  };

  const handleSuggestedPrompt = (prompt: string) => {
    // Trigger input with suggested prompt
    const event = new CustomEvent("insertSuggestedPrompt", {
      detail: { prompt },
    });
    window.dispatchEvent(event);
  };

  const modes: Array<{ value: ChatMode; icon: any; label: string }> = [
    { value: "normal", icon: MessageSquare, label: t("normal") },
    { value: "coder", icon: Code, label: t("coder") },
    { value: "promptBuilder", icon: Brain, label: t("promptBuilder") },
  ];

  const getModeInfo = () => {
    if (chatMode === "coder") {
      return {
        description: t("coderModeDescription"),
        suggestions: [
          t("coderSuggestion1"),
          t("coderSuggestion2"),
          t("coderSuggestion3"),
          t("coderSuggestion4"),
        ],
      };
    } else if (chatMode === "promptBuilder") {
      return {
        description: t("promptBuilderModeDescription"),
        suggestions: [
          t("promptBuilderSuggestion1"),
          t("promptBuilderSuggestion2"),
          t("promptBuilderSuggestion3"),
          t("promptBuilderSuggestion4"),
        ],
      };
    }
    return null;
  };

  const modeInfo = getModeInfo();
  const showInfoBox = modeInfo && messageCount === 0;

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 mx-2 mt-2 mb-1 border-b border-border/30">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = chatMode === mode.value;

          return (
            <button
              key={mode.value}
              onClick={() => handleModeChange(mode.value)}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-md
                text-xs font-medium transition-all
                ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <Icon className="size-3.5" />
              <span>{mode.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Info Box - Only show for special modes and when no messages */}
      {showInfoBox && (
        <div className="mx-4 mb-2 p-3 rounded-lg bg-background/40 dark:bg-background/20 backdrop-blur-sm border border-border/20">
          <p className="text-xs text-muted-foreground mb-2">
            {modeInfo.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {modeInfo.suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPrompt(suggestion)}
                className="text-[11px] px-2 py-1 rounded-md bg-background/60 dark:bg-background/40 hover:bg-background/80 dark:hover:bg-background/60 border border-border/30 transition-colors text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
