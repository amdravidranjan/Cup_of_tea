import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createParcel, listParcels } from "@/db/parcels";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { recordAudit, withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import {
  computeParcelsWithImpact,
  parseStoredGeometry,
  type PolygonGeometry,
} from "@/lib/geo";
import { PARCEL_STATUSES, type ParcelStatus } from "@/lib/parcel-status";

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
  const alignment = parseStoredGeometry(project.geometryType, project.geometryGeoJson);
  const parcelList = await listParcels(id);
  const withImpact = computeParcelsWithImpact(alignment, parcelList);
  return NextResponse.json({ parcels: withImpact });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:geometry:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    village?: string;
    areaHectares?: number;
    status?: ParcelStatus;
    surveyNumber?: string;
    pattaNumber?: string;
    geometry?: { type?: string; coordinates?: unknown };
  };
  if (
    !body.village ||
    typeof body.areaHectares !== "number" ||
    !body.status ||
    !PARCEL_STATUSES.includes(body.status) ||
    body.geometry?.type !== "Polygon" ||
    !Array.isArray(body.geometry.coordinates)
  ) {
    return NextResponse.json({ error: "Invalid parcel" }, { status: 400 });
  }
  const parcelInput = {
    projectId: id,
    village: body.village,
    areaHectares: body.areaHectares,
    status: body.status,
    // A parcel with no survey number is not identifiable in a land record, so
    // these are accepted here and forwarded (createParcel already stored them;
    // this route was silently dropping whatever the editor sent).
    surveyNumber: body.surveyNumber?.trim() || undefined,
    pattaNumber: body.pattaNumber?.trim() || undefined,
    geometry: {
      type: "Polygon" as const,
      coordinates: body.geometry.coordinates as PolygonGeometry["coordinates"],
    },
  };
  const parcelId = await createParcel(parcelInput);
  await recordAudit({
    actor: { userId: session.userId, role: session.role },
    action: "CREATE",
    entityType: "PARCEL",
    entityId: parcelId,
    projectId: id,
    summary: `Added parcel ${parcelInput.surveyNumber ?? "(no survey number)"} in ${parcelInput.village}, ${parcelInput.areaHectares} ha`,
    ip: clientIp(request),
    after: {
      village: parcelInput.village,
      surveyNumber: parcelInput.surveyNumber ?? null,
      pattaNumber: parcelInput.pattaNumber ?? null,
      areaHectares: parcelInput.areaHectares,
      status: parcelInput.status,
    },
  });
  return NextResponse.json({ id: parcelId }, { status: 201 });
}
