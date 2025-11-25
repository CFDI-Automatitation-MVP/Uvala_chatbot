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
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Text Model
        </label>
      )}
      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 flex-shrink-0" />
          <span className="truncate text-sm">GPT-OSS-120B</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">via Amazon Bedrock</p>
    </div>
  );
}
