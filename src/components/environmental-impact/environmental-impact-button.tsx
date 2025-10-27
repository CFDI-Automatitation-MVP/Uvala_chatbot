"use client";

import { useState, useEffect } from "react";
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

// Reference values for circular progress visualization
// Based on 16 long prompts/day × 30 days = 480 long prompts/month (doubled for headroom)
// Long prompt avg: 11.6 Wh, 49.53 mL water
const REFERENCE_WATER_LITERS = 24; // ~24L per month (480 × 49.53mL)
const REFERENCE_ENERGY_WH = 5600; // ~5,600 Wh per month (480 × 11.6Wh)

interface EnvironmentalData {
  waterLiters: number;
  energyWh: number;
  waterMl: number;
  year: number;
  month: number;
}

export function EnvironmentalImpactButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<EnvironmentalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("Environmental");

  // Fetch environmental data when dialog opens
  useEffect(() => {
    if (isOpen && !data) {
      fetchEnvironmentalData();
    }
  }, [isOpen]);

  const fetchEnvironmentalData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/environmental");
      if (response.ok) {
        const envData = await response.json();
        setData(envData);
      }
    } catch (error) {
      console.error("Failed to fetch environmental data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const waterUsage = data?.waterLiters || 0;
  const electricityUsage = data?.energyWh || 0;

  // Calculate percentages for circular progress (can exceed 100%)
  const waterPercentage = (waterUsage / REFERENCE_WATER_LITERS) * 100;
  const electricityPercentage = (electricityUsage / REFERENCE_ENERGY_WH) * 100;

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
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <>
                {/* Water Usage */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <CircularProgress
                      value={waterPercentage}
                      size={140}
                      strokeWidth={10}
                      color="#3b82f6" // Blue color for water
                      label={`${waterUsage.toFixed(2)}`}
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
                      label={`${electricityUsage.toFixed(2)}`}
                      sublabel="Wh"
                    />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-full p-2 shadow-lg border-2 border-yellow-500 dark:border-yellow-400">
                      <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-bold text-foreground">
                      {t("electricityUsage")}
                    </p>
                  </div>
                </div>
              </>
            )}
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
