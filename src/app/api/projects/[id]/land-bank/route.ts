import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { flagLandBankEntry, listLandBankForProject } from "@/db/land-bank";
import { getParcel } from "@/db/parcels";
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
  const entries = await listLandBankForProject(id);
  return NextResponse.json({ entries });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "land-bank:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { parcelId?: string; reason?: string; note?: string };
  if (!body.parcelId || !body.reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const parcel = await getParcel(body.parcelId);
  if (!parcel || parcel.projectId !== id) {
    return NextResponse.json({ error: "Parcel not found on this project" }, { status: 404 });
  }
  const entryId = await flagLandBankEntry({
    parcelId: body.parcelId,
    projectId: id,
    reason: body.reason,
    note: body.note,
    flaggedBy: session.userId,
  });
  return NextResponse.json({ id: entryId }, { status: 201 });
}
