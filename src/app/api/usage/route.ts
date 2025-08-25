import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { getUserUsageSummary, getSystemUsageStats } from "@/lib/ai/usage-tracker";
import { formatCost } from "@/lib/ai/cost-calculator";

export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'user';
    
    if (type === 'user') {
      // Get user's usage summary
      const summary = await getUserUsageSummary(session.user.id);
      
      return Response.json({
        total: {
          ...summary.total,
          totalCostFormatted: formatCost(summary.total.totalCost),
        },
        monthlyHistory: summary.monthlyHistory.map(month => ({
          ...month,
          totalCostUsd: Number(month.totalCostUsd),
          totalCostFormatted: formatCost(Number(month.totalCostUsd)),
          period: `${month.usageYear}-${month.usageMonth.toString().padStart(2, '0')}`,
        })),
        recentThreads: summary.recentThreads.map(thread => ({
          ...thread,
          totalCostUsd: Number(thread.totalCostUsd),
          totalCostFormatted: formatCost(Number(thread.totalCostUsd)),
        })),
      });
    }
    
    if (type === 'system') {
      // Only allow system stats for admin users (implement your admin check here)
      // For now, any authenticated user can see system stats
      const startDate = searchParams.get('startDate') 
        ? new Date(searchParams.get('startDate')!) 
        : undefined;
      const endDate = searchParams.get('endDate') 
        ? new Date(searchParams.get('endDate')!) 
        : undefined;
      
      const stats = await getSystemUsageStats(startDate, endDate);
      
      return Response.json({
        ...stats,
        totalCostFormatted: formatCost(stats.totalCost),
        avgCostPerUserFormatted: formatCost(stats.avgCostPerUser),
      });
    }
    
    return new Response("Invalid type parameter", { status: 400 });
  } catch (error) {
    console.error("Failed to get usage data:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}