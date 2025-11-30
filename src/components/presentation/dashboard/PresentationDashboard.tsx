"use client";

import { createEmptyPresentation } from "@/app/_actions/presentation/presentationActions";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { PresentationControls } from "./PresentationControls";
import { PresentationExamples } from "./PresentationExamples";
import { PresentationHeader } from "./PresentationHeader";
import { PresentationInput } from "./PresentationInput";
import { PresentationsSidebar } from "./PresentationsSidebar";
import { RecentPresentations } from "./RecentPresentations";

export function PresentationDashboard({
  sidebarSide,
}: {
  sidebarSide?: "left" | "right";
}) {
  const router = useRouter();
  const {
    presentationInput,
    isGeneratingOutline,
    setCurrentPresentation,
    setIsGeneratingOutline,
    language,
    theme,
    setShouldStartOutlineGeneration,
  } = usePresentationState();

  useEffect(() => {
    setCurrentPresentation("", "");
    // Make sure to reset any generation flags when landing on dashboard
    setIsGeneratingOutline(false);
    setShouldStartOutlineGeneration(false);
  }, []);

  const handleGenerate = async () => {
    if (!presentationInput?.trim()) {
      toast.error("Please enter a topic for your presentation");
      return;
    }

    // Set UI loading state
    setIsGeneratingOutline(true);

    try {
      const result = await createEmptyPresentation(
        presentationInput.substring(0, 50) || "Untitled Presentation",
        theme,
        language,
      );

      if (result.success && result.presentation) {
        // Set the current presentation
        setCurrentPresentation(
          result.presentation.id,
          result.presentation.title,
        );
        router.push(`/presentations/generate/${result.presentation.id}`);
      } else {
        setIsGeneratingOutline(false);
        toast.error(result.message || "Failed to create presentation");
      }
    } catch (error) {
      setIsGeneratingOutline(false);
      console.error("Error creating presentation:", error);
      toast.error("Failed to create presentation");
    }
  };

  return (
    <div className="notebook-section relative h-full w-full flex">
      <PresentationsSidebar side={sidebarSide} />
      <div className="flex-1 overflow-y-auto flex items-start justify-center">
        <div className="w-full max-w-3xl space-y-12 px-8 py-20">
          <PresentationHeader />

          <div className="space-y-6">
            <PresentationInput handleGenerate={handleGenerate} />

            <div className="flex flex-col items-center gap-4">
              <PresentationControls shouldShowLabel={false} />

              <Button
                onClick={handleGenerate}
                disabled={!presentationInput?.trim() || isGeneratingOutline}
                size="lg"
                className="rounded-full px-10 h-12 font-medium text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-primary/20"
              >
                {isGeneratingOutline
                  ? "Generating..."
                  : "Generate Presentation"}
              </Button>
            </div>
          </div>

          <PresentationExamples />
          <RecentPresentations />
        </div>
      </div>
    </div>
  );
}
