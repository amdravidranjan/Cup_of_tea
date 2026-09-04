import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getLegalDisputeById, updateLegalDispute, DISPUTE_STATUSES } from "@/db/legal-disputes";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

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
  const body = (await request.json()) as {
    status?: string;
    nextHearingDate?: string | null;
    outcome?: string;
  };
  if (body.status && !DISPUTE_STATUSES.includes(body.status as (typeof DISPUTE_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await updateLegalDispute(id, {
    status: body.status as (typeof DISPUTE_STATUSES)[number] | undefined,
    nextHearingDate:
      body.nextHearingDate === undefined
        ? undefined
        : body.nextHearingDate
          ? new Date(body.nextHearingDate)
          : null,
    outcome: body.outcome,
  });
  return NextResponse.json({ ok: true });
}
