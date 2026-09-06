import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordConsultation, listConsultationsForProject } from "@/db/gram-sabha";
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
  const consultations = await listConsultationsForProject(id);
  return NextResponse.json({ consultations });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "gram-sabha:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    village?: string;
    consultationDate?: string;
    attendanceCount?: number;
    minutes?: string;
    resolution?: string;
  };
  if (
    !body.village ||
    !body.consultationDate ||
    typeof body.attendanceCount !== "number" ||
    !body.minutes ||
    !body.resolution
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const consultationInput = {
    projectId: id,
    village: body.village,
    consultationDate: new Date(body.consultationDate),
    attendanceCount: body.attendanceCount,
    minutes: body.minutes,
    resolution: body.resolution,
    recordedBy: session.userId,
  };
  const consultationId = await recordConsultation(consultationInput);
  await recordAudit({
    actor: { userId: session.userId, role: session.role },
    action: "CREATE",
    entityType: "GRAM_SABHA",
    entityId: consultationId,
    projectId: id,
    summary: `Recorded the ${consultationInput.village} Gram Sabha consultation (${consultationInput.attendanceCount} attending)`,
    ip: clientIp(request),
    after: {
      village: consultationInput.village,
      consultationDate: consultationInput.consultationDate,
      attendanceCount: consultationInput.attendanceCount,
      resolution: consultationInput.resolution,
    },
  });
  return NextResponse.json({ id: consultationId }, { status: 201 });
}
