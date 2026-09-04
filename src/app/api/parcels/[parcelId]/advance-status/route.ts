import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { advanceParcelStatus, getParcel } from "@/db/parcels";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { hasActiveStay } from "@/db/legal-disputes";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ parcelId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "parcel:update-status")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { parcelId } = await params;
  const parcel = await getParcel(parcelId);
  if (!parcel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(parcel.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (await hasActiveStay(parcel.projectId)) {
    return NextResponse.json(
      { error: "A court stay order is active on this project — parcel possession is blocked until it's cleared." },
      { status: 409 }
    );
  }
  try {
    const status = await advanceParcelStatus(parcelId);
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
