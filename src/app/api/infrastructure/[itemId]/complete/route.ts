import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { completeInfrastructureItem, getInfrastructureItemById } from "@/db/infrastructure";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "infrastructure:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { itemId } = await params;
  const item = await getInfrastructureItemById(itemId);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(item.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await withAudit(
      {
        actor: { userId: session.userId, role: session.role },
        action: "STATUS_CHANGE",
        entityType: "INFRASTRUCTURE_ITEM",
        entityId: itemId,
        projectId: item.projectId,
        summary: `Marked infrastructure item "${item.item}" complete`,
        ip: clientIp(request),
        loadBefore: async () => ({ status: item.status, completedBy: item.completedBy ?? null }),
        loadAfter: async () => {
          const updated = await getInfrastructureItemById(itemId);
          return { status: updated?.status ?? null, completedBy: updated?.completedBy ?? null };
        },
      },
      () => completeInfrastructureItem(itemId, session.userId)
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
