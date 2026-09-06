import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getRehabServiceById, updateRehabService, REHAB_STATUSES } from "@/db/rehabilitation";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "rehabilitation:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const service = await getRehabServiceById(id);
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(service.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { status?: string; scheduledDate?: string };
  if (!body.status || !REHAB_STATUSES.includes(body.status as (typeof REHAB_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const update = {
    status: body.status as (typeof REHAB_STATUSES)[number],
    scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
    completedDate: body.status === "COMPLETED" ? new Date() : undefined,
    facilitatedBy: session.userId,
  };
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "STATUS_CHANGE",
      entityType: "REHABILITATION_SERVICE",
      entityId: id,
      projectId: service.projectId,
      summary: `${service.serviceType} for family ${service.familyId} moved from ${service.status} to ${update.status}`,
      ip: clientIp(request),
      loadBefore: async () => ({
        status: service.status,
        scheduledDate: service.scheduledDate ?? null,
        completedDate: service.completedDate ?? null,
      }),
      loadAfter: async () => {
        const updated = await getRehabServiceById(id);
        return {
          status: updated?.status ?? null,
          scheduledDate: updated?.scheduledDate ?? null,
          completedDate: updated?.completedDate ?? null,
        };
      },
    },
    () => updateRehabService(id, update)
  );
  return NextResponse.json({ ok: true });
}
