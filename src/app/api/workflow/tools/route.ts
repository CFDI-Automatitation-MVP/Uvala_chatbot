import { getSession } from "@/lib/auth/supabase-auth";
import { workflowRepository } from "lib/db/repository";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
  );
  return Response.json(workflows);
}
