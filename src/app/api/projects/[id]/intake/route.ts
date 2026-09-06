import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { createParcel, listParcels, updateParcel } from "@/db/parcels";
import { createFamily, listFamiliesForProject } from "@/db/families";
import { createDocument } from "@/db/documents";
import { saveFile } from "@/lib/storage";
import { recordAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import { parseFile, MAX_UPLOAD_BYTES } from "@/lib/extraction/parse";
import { UnreadableFileError } from "@/lib/extraction/types";
import { validateParsed, buildErrorReportCsv, describeSummary } from "@/lib/extraction/validate";
import { schemaFor } from "@/lib/extraction/schemas";
import {
  planIntake,
  boundaryToPolygon,
  committableRows,
  type IntakePlan,
  type PlannedRow,
} from "@/lib/extraction/plan";
import type { DocumentCategory } from "@/lib/document-categories";
import type { LandClassification, AffectedFamilyBasis } from "@/lib/land-records";

/**
 * Bulk intake: one village extract in, many records out.
 *
 * Two phases, deliberately separate. A POST previews — it reads, validates and
 * plans, and writes nothing. A second POST with `commit` applies the rows the
 * officer selected. Committing several hundred plots without showing what they
 * are first would be worse than the per-plot upload this replaces.
 *
 * The file is re-read on commit rather than trusting a plan posted back by the
 * browser. Same bytes in, same rows out — so what is written is provably what
 * was reviewed, and no boundary can be smuggled in by editing the preview.
 */
export async function POST(
  request: NextRequest,
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

  const form = await request.formData();
  const file = form.get("file");
  const category = form.get("category");
  const commit = form.get("commit") === "true";
  const selectedRaw = form.get("rows");

  if (!(file instanceof File) || typeof category !== "string") {
    return NextResponse.json({ error: "A file and a document category are required" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `${file.name} is larger than the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit.` },
      { status: 413 }
    );
  }

  const schema = schemaFor(category.toUpperCase());
  if (!schema) {
    return NextResponse.json(
      { error: "That document type carries no structured records, so there is nothing to read from it." },
      { status: 400 }
    );
  }

  const yieldsParcel = schema.yields.includes("PARCEL");
  const yieldsFamily = schema.yields.includes("FAMILY");
  if (yieldsParcel && !can(session.role, "project:geometry:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (yieldsFamily && !can(session.role, "family:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!yieldsParcel && !yieldsFamily && !can(session.role, "document:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let plan: IntakePlan;
  let errorReport: string;
  try {
    const parsed = await parseFile(buffer, file.name, file.type || "");
    const summary = validateParsed(parsed, schema);
    errorReport = buildErrorReportCsv(summary);

    const parcels = await listParcels(id);
    const families = await listFamiliesForProject(id);
    plan = planIntake(summary, {
      parcels: parcels.map((p) => ({
        id: p.id,
        surveyNumber: p.surveyNumber ?? null,
        village: p.village,
        areaHectares: p.areaHectares,
        landClassification: p.landClassification ?? null,
      })),
      families: families.map((f) => ({
        id: f.id,
        headOfHouseholdName: f.headOfHouseholdName,
        village: f.village,
        parcelId: f.parcelId ?? null,
        pattaNumber: parcels.find((p) => p.id === f.parcelId)?.pattaNumber ?? null,
      })),
    });
  } catch (err) {
    if (err instanceof UnreadableFileError) {
      // A rejection is a result, not a crash. The officer gets the reason and
      // the remedy, which is the whole difference from the old reader that
      // would have invented a record from this same file.
      return NextResponse.json(
        { rejected: true, fileName: file.name, reason: err.message, remedy: err.remedy },
        { status: 422 }
      );
    }
    throw err;
  }

  if (!commit) {
    return NextResponse.json({
      preview: true,
      fileName: file.name,
      summary: describeSummary({
        schema,
        method: plan.method,
        rows: [],
        unknownHeaders: plan.unknownHeaders,
        missingHeaders: plan.missingHeaders,
        warnings: plan.warnings,
      }),
      plan: serializePlan(plan),
      errorReport,
    });
  }

  /* ── Commit ─────────────────────────────────────────────────────────── */

  const selected = new Set<number>(
    typeof selectedRaw === "string" && selectedRaw
      ? (JSON.parse(selectedRaw) as number[])
      : committableRows(plan).map((r) => r.rowNumber)
  );

  if (plan.missingHeaders.length > 0) {
    return NextResponse.json(
      { error: "The file is missing required columns, so nothing can be committed." },
      { status: 400 }
    );
  }

  const toApply = committableRows(plan).filter((r) => selected.has(r.rowNumber));
  if (toApply.length === 0) {
    return NextResponse.json({ error: "No rows were selected to commit." }, { status: 400 });
  }

  // The source file is filed as a document first, so every record the batch
  // creates can point at the paperwork it came from. A parcel whose boundary
  // has no source document is a boundary nobody can defend.
  const { storagePath, sizeBytes } = await saveFile(buffer, {
    projectId: id,
    category,
    fileName: file.name,
  });
  const documentId = await createDocument({
    projectId: id,
    category: category as DocumentCategory,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes,
    storagePath,
    uploadedBy: session.userId,
  });

  const parcels = await listParcels(id);
  const parcelsBySurvey = new Map(
    parcels.filter((p) => p.surveyNumber).map((p) => [p.surveyNumber!.toUpperCase(), p])
  );

  const created: string[] = [];
  const updated: string[] = [];

  for (const row of toApply) {
    if (yieldsParcel) {
      const applied = await applyParcelRow(row, id, documentId, category, parcelsBySurvey);
      if (applied.createdId) created.push(applied.createdId);
      if (applied.updatedId) updated.push(applied.updatedId);
    } else if (yieldsFamily) {
      const familyId = await applyFamilyRow(row, id, documentId, session.userId, parcelsBySurvey);
      if (familyId) created.push(familyId);
    }
  }

  const noun = yieldsParcel ? "plot" : "titleholder";
  await recordAudit({
    actor: { userId: session.userId, role: session.role },
    action: "INGEST",
    entityType: "INGEST_BATCH",
    entityId: documentId,
    projectId: id,
    summary:
      `Read ${created.length + updated.length} ${noun}${created.length + updated.length === 1 ? "" : "s"} ` +
      `from ${file.name} (${created.length} new, ${updated.length} updated)`,
    ip: clientIp(request),
    after: {
      sourceDocumentId: documentId,
      sourceFileName: file.name,
      category,
      readVia: plan.method,
      rowsInFile: plan.rows.length,
      committed: toApply.map((r) => r.rowNumber),
      created: created.length,
      updated: updated.length,
      skippedInvalid: plan.counts.INVALID,
      skippedConflict: plan.counts.CONFLICT,
    },
  });

  return NextResponse.json({
    committed: true,
    documentId,
    created: created.length,
    updated: updated.length,
    skipped: plan.rows.length - toApply.length,
  });
}

async function applyParcelRow(
  row: PlannedRow,
  projectId: string,
  documentId: string,
  category: string,
  parcelsBySurvey: Map<string, { id: string }>
): Promise<{ createdId?: string; updatedId?: string }> {
  const values = row.values;
  const surveyNumber = values.surveyNumber as string;
  const extent = values.extent as number;
  const village = values.village as string;
  const landClassification = values.landClassification as LandClassification | undefined;

  const existing = parcelsBySurvey.get(surveyNumber.toUpperCase());
  if (existing) {
    await updateParcel(existing.id, {
      areaHectares: extent,
      village,
      landClassification: landClassification ?? undefined,
    });
    return { updatedId: existing.id };
  }

  const boundary = values.boundary as [number, number][];
  const parcelId = await createParcel({
    projectId,
    village,
    areaHectares: extent,
    status: "NOTIFIED",
    geometry: boundaryToPolygon(boundary),
    surveyNumber,
    // Where the line came from. A DGPS report is a survey run for this
    // acquisition; an FMB sheet is the historical cadastral record.
    boundaryMethod: category === "GPS_SURVEY_REPORT" ? "DGPS_SURVEY" : "FMB_SKETCH",
    sourceDocumentId: documentId,
    landClassification,
  });
  return { createdId: parcelId };
}

async function applyFamilyRow(
  row: PlannedRow,
  projectId: string,
  documentId: string,
  actorId: string,
  parcelsBySurvey: Map<string, { id: string; village: string }>
): Promise<string | null> {
  const values = row.values;
  const surveyNumber = values.surveyNumber as string | undefined;
  const parcel = surveyNumber ? parcelsBySurvey.get(surveyNumber.toUpperCase()) : undefined;

  return createFamily({
    projectId,
    parcelId: parcel?.id,
    headOfHouseholdName: values.holderName as string,
    village: parcel?.village ?? (values.village as string),
    category: (values.category as string) ?? "landowner",
    memberCount: (values.memberCount as number) ?? 1,
    vulnerableGroup: false,
    contactPhone: values.contactPhone as string | undefined,
    surveyedBy: actorId,
    // Read off a record of rights, not found by the SIA census. The
    // distinction matters: a land record only ever names titleholders.
    source: "LAND_RECORD",
    sourceDocumentId: documentId,
    entitlementBasis:
      (values.entitlementBasis as AffectedFamilyBasis | undefined) ?? "S3C_I_LANDOWNER",
    aadhaarMasked: values.aadhaarMasked as string | undefined,
    rationCardNumber: values.rationCardNumber as string | undefined,
  });
}

/** Trims the plan to what the preview table needs, keeping the payload small. */
function serializePlan(plan: IntakePlan) {
  return {
    category: plan.schema.category,
    title: plan.schema.title,
    rowNoun: plan.schema.rowNoun,
    method: plan.method,
    counts: plan.counts,
    missingHeaders: plan.missingHeaders,
    unknownHeaders: plan.unknownHeaders,
    warnings: plan.warnings,
    rows: plan.rows.map((row) => ({
      rowNumber: row.rowNumber,
      outcome: row.outcome,
      label: row.label,
      detail: row.detail,
      matchedId: row.matchedId,
      changes: row.changes,
      problems: row.problems,
      extent: typeof row.values.extent === "number" ? row.values.extent : null,
      holderName: typeof row.values.holderName === "string" ? row.values.holderName : null,
    })),
  };
}
