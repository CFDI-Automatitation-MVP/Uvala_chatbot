import { getSession } from "@/lib/auth/supabase-auth";
import { getThreadUsageSummary } from "@/lib/ai/usage-tracker";
import { formatCost } from "@/lib/ai/cost-calculator";
import { chatRepository } from "@/lib/db/repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { threadId } = await params;

  try {
    // Check if user has access to this thread
    const thread = await chatRepository.selectThreadById(threadId);
    if (!thread || thread.userId !== session.user.id) {
      return new Response("Thread not found or access denied", { status: 404 });
    }

    const usage = await getThreadUsageSummary(threadId);
    
    return Response.json({
      summary: usage.summary ? {
        ...usage.summary,
        totalCostUsd: Number(usage.summary.totalCostUsd),
        totalCostFormatted: formatCost(Number(usage.summary.totalCostUsd)),
        toolCallsCostUsd: Number(usage.summary.toolCallsCostUsd),
        toolCallsCostFormatted: formatCost(Number(usage.summary.toolCallsCostUsd)),
      } : null,
      details: usage.details.map(detail => ({
        ...detail,
        inputCostUsd: Number(detail.inputCostUsd),
        outputCostUsd: Number(detail.outputCostUsd),
        cachedInputCostUsd: Number(detail.cachedInputCostUsd),
        reasoningCostUsd: Number(detail.reasoningCostUsd),
        totalCostUsd: Number(detail.totalCostUsd),
        toolCallsCostUsd: Number(detail.toolCallsCostUsd),
        inputCostFormatted: formatCost(Number(detail.inputCostUsd)),
        outputCostFormatted: formatCost(Number(detail.outputCostUsd)),
        totalCostFormatted: formatCost(Number(detail.totalCostUsd)),
        modelDisplayName: `${detail.modelProvider} ${detail.modelName}`,
      })),
    });
  } catch (error) {
    console.error("Failed to get thread usage:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}