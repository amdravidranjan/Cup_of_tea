import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  requestRehabService,
  listRehabServicesForProject,
  REHAB_SERVICE_TYPES,
} from "@/db/rehabilitation";
import { getFamilyById } from "@/db/families";
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
  const services = await listRehabServicesForProject(id);
  return NextResponse.json({ services });
}

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
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { familyId?: string; serviceType?: string; notes?: string };
  if (
    !body.familyId ||
    !body.serviceType ||
    !REHAB_SERVICE_TYPES.includes(body.serviceType as (typeof REHAB_SERVICE_TYPES)[number])
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  const family = await getFamilyById(body.familyId);
  if (!family || family.projectId !== id) {
    return NextResponse.json({ error: "Family not found on this project" }, { status: 404 });
  }
  const serviceId = await requestRehabService({
    familyId: body.familyId,
    projectId: id,
    serviceType: body.serviceType as (typeof REHAB_SERVICE_TYPES)[number],
    notes: body.notes,
  });
  return NextResponse.json({ id: serviceId }, { status: 201 });
}
