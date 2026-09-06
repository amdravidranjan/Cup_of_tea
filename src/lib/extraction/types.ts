/**
 * The shape of a readable land record.
 *
 * This replaces the previous "AI document reader", which derived every value
 * from a hash of the document id and never opened the file. What is here
 * instead is a declared grammar per document category: which fields a record
 * must carry, what each one may contain, and what makes a row invalid.
 *
 * One schema drives three things that must never disagree:
 *   1. the parser, which reads a file into rows
 *   2. the validator, which accepts or rejects each row with a reason
 *   3. the downloadable template an officer fills in
 *
 * Generating the template from the same object the validator enforces is the
 * point. A template that can drift from its validator is worse than none —
 * it teaches officers a format the system will then reject.
 */

import type { DocumentCategory, DocumentYield } from "@/lib/document-categories";

export type FieldKind =
  | "text"
  | "integer"
  | "decimal"
  | "extent"
  | "surveyNumber"
  | "pattaNumber"
  | "date"
  | "enum"
  | "aadhaar"
  | "phone"
  | "email"
  | "boolean"
  | "coordinates";

export interface FieldSpec {
  /** Canonical key on the parsed record. */
  name: string;
  /** Column heading in the template, and how the field is named in errors. */
  label: string;
  kind: FieldKind;
  required: boolean;
  /** What the field means, in an officer's terms. Shown in the template. */
  description: string;
  /** A realistic value. Fills the template's worked example row. */
  example: string;
  /**
   * Other spellings of the heading that are accepted. Real extracts come out
   * of e-Sevai, taluk spreadsheets and departmental exports with different
   * column names for the same thing; rejecting a file because a heading says
   * "Survey No" instead of "Survey Number" would be pedantry, not strictness.
   */
  aliases?: string[];
  enumValues?: readonly string[];
  /** For numeric kinds, after coercion to the canonical unit. */
  min?: number;
  max?: number;
}

/** A constraint spanning more than one field in the same row. */
export interface RowRule {
  name: string;
  /** Returns an error message when the row breaks the rule, else null. */
  check: (row: Record<string, unknown>) => string | null;
}

export interface RecordSchema {
  category: DocumentCategory;
  title: string;
  /** The office that issues this record in Tamil Nadu. */
  issuedBy: string;
  /** What one row represents, e.g. "plot" or "titleholder". */
  rowNoun: string;
  /** Why the document is on the file — the statutory or administrative hook. */
  basis: string;
  fields: FieldSpec[];
  rules?: RowRule[];
  yields: DocumentYield[];
}

/* ── Parsing ──────────────────────────────────────────────────────────── */

/** One row as read out of a file, before any validation. */
export interface RawRow {
  /** 1-based, and counted as the officer sees it — the header is row 1. */
  rowNumber: number;
  /** Keyed by the heading exactly as it appeared in the file. */
  cells: Record<string, string>;
}

export interface ParseResult {
  rows: RawRow[];
  /** Headings found in the file, in order. */
  headers: string[];
  /** How the file was read, for display: "CSV", "XLSX sheet 1", … */
  method: string;
  /** Non-fatal observations — a skipped blank row, a merged cell. */
  warnings: string[];
}

/**
 * A file that cannot be read at all, with the reason stated plainly.
 *
 * Rejection is a feature. The old reader would happily "extract" a
 * titleholder from a blank file; this one says why it cannot, and what to
 * send instead.
 */
export class UnreadableFileError extends Error {
  constructor(
    message: string,
    /** What the officer should do about it. */
    readonly remedy: string
  ) {
    super(message);
    this.name = "UnreadableFileError";
  }
}

/* ── Validation ───────────────────────────────────────────────────────── */

export interface FieldIssue {
  field: string;
  label: string;
  /** What was actually in the cell, verbatim. */
  found: string;
  /** Why it was not accepted, in plain words. */
  message: string;
  /** What a valid value looks like. */
  expected: string;
}

export interface ValidatedRow {
  rowNumber: number;
  /** Coerced, canonical values. Present even when the row has issues, for
   *  the fields that did parse — a preview should show what it could read. */
  values: Record<string, unknown>;
  issues: FieldIssue[];
  get valid(): boolean;
}

export interface ValidationSummary {
  schema: RecordSchema;
  method: string;
  rows: ValidatedRow[];
  /** Headings the file had that the schema does not know. Kept, not fatal. */
  unknownHeaders: string[];
  /** Required columns entirely absent from the file. Fatal for every row. */
  missingHeaders: { field: string; label: string; aliases: string[] }[];
  warnings: string[];
}

export function summaryCounts(summary: ValidationSummary): {
  total: number;
  valid: number;
  invalid: number;
} {
  const total = summary.rows.length;
  const valid = summary.rows.filter((r) => r.issues.length === 0).length;
  return { total, valid, invalid: total - valid };
}
