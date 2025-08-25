"use server";
import { getSession } from "@/lib/auth/supabase-auth";
import { workflowRepository } from "lib/db/repository";

export async function selectExecuteAbilityWorkflowsAction() {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
  );
  return workflows;
}
