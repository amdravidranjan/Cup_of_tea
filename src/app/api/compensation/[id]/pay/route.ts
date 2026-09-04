import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCompensationById, markCompensationPaid } from "@/db/compensation";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { hasActiveStay } from "@/db/legal-disputes";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "compensation:assess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const compensation = await getCompensationById(id);
  if (!compensation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(compensation.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (await hasActiveStay(compensation.projectId)) {
    return NextResponse.json(
      { error: "A court stay order is active on this project — compensation payment is blocked until it's cleared." },
      { status: 409 }
    );
  }
  await markCompensationPaid(id);
  return NextResponse.json({ ok: true });
}
