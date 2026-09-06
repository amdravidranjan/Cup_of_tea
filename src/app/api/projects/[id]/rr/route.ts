import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getRRStage, getRRHistory, applyRRTransition } from "@/db/rr";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import type { RRAction } from "@/lib/rr-workflow";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [stage, history] = await Promise.all([getRRStage(id), getRRHistory(id)]);
  return NextResponse.json({ stage, history });
}

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
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { action?: RRAction; note?: string };
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
        summary: `R&R ${action} on "${project.name}" from ${project.rrStage ?? "not started"}`,
        reason: body.note ?? null,
        ip: clientIp(request),
        loadBefore: async () => ({ rrStage: project.rrStage ?? null }),
        loadAfter: async () => ({ rrStage: (await getProject(id))?.rrStage ?? null }),
      },
      () => applyRRTransition(id, action, session.userId, session.role, body.note)
    );
    return NextResponse.json({ stage });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
