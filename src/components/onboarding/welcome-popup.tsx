"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Video,
  Image as ImageIcon,
  TrendingUp,
  Brain,
  ChevronRight,
  ChevronLeft,
  Languages,
  FileText,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useSession } from "@/hooks/use-supabase-session";

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTimeUser?: boolean; // New prop to differentiate first-time vs manual trigger
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

const languages = [
  { code: "es", name: "Español" },
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "ja", name: "日本語" },
];

export function WelcomePopup({
  isOpen,
  onClose,
  isFirstTimeUser = false,
}: WelcomePopupProps) {
  const [currentStep, setCurrentStep] = useState(0); // Will be set correctly by useEffect
  const [selectedLanguage, setSelectedLanguage] = useState("es"); // Default to Spanish
  const [termsAccepted, setTermsAccepted] = useState(false); // Track T&C acceptance
  const t = useTranslations();
  const { data: session } = useSession();

  // Reset step when popup opens based on user type
  useEffect(() => {
    if (isOpen) {
      console.log("🔄 WelcomePopup opened, isFirstTimeUser:", isFirstTimeUser);
      console.log("🔄 WelcomePopup currentStep before:", currentStep);
      if (isFirstTimeUser) {
        // First-time users start with language selection
        console.log("🆕 First-time user: starting at language step (-1)");
        setCurrentStep(-1);
        setTermsAccepted(false);
        setSelectedLanguage("es");
      } else {
        // Manual trigger (? button) starts at features
        console.log("🎯 Manual trigger: starting at features step (0)");
        setCurrentStep(0);
      }
    }
  }, [isOpen, isFirstTimeUser]);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  const handleNext = () => {
    if (currentStep === -1) {
      // Language selection step - save language and move to T&C
      document.cookie = `i18n:locale=${selectedLanguage}; path=/; max-age=31536000`;

      // Mark language as selected for this user (to prevent showing language selection again)
      if (session?.user?.id) {
        localStorage.setItem(
          `uvala-language-selected-${session.user.id}`,
          "true",
        );
      }

      // Move to Terms & Conditions step (-0.5 represents T&C step)
      setCurrentStep(-0.5);
    } else if (currentStep === -0.5) {
      // Terms & Conditions step - move to features only if accepted
      if (termsAccepted) {
        setCurrentStep(0);
      }
    } else if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // At the end of features
      if (isFirstTimeUser) {
        // First-time users go to trial step
        setCurrentStep(features.length);
      } else {
        // Manual trigger (? button) just closes
        onClose();
      }
    }
  };

  const handleViewTerms = () => {
    // Open Terms & Conditions PDF in new tab
    window.open(
      "/terminos-y-condiciones-uvala.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleStartTrial = () => {
    // Here you can add trial activation logic
    console.log("🚀 Starting 5-day free trial");
    onClose();
  };

  const isLanguageStep = currentStep === -1;
  const isTermsStep = currentStep === -0.5;
  const isLastStep = currentStep === features.length - 1;
  const isTrialStep = currentStep === features.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
          onClick={(e) => e.stopPropagation()} // Prevent closing by clicking outside
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
              {isLanguageStep ? (
                // Language Selection Step
                <div className="p-12 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center justify-center w-16 h-16 mb-8"
                  >
                    <Languages className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                  </motion.div>

                  <motion.h2
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-medium text-gray-900 dark:text-white mb-4"
                  >
                    Elige tu idioma
                  </motion.h2>

                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed"
                  >
                    Selecciona tu idioma preferido para continuar
                  </motion.p>

                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 gap-4 mb-10"
                  >
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => setSelectedLanguage(language.code)}
                        className={`p-6 border rounded-xl transition-all duration-300 backdrop-blur-sm ${
                          selectedLanguage === language.code
                            ? "border-blue-400/60 bg-blue-500/10 shadow-lg shadow-blue-500/20 dark:border-blue-400/40 dark:bg-blue-400/10"
                            : "border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/30 dark:border-gray-600/30 dark:bg-gray-800/20 dark:hover:bg-gray-700/30"
                        }`}
                      >
                        <div className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                          {language.name}
                        </div>
                      </button>
                    ))}
                  </motion.div>

                  <Button
                    onClick={handleNext}
                    variant="outline"
                    className="px-8 py-3 border-white/30 dark:border-gray-600/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm hover:border-white/40 dark:bg-gray-700/20 dark:hover:bg-gray-600/30 text-gray-800 dark:text-gray-200 font-medium rounded-xl"
                  >
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : isTermsStep ? (
                // Terms & Conditions Step
                <div className="p-12 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center justify-center w-16 h-16 mb-8"
                  >
                    <FileText className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                  </motion.div>

                  <motion.h2
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-medium text-gray-900 dark:text-white mb-4"
                  >
                    Términos y Condiciones
                  </motion.h2>

                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed"
                  >
                    Para continuar, necesitas revisar y aceptar nuestros
                    términos y condiciones de uso.
                  </motion.p>

                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-6 mb-8"
                  >
                    {/* View Terms Button */}
                    <Button
                      onClick={handleViewTerms}
                      variant="outline"
                      className="w-full py-3 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver Términos y Condiciones
                    </Button>

                    {/* Acceptance Checkbox */}
                    <div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button
                        onClick={() => setTermsAccepted(!termsAccepted)}
                        className={`flex-shrink-0 w-5 h-5 border-2 rounded transition-colors ${
                          termsAccepted
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                        }`}
                      >
                        {termsAccepted && <Check className="w-3 h-3 m-0.5" />}
                      </button>
                      <div className="text-left">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          He leído y acepto los términos y condiciones
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          * Requerido para continuar
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <Button
                    onClick={handleNext}
                    disabled={!termsAccepted}
                    variant="outline"
                    className={`px-8 py-2 ${
                      termsAccepted
                        ? "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                        : "border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : isTrialStep ? (
                // Trial Step
                <div className="p-12 text-center">
                  <motion.h2
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-medium text-gray-900 dark:text-white mb-6"
                  >
                    {t("onboarding.trial.title")}
                  </motion.h2>

                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed"
                  >
                    {t("onboarding.trial.description")}
                  </motion.p>

                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      onClick={handleStartTrial}
                      variant="outline"
                      className="w-full py-3 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      {t("onboarding.trial.button")}
                    </Button>
                  </motion.div>
                </div>
              ) : (
                // Feature Steps
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
                    {/* Back Button - only show if not at first feature step */}
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
                          {isFirstTimeUser
                            ? t("onboarding.getStarted")
                            : "Close"}
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
              )}

              {/* Bottom indicator */}
              {!isTrialStep && !isLanguageStep && !isTermsStep && (
                <div className="text-center pb-6">
                  <p className="text-xs text-gray-400">
                    {currentStep + 1} {t("onboarding.of")} {features.length}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
