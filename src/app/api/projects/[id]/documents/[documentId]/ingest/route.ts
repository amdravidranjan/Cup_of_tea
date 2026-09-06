import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDocument } from "@/db/documents";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { createParcel, listParcels, setParcelPattaNumber } from "@/db/parcels";
import { createFamily, listFamiliesForProject } from "@/db/families";
import { extractDocumentFields } from "@/lib/ai/document-intelligence";
import { documentYields, type DocumentYield } from "@/lib/document-categories";
import { parseStoredGeometry } from "@/lib/geo";

/**
 * Turns an uploaded revenue record into an actual register entry.
 *
 * The extraction is re-run here rather than accepting the parcel or family
 * the browser previewed. Extraction is deterministic in the document id, so
 * the server independently reproduces exactly what the officer saw — which
 * means a boundary can never be smuggled in by posting a different polygon
 * than the one on screen.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, documentId } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await getDocument(documentId);
  if (!document || document.projectId !== id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { target?: string };
  const available = documentYields(document.category);
  if (available.length === 0) {
    return NextResponse.json(
      { error: "This document type does not contain records that can be registered" },
      { status: 400 }
    );
  }
  const target = (body.target ?? available[0]) as DocumentYield;
  if (!available.includes(target)) {
    return NextResponse.json(
      { error: `A ${document.category} document cannot produce a ${target.toLowerCase()}` },
      { status: 400 }
    );
  }

  const parcelList = await listParcels(id);
  if (parcelList.some((p) => p.sourceDocumentId === documentId)) {
    return NextResponse.json(
      { error: "This document has already been read into the register" },
      { status: 409 }
    );
  }

  const extraction = extractDocumentFields({
    documentId: document.id,
    fileName: document.fileName,
    category: document.category,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    projectName: project.name,
    projectPurpose: project.purpose,
    state: project.state,
    district: project.district,
    alignment: parseStoredGeometry(project.geometryType, project.geometryGeoJson),
    knownVillages: [...new Set(parcelList.map((p) => p.village))],
    knownSurveyNumbers: parcelList
      .map((p) => p.surveyNumber)
      .filter((s): s is string => Boolean(s)),
  });

  if (target === "PARCEL") {
    if (!can(session.role, "project:geometry:edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parcel = extraction.parcel;
    if (!parcel) {
      return NextResponse.json({ error: "No parcel could be read from this document" }, { status: 422 });
    }
    const parcelId = await createParcel({
      projectId: id,
      village: parcel.village,
      areaHectares: parcel.areaHectares,
      status: "NOTIFIED",
      geometry: parcel.geometry,
      surveyNumber: parcel.surveyNumber,
      boundaryMethod: parcel.boundaryMethod,
      sourceDocumentId: document.id,
      landClassification: parcel.landClassification,
    });
    return NextResponse.json(
      {
        target: "PARCEL",
        parcelId,
        surveyNumber: parcel.surveyNumber,
        village: parcel.village,
        areaHectares: parcel.areaHectares,
      },
      { status: 201 }
    );
  }

  if (!can(session.role, "family:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const family = extraction.family;
  if (!family) {
    return NextResponse.json({ error: "No household could be read from this document" }, { status: 422 });
  }

  const existingFamilies = await listFamiliesForProject(id);
  if (existingFamilies.some((f) => f.sourceDocumentId === documentId)) {
    return NextResponse.json(
      { error: "This document has already been read into the register" },
      { status: 409 }
    );
  }

  // A patta names a survey number. If the project already holds that plot —
  // because its FMB sheet was read in earlier — the titleholder is attached
  // to it, which is the whole point of reading the two documents together.
  const linkedParcel = parcelList.find((p) => p.surveyNumber === family.surveyNumber) ?? null;

  const familyId = await createFamily({
    projectId: id,
    parcelId: linkedParcel?.id,
    headOfHouseholdName: family.headOfHouseholdName,
    village: linkedParcel?.village ?? family.village,
    category: family.category,
    memberCount: family.memberCount,
    vulnerableGroup: family.vulnerableGroup,
    surveyedBy: session.userId,
    source: "LAND_RECORD",
    sourceDocumentId: document.id,
    entitlementBasis: family.entitlementBasis,
    aadhaarMasked: family.aadhaarMasked,
    rationCardNumber: family.rationCardNumber,
  });

  if (linkedParcel && !linkedParcel.pattaNumber) {
    await setParcelPattaNumber(linkedParcel.id, family.pattaNumber);
  }

  return NextResponse.json(
    {
      target: "FAMILY",
      familyId,
      headOfHouseholdName: family.headOfHouseholdName,
      linkedParcelId: linkedParcel?.id ?? null,
      linkedSurveyNumber: linkedParcel?.surveyNumber ?? null,
    },
    { status: 201 }
  );
}
