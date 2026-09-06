/**
 * Applying a record grammar to what was parsed out of a file.
 *
 * Every rejection names the row, the column, what was found and what was
 * expected. That is the whole difference between "upload failed" and an
 * officer being able to fix their file without ringing anyone.
 */

import { coerceField } from "./coerce";
import type {
  FieldIssue,
  FieldSpec,
  ParseResult,
  RecordSchema,
  ValidatedRow,
  ValidationSummary,
} from "./types";

/**
 * Headings are matched loosely — case, spacing, punctuation and the common
 * alternate spellings all resolve to the same field. The strictness in this
 * module is about *values*; being pedantic about whether a column says
 * "Survey No" or "Survey Number" would only make real extracts fail for no
 * reason that helps anyone.
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[().]/g, "")
    .replace(/[\s_-]+/g, "");
}

function buildHeaderMap(
  schema: RecordSchema,
  headers: string[]
): { byField: Map<string, string>; unknown: string[] } {
  const lookup = new Map<string, string>();
  for (const field of schema.fields) {
    lookup.set(normalizeHeader(field.label), field.name);
    lookup.set(normalizeHeader(field.name), field.name);
    for (const alias of field.aliases ?? []) {
      lookup.set(normalizeHeader(alias), field.name);
    }
  }

  const byField = new Map<string, string>();
  const unknown: string[] = [];
  for (const header of headers) {
    const fieldName = lookup.get(normalizeHeader(header));
    if (fieldName && !byField.has(fieldName)) {
      byField.set(fieldName, header);
    } else if (!fieldName) {
      unknown.push(header);
    }
  }
  return { byField, unknown };
}

function makeRow(rowNumber: number, values: Record<string, unknown>, issues: FieldIssue[]): ValidatedRow {
  return {
    rowNumber,
    values,
    issues,
    get valid() {
      return this.issues.length === 0;
    },
  };
}

export function validateParsed(parsed: ParseResult, schema: RecordSchema): ValidationSummary {
  const { byField, unknown } = buildHeaderMap(schema, parsed.headers);

  const missingHeaders = schema.fields
    .filter((f) => f.required && !byField.has(f.name))
    .map((f) => ({ field: f.name, label: f.label, aliases: f.aliases ?? [] }));

  const rows: ValidatedRow[] = parsed.rows.map((raw) => {
    const values: Record<string, unknown> = {};
    const issues: FieldIssue[] = [];

    for (const spec of schema.fields) {
      const header = byField.get(spec.name);
      const cell = header ? (raw.cells[header] ?? "") : "";

      if (!cell.trim()) {
        if (spec.required) {
          issues.push({
            field: spec.name,
            label: spec.label,
            found: header ? "(blank)" : "(column not in the file)",
            message: header
              ? `${spec.label} is required and this row leaves it blank`
              : `${spec.label} is required and the file has no such column`,
            expected: spec.description,
          });
        }
        continue;
      }

      const result = coerceField(cell, spec);
      if (result.ok) {
        values[spec.name] = result.value;
      } else {
        issues.push({
          field: spec.name,
          label: spec.label,
          found: cell,
          message: result.message,
          expected: result.expected,
        });
      }
    }

    // Cross-field rules run only over what parsed cleanly. A rule comparing
    // extent against boundary has nothing to say when the extent itself was
    // unreadable, and reporting it twice would bury the real error.
    for (const rule of schema.rules ?? []) {
      const message = rule.check(values);
      if (message) {
        issues.push({
          field: rule.name,
          label: "Row",
          found: "(this row as a whole)",
          message,
          expected: "the fields in this row to agree with each other",
        });
      }
    }

    return makeRow(raw.rowNumber, values, issues);
  });

  return {
    schema,
    method: parsed.method,
    rows,
    unknownHeaders: unknown,
    missingHeaders,
    warnings: parsed.warnings,
  };
}

/* ── Error report ─────────────────────────────────────────────────────── */

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * The rejected rows as a CSV an officer can open next to their own file.
 *
 * Row numbers are the ones the spreadsheet shows, so "row 14" means row 14.
 */
export function buildErrorReportCsv(summary: ValidationSummary): string {
  const lines = ["Row,Column,Found,Problem,Expected"];
  for (const missing of summary.missingHeaders) {
    lines.push(
      [
        "(whole file)",
        missing.label,
        "(column not present)",
        `The file has no ${missing.label} column, which is required`,
        missing.aliases.length
          ? `a column headed "${missing.label}" (or ${missing.aliases.map((a) => `"${a}"`).join(", ")})`
          : `a column headed "${missing.label}"`,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  for (const row of summary.rows) {
    for (const issue of row.issues) {
      lines.push(
        [String(row.rowNumber), issue.label, issue.found, issue.message, issue.expected]
          .map(csvCell)
          .join(",")
      );
    }
  }
  return lines.join("\n");
}

/** A one-line human summary, for a toast or a log entry. */
export function describeSummary(summary: ValidationSummary): string {
  const total = summary.rows.length;
  const valid = summary.rows.filter((r) => r.issues.length === 0).length;
  if (summary.missingHeaders.length > 0) {
    const names = summary.missingHeaders.map((m) => m.label).join(", ");
    return `The file is missing required columns: ${names}. Nothing can be read until they are present.`;
  }
  if (total === 0) return "The file has a header row but no data rows.";
  if (valid === total) return `All ${total} rows read cleanly.`;
  return `${valid} of ${total} rows read cleanly; ${total - valid} need correction.`;
}

export function fieldByName(schema: RecordSchema, name: string): FieldSpec | undefined {
  return schema.fields.find((f) => f.name === name);
}
