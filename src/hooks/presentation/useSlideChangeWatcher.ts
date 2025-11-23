import { usePresentationState } from "@/states/presentation-state";
import { useEffect } from "react";
import { useDebouncedSave } from "./useDebouncedSave";

interface UseSlideChangeWatcherOptions {
  /**
   * The delay in milliseconds before triggering a save.
   * @default 1000
   */
  debounceDelay?: number;
}

/**
 * A hook that watches for changes to the slides and triggers
 * a debounced save function whenever changes are detected.
 */
export const useSlideChangeWatcher = (
  options: UseSlideChangeWatcherOptions = {},
) => {
  const { debounceDelay = 1000 } = options;
  // Use slides.length instead of slides array to avoid triggering on every slide mutation
  const slidesLength = usePresentationState((s) => s.slides.length);
  const isGeneratingPresentation = usePresentationState(
    (s) => s.isGeneratingPresentation,
  );
  const isGeneratingOutline = usePresentationState(
    (s) => s.isGeneratingOutline,
  );
  const { save, saveImmediately } = useDebouncedSave({ delay: debounceDelay });

  // Watch for changes to the slides length and trigger save
  // Only triggers when slides are added/removed, not on every slide property change
  useEffect(() => {
    // Only save if we have slides and we're NOT generating anything
    if (slidesLength > 0 && !isGeneratingPresentation && !isGeneratingOutline) {
      save();
    }
  }, [slidesLength, save, isGeneratingPresentation, isGeneratingOutline]);

  return {
    saveImmediately,
  };
};
