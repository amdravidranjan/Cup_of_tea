import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createParcel, deleteParcel, listParcels } from "@/db/parcels";
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
  const code = project.district.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "LND";
  const nextNumber = parcelList.length + 1;
  return NextResponse.json({
    parcels: withImpact,
    suggestedIdentifiers: {
      village: `${project.district} Revenue Village`,
      surveyNumber: `${code}/ACQ/${String(nextNumber).padStart(3, "0")}`,
      pattaNumber: `${code}-PTA-${String(10000 + nextNumber).padStart(5, "0")}`,
    },
  });
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
  const existingParcels = await listParcels(id);
  const districtCode = project.district.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "LND";
  const usedNumbers = existingParcels.flatMap((parcel) => {
    const matches = `${parcel.surveyNumber ?? ""} ${parcel.pattaNumber ?? ""}`.match(/\d+/g) ?? [];
    return matches.map(Number).filter((number) => Number.isFinite(number));
  });
  const nextNumber = Math.max(0, ...usedNumbers) + 1;
  const parcelInput = {
    projectId: id,
    village: body.village?.trim() || `${project.district} Revenue Village`,
    areaHectares: body.areaHectares,
    status: body.status,
    // A parcel with no survey number is not identifiable in a land record, so
    // these are accepted here and forwarded (createParcel already stored them;
    // this route was silently dropping whatever the editor sent).
    surveyNumber: body.surveyNumber?.trim() || `${districtCode}/ACQ/${String(nextNumber).padStart(3, "0")}`,
    pattaNumber: body.pattaNumber?.trim() || `${districtCode}-PTA-${String(10000 + nextNumber).padStart(5, "0")}`,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "project:geometry:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const parcelId = new URL(request.url).searchParams.get("parcelId");
  if (!parcelId) return NextResponse.json({ error: "parcelId is required" }, { status: 400 });
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parcel = (await listParcels(id)).find((item) => item.id === parcelId);
  if (!parcel) return NextResponse.json({ error: "Parcel not found" }, { status: 404 });
  await deleteParcel(parcelId);
  await recordAudit({
    actor: { userId: session.userId, role: session.role },
    action: "DELETE",
    entityType: "PARCEL",
    entityId: parcelId,
    projectId: id,
    summary: `Deleted parcel ${parcel.surveyNumber ?? parcelId}`,
    ip: clientIp(request),
    before: { village: parcel.village, surveyNumber: parcel.surveyNumber, pattaNumber: parcel.pattaNumber },
  });
  return NextResponse.json({ ok: true });
}
