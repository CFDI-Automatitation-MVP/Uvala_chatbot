"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Edit3,
  Smartphone,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ComponentsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const componentsFeatures = [
  {
    icon: <Zap className="w-8 h-8" />,
    titleKey: "onboarding.components.features.instantGeneration.title",
    descriptionKey: "onboarding.components.features.instantGeneration.description",
    exampleKey: "onboarding.components.features.instantGeneration.example",
  },
  {
    icon: <Edit3 className="w-8 h-8" />,
    titleKey: "onboarding.components.features.editAndRefine.title",
    descriptionKey: "onboarding.components.features.editAndRefine.description",
    exampleKey: "onboarding.components.features.editAndRefine.example",
  },
  {
    icon: <Smartphone className="w-8 h-8" />,
    titleKey: "onboarding.components.features.responsive.title",
    descriptionKey: "onboarding.components.features.responsive.description",
    exampleKey: "onboarding.components.features.responsive.example",
  },
];

export function ComponentsPopup({ isOpen, onClose }: ComponentsPopupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const t = useTranslations();

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < componentsFeatures.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const isLastStep = currentStep === componentsFeatures.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
          onClick={onClose}
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
                      {componentsFeatures[currentStep].icon}
                    </div>
                  </motion.div>

                  <motion.h2
                    key={`title-${currentStep}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl font-medium text-gray-900 dark:text-white mb-4"
                  >
                    {t(componentsFeatures[currentStep].titleKey)}
                  </motion.h2>

                  <motion.p
                    key={`desc-${currentStep}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 dark:text-gray-400 leading-relaxed"
                  >
                    {t(componentsFeatures[currentStep].descriptionKey)}
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
                    &ldquo;{t(componentsFeatures[currentStep].exampleKey)}&rdquo;
                  </p>
                </motion.div>

                {/* Progress Dots */}
                <div className="flex justify-center space-x-2 mb-10">
                  {componentsFeatures.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 transition-colors ${
                        index <= currentStep
                          ? "bg-gray-900 dark:bg-gray-100"
                          : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3">
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

                  <Button
                    onClick={handleNext}
                    variant="outline"
                    className="px-8 py-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {isLastStep ? (
                      <>
                        Close
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        {t("onboarding.next")}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bottom indicator */}
              <div className="text-center pb-6">
                <p className="text-xs text-gray-400">
                  {currentStep + 1} {t("onboarding.of")} {componentsFeatures.length}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
