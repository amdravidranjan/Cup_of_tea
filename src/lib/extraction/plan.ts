/**
 * Turning validated rows into a proposed change to the register.
 *
 * Nothing here writes. It works out, for every row, whether it would create a
 * record, update one already on the file, or collide with something that
 * needs a person to decide — and shows all of that before an officer commits.
 *
 * That review step is the point of the whole redesign. One village extract
 * can carry several hundred plots; committing them blind would be worse than
 * the per-plot upload it replaces, not better.
 */

import { polygonAreaHectares, type PolygonGeometry } from "@/lib/geo";
import { shoelaceHectares } from "./schemas";
import type { RecordSchema, ValidatedRow, ValidationSummary } from "./types";

export type RowOutcome =
  /** No such record on the project; committing creates it. */
  | "CREATE"
  /** Matches a record already on the file, and changes nothing. */
  | "UNCHANGED"
  /** Matches a record already on the file, and would change it. */
  | "UPDATE"
  /** The row is internally inconsistent or contradicts the register. */
  | "CONFLICT"
  /** Failed validation; cannot be committed at all. */
  | "INVALID";

export interface PlannedRow {
  rowNumber: number;
  outcome: RowOutcome;
  /** Survey number, patta number or name — how the row reads in a preview. */
  label: string;
  /** Secondary identification, e.g. the village. */
  detail: string;
  /** Canonical values, ready to write. */
  values: Record<string, unknown>;
  /** The existing record this row matched, if any. */
  matchedId: string | null;
  /** Fields this row would change on the matched record. */
  changes: { field: string; before: unknown; after: unknown }[];
  /** Why the row is a conflict or invalid, in plain words. */
  problems: string[];
}

export interface ExistingParcel {
  id: string;
  surveyNumber: string | null;
  village: string;
  areaHectares: number;
  landClassification: string | null;
}

export interface ExistingFamily {
  id: string;
  headOfHouseholdName: string;
  village: string;
  parcelId: string | null;
  /** Patta number lives on the parcel, so it is resolved in before planning. */
  pattaNumber: string | null;
}

export interface PlanContext {
  parcels: ExistingParcel[];
  families: ExistingFamily[];
}

export interface IntakePlan {
  schema: RecordSchema;
  method: string;
  rows: PlannedRow[];
  counts: Record<RowOutcome, number>;
  /** Required columns the file lacks. Nothing can be committed while non-empty. */
  missingHeaders: ValidationSummary["missingHeaders"];
  unknownHeaders: string[];
  warnings: string[];
}

function normalizeSurvey(value: unknown): string | null {
  return typeof value === "string" && value ? value.toUpperCase() : null;
}

/**
 * Builds the boundary polygon for a plot read off a survey sheet.
 *
 * The ring is closed here rather than demanding the officer repeat the first
 * point — every survey sheet lists corners once, and requiring the repeat
 * would reject correct files on a technicality.
 */
export function boundaryToPolygon(points: [number, number][]): PolygonGeometry {
  const ring = [...points];
  const [firstX, firstY] = ring[0];
  const [lastX, lastY] = ring[ring.length - 1];
  if (firstX !== lastX || firstY !== lastY) ring.push([firstX, firstY]);
  return { type: "Polygon", coordinates: [ring] };
}

export function planIntake(summary: ValidationSummary, context: PlanContext): IntakePlan {
  const yieldsParcel = summary.schema.yields.includes("PARCEL");
  const yieldsFamily = summary.schema.yields.includes("FAMILY");

  const parcelsBySurvey = new Map<string, ExistingParcel>();
  for (const parcel of context.parcels) {
    const key = normalizeSurvey(parcel.surveyNumber);
    if (key) parcelsBySurvey.set(key, parcel);
  }

  // Survey numbers seen earlier in this same file. A village extract that
  // lists one plot twice is a real and common mistake, and committing both
  // would silently double the extent the award is computed on.
  const seenInFile = new Map<string, number>();

  const rows: PlannedRow[] = summary.rows.map((row) =>
    planRow(row, summary.schema, { yieldsParcel, yieldsFamily, parcelsBySurvey, seenInFile, context })
  );

  const counts: Record<RowOutcome, number> = {
    CREATE: 0,
    UNCHANGED: 0,
    UPDATE: 0,
    CONFLICT: 0,
    INVALID: 0,
  };
  for (const row of rows) counts[row.outcome]++;

  return {
    schema: summary.schema,
    method: summary.method,
    rows,
    counts,
    missingHeaders: summary.missingHeaders,
    unknownHeaders: summary.unknownHeaders,
    warnings: summary.warnings,
  };
}

