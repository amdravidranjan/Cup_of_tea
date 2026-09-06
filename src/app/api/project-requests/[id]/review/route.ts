import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProjectRequestById, reviewProjectRequest } from "@/db/project-requests";
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
  if (!can(session.role, "project-request:review")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getProjectRequestById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.role === "state" && existing.state !== session.state) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.role === "district" && existing.district !== session.district) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    status?: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    reviewNote?: string;
    linkedProjectId?: string;
  };
  if (!body.status || !["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const nextStatus = body.status;
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: nextStatus === "APPROVED" ? "APPROVE" : nextStatus === "REJECTED" ? "REJECT" : "STATUS_CHANGE",
      entityType: "PROJECT_REQUEST",
      entityId: id,
      projectId: body.linkedProjectId ?? existing.linkedProjectId ?? null,
      summary: `Citizen project request ${existing.trackingNumber} moved to ${nextStatus}`,
      reason: body.reviewNote ?? null,
      ip: clientIp(request),
      loadBefore: async () => ({ status: existing.status, reviewNote: existing.reviewNote ?? null }),
      loadAfter: async () => ({ status: nextStatus, reviewNote: body.reviewNote ?? null }),
    },
    () =>
      reviewProjectRequest(id, {
        status: nextStatus,
        reviewNote: body.reviewNote,
        reviewedBy: session.userId,
        linkedProjectId: body.linkedProjectId,
      })
  );
  return NextResponse.json({ ok: true });
}
