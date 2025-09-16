"use client";

import { useUsage } from "@/hooks/useUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  DollarSign,
  Image as ImageIcon,
  Video,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function UsagePage() {
  const {
    data: usageData,
    loading: usageLoading,
    error: usageError,
  } = useUsage();
  const { planType, subscription } = useSubscription();

  if (usageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading usage data...</span>
      </div>
    );
  }

  if (usageError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-600">
        <AlertCircle className="h-8 w-8" />
        <span className="ml-2">Error loading usage data: {usageError}</span>
      </div>
    );
  }

  const isPaidPlan =
    ["plus", "pro", "max"].includes(planType) &&
    subscription?.status === "active";

  const UsageCard = ({
    title,
    icon,
    current,
    limit,
    percentage,
    unit = "",
    description,
  }: {
    title: string;
    icon: React.ReactNode;
    current: number;
    limit: number | null;
    percentage: number;
    unit?: string;
    description: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
        </div>
        {limit && (
          <Badge
            variant={
              percentage > 80
                ? "destructive"
                : percentage > 60
                  ? "secondary"
                  : "default"
            }
          >
            {current}
            {unit} / {limit}
            {unit}
          </Badge>
        )}
      </div>

      {limit ? (
        <>
          <Progress value={percentage} className="mb-2" />
          <p className="text-sm text-gray-600">
            {Math.round(percentage)}% used • {limit - current}
            {unit} remaining
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-600">
          {current}
          {unit} used{" "}
          {isPaidPlan
            ? "• Unlimited on Pro plan"
            : "• No limits on current plan"}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">{description}</p>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor your Uvala usage and limits
          </p>
        </div>
        <div className="text-right">
          <Badge
            variant={isPaidPlan ? "default" : "secondary"}
            className="mb-1"
          >
            {planType.toUpperCase()} PLAN
            {["plus", "pro", "max"].includes(planType) &&
              subscription?.status !== "active" &&
              " (INACTIVE)"}
          </Badge>
          {subscription?.currentPeriodEnd && (
            <p className="text-sm text-gray-500">
              Resets{" "}
              {formatDistanceToNow(new Date(subscription.currentPeriodEnd), {
                addSuffix: true,
              })}
            </p>
          )}
          {["plus", "pro", "max"].includes(planType) &&
            subscription?.status !== "active" && (
              <p className="text-xs text-red-600">
                Limits are not enforced on inactive subscriptions
              </p>
            )}
        </div>
      </div>

      {/* Plan-specific information */}
      {isPaidPlan && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h2 className="font-semibold mb-2 text-blue-900">Pro Plan Limits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>LLM Usage:</strong>
              <ul className="mt-1 space-y-1">
                <li>• $0.05 per day maximum</li>
                <li>• $1.50 per month maximum</li>
              </ul>
            </div>
            <div>
              <strong>Tool Usage (Monthly):</strong>
              <ul className="mt-1 space-y-1">
                <li>• 10 image generations</li>
                <li>• 2 video generations (480p only)</li>
                <li>• 40 web searches</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Daily Cost */}
        {isPaidPlan && (
          <UsageCard
            title="Daily LLM Cost"
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            current={Number(usageData?.limits.dailyCost.used.toFixed(4)) || 0}
            limit={usageData?.limits.dailyCost.limit ?? null}
            percentage={usageData?.limits.dailyCost.percentage || 0}
            unit="$"
            description="Resets daily at midnight UTC"
          />
        )}

        {/* Monthly Cost */}
        {isPaidPlan && (
          <UsageCard
            title="Monthly LLM Cost"
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            current={Number(usageData?.limits.monthlyCost.used.toFixed(2)) || 0}
            limit={usageData?.limits.monthlyCost.limit ?? null}
            percentage={usageData?.limits.monthlyCost.percentage || 0}
            unit="$"
            description="Resets on the 1st of each month"
          />
        )}

        {/* Image Generations */}
        <UsageCard
          title="Image Generations"
          icon={<ImageIcon className="h-5 w-5 text-purple-600" />}
          current={usageData?.limits.imageGenerations.used || 0}
          limit={usageData?.limits.imageGenerations.limit ?? null}
          percentage={usageData?.limits.imageGenerations.percentage || 0}
          description={isPaidPlan ? "Monthly limit" : "No limits on your plan"}
        />

        {/* Video Generations */}
        <UsageCard
          title="Video Generations"
          icon={<Video className="h-5 w-5 text-red-600" />}
          current={usageData?.limits.videoGenerations.used || 0}
          limit={usageData?.limits.videoGenerations.limit ?? null}
          percentage={usageData?.limits.videoGenerations.percentage || 0}
          description={
            isPaidPlan ? "Monthly limit (480p only)" : "No limits on your plan"
          }
        />

        {/* Web Searches */}
        <UsageCard
          title="Web Searches"
          icon={<Search className="h-5 w-5 text-orange-600" />}
          current={usageData?.limits.webSearches.used || 0}
          limit={usageData?.limits.webSearches.limit ?? null}
          percentage={usageData?.limits.webSearches.percentage || 0}
          description={isPaidPlan ? "Monthly limit" : "No limits on your plan"}
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Today&apos;s Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Cost:</span>
              <span>${usageData?.usage.today.cost.toFixed(4) || "0.0000"}</span>
            </div>
            <div className="flex justify-between">
              <span>API Calls:</span>
              <span>{usageData?.usage.today.apiCalls || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tokens:</span>
              <span>
                {usageData?.usage.today.tokens?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">This Month&apos;s Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Cost:</span>
              <span>
                ${usageData?.usage.thisMonth.cost.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>API Calls:</span>
              <span>{usageData?.usage.thisMonth.apiCalls || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tokens:</span>
              <span>
                {usageData?.usage.thisMonth.tokens?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Images Generated:</span>
              <span>{usageData?.usage.thisMonth.imageGenerations || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Videos Generated:</span>
              <span>{usageData?.usage.thisMonth.videoGenerations || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Web Searches:</span>
              <span>{usageData?.usage.thisMonth.webSearches || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