function planRow(
  row: ValidatedRow,
  schema: RecordSchema,
  ctx: {
    yieldsParcel: boolean;
    yieldsFamily: boolean;
    parcelsBySurvey: Map<string, ExistingParcel>;
    seenInFile: Map<string, number>;
    context: PlanContext;
  }
): PlannedRow {
  const values = row.values;
  const survey = normalizeSurvey(values.surveyNumber);
  const village = typeof values.village === "string" ? values.village : "";
  const label =
    survey ??
    (typeof values.pattaNumber === "string" ? `Patta ${values.pattaNumber}` : "");

  const base: PlannedRow = {
    rowNumber: row.rowNumber,
    outcome: "CREATE",
    label: label || `Row ${row.rowNumber}`,
    detail: village,
    values,
    matchedId: null,
    changes: [],
    problems: [],
  };

  if (row.issues.length > 0) {
    return {
      ...base,
      outcome: "INVALID",
      problems: row.issues.map((i) => `${i.label}: ${i.message}`),
    };
  }

  if (survey) {
    const duplicateOf = ctx.seenInFile.get(survey);
    if (duplicateOf !== undefined) {
      return {
        ...base,
        outcome: "CONFLICT",
        problems: [
          `Survey number ${survey} already appears in this file at row ${duplicateOf}. A plot cannot be registered twice.`,
        ],
      };
    }
    ctx.seenInFile.set(survey, row.rowNumber);
  }

  if (ctx.yieldsParcel) return planParcelRow(base, survey, ctx.parcelsBySurvey);
  if (ctx.yieldsFamily) return planFamilyRow(base, survey, ctx);

  // A category that yields no record is read for display and advisories only,
  // so every valid row is simply information rather than a pending write.
  return { ...base, outcome: "UNCHANGED" };
}

function planParcelRow(
  base: PlannedRow,
  survey: string | null,
  parcelsBySurvey: Map<string, ExistingParcel>
): PlannedRow {
  const values = base.values;
  const boundary = values.boundary as [number, number][] | undefined;
  const statedExtent = values.extent as number;

  const problems: string[] = [];
  if (boundary) {
    const polygon = boundaryToPolygon(boundary);
    const computed = polygonAreaHectares(polygon.coordinates[0]);
    // The schema already sanity-checked the stated extent against the
    // shoelace area. This second check uses the app's own geometry code, so
    // what gets written is what the map will draw.
    if (computed > 0 && (computed / statedExtent < 0.5 || computed / statedExtent > 2)) {
      problems.push(
        `The boundary encloses about ${computed.toFixed(4)} ha but the sheet states ${statedExtent} ha.`
      );
    }
  }

  const existing = survey ? parcelsBySurvey.get(survey) : undefined;
  if (!existing) {
    return {
      ...base,
      outcome: problems.length ? "CONFLICT" : "CREATE",
      problems,
    };
  }

  const changes: PlannedRow["changes"] = [];
  if (Math.abs(existing.areaHectares - statedExtent) > 0.0001) {
    changes.push({ field: "areaHectares", before: existing.areaHectares, after: statedExtent });
  }
  if (values.village && existing.village !== values.village) {
    changes.push({ field: "village", before: existing.village, after: values.village });
  }
  if (values.landClassification && existing.landClassification !== values.landClassification) {
    changes.push({
      field: "landClassification",
      before: existing.landClassification,
      after: values.landClassification,
    });
  }

  return {
    ...base,
    outcome: problems.length ? "CONFLICT" : changes.length ? "UPDATE" : "UNCHANGED",
    matchedId: existing.id,
    changes,
    problems,
  };
}

function planFamilyRow(
  base: PlannedRow,
  survey: string | null,
  ctx: { parcelsBySurvey: Map<string, ExistingParcel>; context: PlanContext }
): PlannedRow {
  const values = base.values;
  const name = values.holderName as string;
  const problems: string[] = [];

  // A patta names a survey number. If that plot is already on the project —
  // because its FMB sheet was read in first — the titleholder attaches to it.
  // That join is the entire reason the two documents are read together.
  const parcel = survey ? ctx.parcelsBySurvey.get(survey) : undefined;
  if (survey && !parcel) {
    problems.push(
      `No plot with survey number ${survey} is on this project yet. Read the FMB sheet for this village first, then this extract will attach the titleholder to the plot.`
    );
  }

  const existing = ctx.context.families.find(
    (f) =>
      f.headOfHouseholdName.toLowerCase() === name.toLowerCase() &&
      (parcel ? f.parcelId === parcel.id : f.village.toLowerCase() === String(values.village).toLowerCase())
  );

  // A plot that already has a titleholder, being claimed by someone else, is
  // a title conflict — the single most consequential thing a land record can
  // disagree about, because the award is paid to whoever is on it. Committing
  // it silently would attach two owners to one plot and leave the officer to
  // discover it at payment time.
  if (!existing && parcel) {
    const incumbent = ctx.context.families.find((f) => f.parcelId === parcel.id);
    if (incumbent) {
      problems.push(
        `Survey number ${survey} is already held by ${incumbent.headOfHouseholdName} on this project. Two different titleholders cannot be registered against one plot — resolve the title before committing this row.`
      );
    }
  }

  if (!existing) {
    return {
      ...base,
      label: survey ? `${name} — ${survey}` : name,
      outcome: problems.length ? "CONFLICT" : "CREATE",
      matchedId: parcel?.id ?? null,
      problems,
    };
  }

  return {
    ...base,
    label: survey ? `${name} — ${survey}` : name,
    outcome: "UNCHANGED",
    matchedId: existing.id,
    problems,
  };
}

/** Rows a commit would actually act on. */
export function committableRows(plan: IntakePlan): PlannedRow[] {
  return plan.rows.filter((r) => r.outcome === "CREATE" || r.outcome === "UPDATE");
}

export function planIsCommittable(plan: IntakePlan): boolean {
  return plan.missingHeaders.length === 0 && committableRows(plan).length > 0;
}

/** Area a parcel row would register, for the batch summary. */
export function totalPlannedHectares(plan: IntakePlan): number {
  return committableRows(plan).reduce((sum, row) => {
    const extent = row.values.extent;
    return sum + (typeof extent === "number" ? extent : 0);
  }, 0);
}

export { shoelaceHectares };
