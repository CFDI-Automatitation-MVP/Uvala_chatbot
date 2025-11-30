"use client";

import { Bot } from "lucide-react";

/**
 * ModelPicker component
 *
 * Displays the fixed model used for presentation generation.
 * Only GPT-OSS-120B via Amazon Bedrock is available.
 * This component is kept for UI consistency but is non-interactive.
 */
export function ModelPicker({
  shouldShowLabel = true,
}: {
  shouldShowLabel?: boolean;
}) {
  return (
    <div>
      {shouldShowLabel && (
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Text Model
        </label>
      )}
      <div className="flex h-10 w-full items-center justify-between rounded-lg border border-border/40 bg-background px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">GPT-OSS-120B</span>
        </div>
      </div>
      {shouldShowLabel && (
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          via Amazon Bedrock
        </p>
      )}
    </div>
  );
}
