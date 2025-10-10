"use client";

import { useState } from "react";
import { Leaf, Droplet, Zap } from "lucide-react";
import { Button } from "ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "ui/dialog";
import { CircularProgress } from "@/components/ui/circular-progress";
import { useTranslations } from "next-intl";

// Dummy data - will be replaced with real data later
const DUMMY_WATER_USAGE = 45.8; // liters
const DUMMY_ELECTRICITY_USAGE = 12.3; // kW/hr
const MAX_WATER = 100; // liters
const MAX_ELECTRICITY = 50; // kW/hr

export function EnvironmentalImpactButton() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Environmental");

  const waterPercentage = (DUMMY_WATER_USAGE / MAX_WATER) * 100;
  const electricityPercentage =
    (DUMMY_ELECTRICITY_USAGE / MAX_ELECTRICITY) * 100;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="sm:h-8 h-10 px-3 hover:bg-accent text-foreground hover:text-foreground relative z-50 border border-border/20 hover:border-border/40 touch-manipulation"
          >
            <Leaf className="sm:w-4 sm:h-4 w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="ml-2 text-xs font-bold hidden sm:inline whitespace-nowrap">
              {t("buttonLabel")}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{t("buttonTooltip")}</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Leaf className="w-5 h-5 text-green-600 dark:text-green-400" />
              {t("title")}
            </DialogTitle>
            <DialogDescription className="font-medium">
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-8 items-center justify-center py-6">
            {/* Water Usage */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <CircularProgress
                  value={waterPercentage}
                  size={140}
                  strokeWidth={10}
                  color="#3b82f6" // Blue color for water
                  label={`${DUMMY_WATER_USAGE.toFixed(1)}`}
                  sublabel={t("liters")}
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-full p-2 shadow-lg border-2 border-blue-500 dark:border-blue-400">
                  <Droplet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-center mt-2">
                <p className="text-sm font-bold text-foreground">
                  {t("waterUsage")}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {t("max")} {MAX_WATER} {t("liters")}
                </p>
              </div>
            </div>

            {/* Electricity Usage */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <CircularProgress
                  value={electricityPercentage}
                  size={140}
                  strokeWidth={10}
                  color="#eab308" // Yellow color for electricity
                  label={`${DUMMY_ELECTRICITY_USAGE.toFixed(1)}`}
                  sublabel={t("kwh")}
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-full p-2 shadow-lg border-2 border-yellow-500 dark:border-yellow-400">
                  <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                </div>
              </div>
              <div className="text-center mt-2">
                <p className="text-sm font-bold text-foreground">
                  {t("electricityUsage")}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {t("max")} {MAX_ELECTRICITY} {t("kwh")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-2">
            <p className="text-sm text-green-800 dark:text-green-200 text-center font-bold">
              {t("donationMessage")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
