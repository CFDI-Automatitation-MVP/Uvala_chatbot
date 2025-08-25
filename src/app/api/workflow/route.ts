import { getSession } from "@/lib/auth/supabase-auth";
import { workflowRepository } from "lib/db/repository";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const workflows = await workflowRepository.selectAll(session.user.id);
  return Response.json(workflows);
}

export async function POST(request: Request) {
  const {
    name,
    description,
    icon,
    id,
    isPublished,
    visibility,
    noGenerateInputNode,
  } = await request.json();

  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }  
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (id) {
    const hasAccess = await workflowRepository.checkAccess(
      id,
      session.user.id,
      false,
    );
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const workflow = await workflowRepository.save(
    {
      name,
      description,
      id,
      isPublished,
      visibility,
      icon,
      userId: session.user.id,
    },
    noGenerateInputNode,
  );

  return Response.json(workflow);
}
