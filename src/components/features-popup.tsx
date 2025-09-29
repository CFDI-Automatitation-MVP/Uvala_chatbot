"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Video,
  Image as ImageIcon,
  TrendingUp,
  Brain,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface FeaturesPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: <Globe className="w-8 h-8" />,
    titleKey: "onboarding.features.webSearch.title",
    descriptionKey: "onboarding.features.webSearch.description",
    exampleKey: "onboarding.features.webSearch.example",
  },
  {
    icon: <Video className="w-8 h-8" />,
    titleKey: "onboarding.features.videoGenerator.title",
    descriptionKey: "onboarding.features.videoGenerator.description",
    exampleKey: "onboarding.features.videoGenerator.example",
  },
  {
    icon: <ImageIcon className="w-8 h-8" />,
    titleKey: "onboarding.features.imageCreation.title",
    descriptionKey: "onboarding.features.imageCreation.description",
    exampleKey: "onboarding.features.imageCreation.example",
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    titleKey: "onboarding.features.chartsAnalytics.title",
    descriptionKey: "onboarding.features.chartsAnalytics.description",
    exampleKey: "onboarding.features.chartsAnalytics.example",
  },
  {
    icon: <Brain className="w-8 h-8" />,
    titleKey: "onboarding.features.promptBuilder.title",
    descriptionKey: "onboarding.features.promptBuilder.description",
    exampleKey: "onboarding.features.promptBuilder.example",
  },
];

export function FeaturesPopup({ isOpen, onClose }: FeaturesPopupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const t = useTranslations();

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    setCurrentStep(0); // Reset to first feature when closing
    onClose();
  };

  const isLastStep = currentStep === features.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Card */}
            <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 overflow-hidden rounded-2xl shadow-2xl shadow-black/10">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Feature Content */}
              <div className="p-12">
                <div className="text-center mb-10">
                  <motion.div
                    key={currentStep}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center justify-center w-16 h-16 mb-8"
                  >
                    <div className="text-gray-700 dark:text-gray-300">
                      {features[currentStep].icon}
                    </div>
                  </motion.div>

                  <motion.h2
                    key={`title-${currentStep}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl font-medium text-gray-900 dark:text-white mb-4"
                  >
                    {t(features[currentStep].titleKey)}
                  </motion.h2>

                  <motion.p
                    key={`desc-${currentStep}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 dark:text-gray-400 leading-relaxed"
                  >
                    {t(features[currentStep].descriptionKey)}
                  </motion.p>
                </div>

                {/* Example Section */}
                <motion.div
                  key={`example-${currentStep}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="border border-gray-200 dark:border-gray-800 p-6 mb-10 rounded-lg"
                >
                  <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    {t("onboarding.tryExample")}
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    &ldquo;{t(features[currentStep].exampleKey)}&rdquo;
                  </p>
                </motion.div>

                {/* Progress Dots */}
                <div className="flex justify-center space-x-2 mb-10">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-2 h-2 rounded-full transition-colors cursor-pointer hover:scale-110 ${
                        index === currentStep
                          ? "bg-gray-900 dark:bg-gray-100"
                          : "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3">
                  {/* Back Button - only show if not at first feature */}
                  {currentStep > 0 && (
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="px-6 py-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  )}

                  {/* Next/Close Button */}
                  <Button
                    onClick={handleNext}
                    variant="outline"
                    className="px-8 py-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {isLastStep ? (
                      <>
                        Close
                        <X className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bottom indicator */}
              <div className="text-center pb-6">
                <p className="text-xs text-gray-400">
                  {currentStep + 1} {t("onboarding.of")} {features.length}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
