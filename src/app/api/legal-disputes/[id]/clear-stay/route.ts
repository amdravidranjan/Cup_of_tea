import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { clearStay, getLegalDisputeById } from "@/db/legal-disputes";
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
  if (!can(session.role, "legal-dispute:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const dispute = await getLegalDisputeById(id);
  if (!dispute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(dispute.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "UPDATE",
      entityType: "LEGAL_DISPUTE",
      entityId: id,
      projectId: dispute.projectId,
      summary: `Cleared the court stay on case ${dispute.caseNumber} - compensation and possession unblocked`,
      reason: "Stay order lifted by the court",
      ip: clientIp(request),
      loadBefore: async () => ({ isStayOrder: dispute.isStayOrder, stayClearedAt: dispute.stayClearedAt ?? null }),
      loadAfter: async () => {
        const updated = await getLegalDisputeById(id);
        return { isStayOrder: updated?.isStayOrder ?? null, stayClearedAt: updated?.stayClearedAt ?? null };
      },
    },
    () => clearStay(id)
  );
  return NextResponse.json({ ok: true });
}
