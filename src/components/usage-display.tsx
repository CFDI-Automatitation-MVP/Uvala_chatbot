"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost } from "@/lib/ai/cost-calculator";

interface UsageSummary {
  total: {
    totalTokens: number;
    totalCost: number;
    apiCalls: number;
    toolCalls: number;
    totalCostFormatted: string;
  };
  monthlyHistory: Array<{
    usageMonth: number;
    usageYear: number;
    totalTokens: number;
    totalCostUsd: number;
    totalCostFormatted: string;
    apiCallsCount: number;
    period: string;
  }>;
  recentThreads: Array<{
    threadId: string;
    totalTokens: number;
    totalCostUsd: number;
    totalCostFormatted: string;
    apiCallsCount: number;
  }>;
}

export function UsageDisplay() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch('/api/usage?type=user');
        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Total Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Usage</CardTitle>
          <CardDescription>Your overall usage statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{usage.total.totalTokens.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{usage.total.totalCostFormatted}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{usage.total.apiCalls}</div>
              <div className="text-sm text-muted-foreground">API Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{usage.total.toolCalls}</div>
              <div className="text-sm text-muted-foreground">Tool Calls</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly History */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly History</CardTitle>
          <CardDescription>Usage breakdown by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {usage.monthlyHistory.length === 0 ? (
              <p className="text-muted-foreground">No usage data available</p>
            ) : (
              usage.monthlyHistory.map((month) => (
                <div key={month.period} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{month.period}</Badge>
                    <span>{month.totalTokens.toLocaleString()} tokens</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{month.apiCallsCount} calls</span>
                  </div>
                  <div className="font-semibold text-green-600">
                    {month.totalCostFormatted}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Threads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Usage for your recent conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {usage.recentThreads.length === 0 ? (
              <p className="text-muted-foreground">No conversation data available</p>
            ) : (
              usage.recentThreads.slice(0, 5).map((thread) => (
                <div key={thread.threadId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {thread.threadId.substring(0, 8)}...
                    </span>
                    <span>{thread.totalTokens.toLocaleString()} tokens</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{thread.apiCallsCount} calls</span>
                  </div>
                  <div className="font-semibold text-green-600">
                    {thread.totalCostFormatted}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}