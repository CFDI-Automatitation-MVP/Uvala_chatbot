"use client";

import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { useTranslations } from "next-intl";
import { Code, Brain, X } from "lucide-react";
import { Button } from "ui/button";

interface ChatModeBannerProps {
  messageCount?: number;
}

export function ChatModeBanner({ messageCount = 0 }: ChatModeBannerProps) {
  const t = useTranslations("ChatMode");
  const [chatMode, appStoreMutate] = appStore(
    useShallow((state) => [state.chatMode, state.mutate]),
  );

  // Hide banner if in normal mode or if there are messages (user has already prompted)
  if (chatMode === "normal" || messageCount > 0) {
    return null;
  }

  const handleExitMode = () => {
    appStoreMutate({
      chatMode: "normal",
      chatModel: {
        provider: "Fast & Direct",
        model: "uvala-fuji",
      },
    });
  };

  const handleSuggestedPrompt = (prompt: string) => {
    // Trigger input with suggested prompt
    const event = new CustomEvent("insertSuggestedPrompt", {
      detail: { prompt },
    });
    window.dispatchEvent(event);
  };

  const getModeConfig = () => {
    if (chatMode === "coder") {
      return {
        icon: <Code className="h-5 w-5" />,
        title: t("coderModeTitle"),
        description: t("coderModeDescription"),
        suggestions: [
          t("coderSuggestion1"),
          t("coderSuggestion2"),
          t("coderSuggestion3"),
          t("coderSuggestion4"),
        ],
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        textColor: "text-blue-600 dark:text-blue-400",
      };
    } else {
      return {
        icon: <Brain className="h-5 w-5" />,
        title: t("promptBuilderModeTitle"),
        description: t("promptBuilderModeDescription"),
        suggestions: [
          t("promptBuilderSuggestion1"),
          t("promptBuilderSuggestion2"),
          t("promptBuilderSuggestion3"),
          t("promptBuilderSuggestion4"),
        ],
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        textColor: "text-purple-600 dark:text-purple-400",
      };
    }
  };

  const config = getModeConfig();

  return (
    <div
      className={`mx-auto w-full max-w-3xl rounded-lg border ${config.bgColor} ${config.borderColor} p-4 mb-4`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={config.textColor}>{config.icon}</div>
          <div className="flex-1">
            <h3 className={`font-semibold ${config.textColor} mb-1`}>
              {config.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {config.description}
            </p>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("suggestedPrompts")}:
              </p>
              <div className="flex flex-wrap gap-2">
                {config.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(suggestion)}
                    className="text-xs bg-background hover:bg-accent rounded-md px-2.5 py-1.5 border transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleExitMode}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
