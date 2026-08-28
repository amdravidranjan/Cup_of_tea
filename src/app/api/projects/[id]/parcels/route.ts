import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createParcel, listParcels } from "@/db/parcels";
import { getProject } from "@/db/projects";
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
  const alignment = project
    ? parseStoredGeometry(project.geometryType, project.geometryGeoJson)
    : null;
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
  const body = (await request.json()) as {
    village?: string;
    areaHectares?: number;
    status?: ParcelStatus;
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
  const parcelId = await createParcel({
    projectId: id,
    village: body.village,
    areaHectares: body.areaHectares,
    status: body.status,
    geometry: {
      type: "Polygon",
      coordinates: body.geometry.coordinates as PolygonGeometry["coordinates"],
    },
  });
  return NextResponse.json({ id: parcelId }, { status: 201 });
}
