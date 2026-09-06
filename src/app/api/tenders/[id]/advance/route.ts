import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { advanceTenderStatus, getTenderById, TENDER_STATUSES } from "@/db/tenders";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

const NEXT_STATUS: Record<string, string | undefined> = {
  AWARDED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "tender:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const tender = await getTenderById(id);
  if (!tender) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(tender.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const next = NEXT_STATUS[tender.status];
  if (!next) {
    return NextResponse.json({ error: `Cannot advance from ${tender.status}` }, { status: 400 });
  }
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "STATUS_CHANGE",
      entityType: "TENDER",
      entityId: id,
      projectId: tender.projectId,
      summary: `Tender "${tender.title}" moved from ${tender.status} to ${next}`,
      ip: clientIp(request),
      loadBefore: async () => ({ status: tender.status }),
      loadAfter: async () => ({ status: next }),
    },
    () => advanceTenderStatus(id, next as (typeof TENDER_STATUSES)[number])
  );
  return NextResponse.json({ status: next });
}
