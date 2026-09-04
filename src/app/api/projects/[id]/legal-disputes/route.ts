import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createLegalDispute, listLegalDisputesForProject } from "@/db/legal-disputes";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

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
  const disputes = await listLegalDisputesForProject(id);
  return NextResponse.json({ disputes });
}

interface CreateBody {
  caseNumber?: string;
  court?: string;
  title?: string;
  partyName?: string;
  filedDate?: string;
  nextHearingDate?: string;
  summary?: string;
  isStayOrder?: boolean;
}

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
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as CreateBody;
  if (!body.caseNumber || !body.court || !body.title || !body.filedDate || !body.summary) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const disputeId = await createLegalDispute({
    projectId: id,
    caseNumber: body.caseNumber,
    court: body.court,
    title: body.title,
    partyName: body.partyName,
    filedDate: new Date(body.filedDate),
    nextHearingDate: body.nextHearingDate ? new Date(body.nextHearingDate) : undefined,
    summary: body.summary,
    isStayOrder: body.isStayOrder ?? false,
    createdBy: session.userId,
  });
  return NextResponse.json({ id: disputeId }, { status: 201 });
}
