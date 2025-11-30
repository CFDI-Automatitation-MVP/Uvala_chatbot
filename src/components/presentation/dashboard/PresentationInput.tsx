"use client";

import { usePresentationState } from "@/states/presentation-state";
import { WebSearchToggle } from "./WebSearchToggle";

export function PresentationInput({
  handleGenerate,
}: {
  handleGenerate: () => void;
}) {
  const { presentationInput, setPresentationInput } = usePresentationState();

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={presentationInput || ""}
          onChange={(e) => setPresentationInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="What would you like to create a presentation about?"
          className="w-full resize-none rounded-xl border border-border/40 bg-background px-5 py-4 pb-12 text-sm font-normal text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 min-h-[120px]"
        />

        <div className="absolute bottom-4 left-4">
          <WebSearchToggle />
        </div>
      </div>
    </div>
  );
}
