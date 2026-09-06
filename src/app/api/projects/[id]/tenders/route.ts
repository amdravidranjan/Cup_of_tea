import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createTender, listTendersForProject } from "@/db/tenders";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { recordAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

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
  const tenders = await listTendersForProject(id);
  return NextResponse.json({ tenders });
}

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
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    title?: string;
    scope?: string;
    estimatedValue?: number;
    submissionDeadline?: string;
  };
  if (!body.title || !body.scope || typeof body.estimatedValue !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const tenderInput = {
    projectId: id,
    title: body.title,
    scope: body.scope,
    estimatedValue: body.estimatedValue,
    submissionDeadline: body.submissionDeadline ? new Date(body.submissionDeadline) : undefined,
    createdBy: session.userId,
  };
  const tenderId = await createTender(tenderInput);
  await recordAudit({
    actor: { userId: session.userId, role: session.role },
    action: "CREATE",
    entityType: "TENDER",
    entityId: tenderId,
    projectId: id,
    summary: `Published tender "${tenderInput.title}" at an estimated ${tenderInput.estimatedValue}`,
    ip: clientIp(request),
    after: {
      title: tenderInput.title,
      scope: tenderInput.scope,
      estimatedValue: tenderInput.estimatedValue,
      submissionDeadline: tenderInput.submissionDeadline ?? null,
      status: "PUBLISHED",
    },
  });
  return NextResponse.json({ id: tenderId }, { status: 201 });
}
