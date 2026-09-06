import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { applyProjectTransition, getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { recordAudit, withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import type { Action } from "@/lib/workflow";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:transition")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const existingProject = await getProject(id);
  if (!existingProject || !canViewProject(session, existingProject)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { action?: Action };
  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  try {
    const action = body.action;
    const stage = await withAudit(
      {
        actor: { userId: session.userId, role: session.role },
        action: "STAGE_TRANSITION",
        entityType: "PROJECT",
        entityId: id,
        projectId: id,
        summary: `${action} on "${existingProject.name}" from ${existingProject.stage}`,
        ip: clientIp(request),
        loadBefore: async () => ({ stage: existingProject.stage }),
        loadAfter: async () => ({ stage: (await getProject(id))?.stage ?? null }),
      },
      () => applyProjectTransition(id, action, session.userId, session.role)
    );
    return NextResponse.json({ stage });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
