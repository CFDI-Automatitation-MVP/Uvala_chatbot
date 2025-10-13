"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Code2,
  Maximize2,
  Download,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface CoderPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const coderFeatures = [
  {
    icon: <Eye className="w-8 h-8" />,
    titleKey: "onboarding.coder.features.livePreview.title",
    descriptionKey: "onboarding.coder.features.livePreview.description",
    exampleKey: "onboarding.coder.features.livePreview.example",
  },
  {
    icon: <Code2 className="w-8 h-8" />,
    titleKey: "onboarding.coder.features.multipleLanguages.title",
    descriptionKey: "onboarding.coder.features.multipleLanguages.description",
    exampleKey: "onboarding.coder.features.multipleLanguages.example",
  },
  {
    icon: <Maximize2 className="w-8 h-8" />,
    titleKey: "onboarding.coder.features.fullscreenMode.title",
    descriptionKey: "onboarding.coder.features.fullscreenMode.description",
    exampleKey: "onboarding.coder.features.fullscreenMode.example",
  },
  {
    icon: <Download className="w-8 h-8" />,
    titleKey: "onboarding.coder.features.codeExport.title",
    descriptionKey: "onboarding.coder.features.codeExport.description",
    exampleKey: "onboarding.coder.features.codeExport.example",
  },
];

export function CoderPopup({ isOpen, onClose }: CoderPopupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const t = useTranslations();

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < coderFeatures.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const isLastStep = currentStep === coderFeatures.length - 1;

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
                      {coderFeatures[currentStep].icon}
                    </div>
                  </motion.div>

                  <motion.h2
                    key={`title-${currentStep}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl font-medium text-gray-900 dark:text-white mb-4"
                  >
                    {t(coderFeatures[currentStep].titleKey)}
                  </motion.h2>

                  <motion.p
                    key={`desc-${currentStep}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 dark:text-gray-400 leading-relaxed"
                  >
                    {t(coderFeatures[currentStep].descriptionKey)}
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
                    &ldquo;{t(coderFeatures[currentStep].exampleKey)}&rdquo;
                  </p>
                </motion.div>

                {/* Progress Dots */}
                <div className="flex justify-center space-x-2 mb-10">
                  {coderFeatures.map((_, index) => (
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
                      {t("onboarding.next")}
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
                  {currentStep + 1} {t("onboarding.of")} {coderFeatures.length}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
