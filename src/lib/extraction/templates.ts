/**
 * The templates an officer downloads, generated from the same schema objects
 * the validator enforces.
 *
 * This is the "data standardization" scope item in the problem statement, and
 * generating rather than hand-writing these is the whole point: a template
 * kept in a separate file drifts from its validator, and then the platform is
 * rejecting files it told people to send.
 */

import type { RecordSchema } from "./types";

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * A blank template: the header row the validator expects, plus one worked
 * example row built from each field's own `example`.
 *
 * The example row is real data in the right shape rather than placeholder
 * text, because the fastest way to explain a format is to show one.
 */
export function buildTemplateCsv(schema: RecordSchema): string {
  const header = schema.fields.map((f) => csvCell(f.label)).join(",");
  const example = schema.fields.map((f) => csvCell(f.example)).join(",");
  return `${header}\n${example}\n`;
}

/**
 * The field guide that ships next to the template.
 *
 * Officers do not read schemas; they read a sheet that says which columns are
 * compulsory and what goes in them. Regenerated from the schema so it cannot
 * describe a format the validator does not accept.
 */
export function buildTemplateGuide(schema: RecordSchema): string {
  const lines: string[] = [];
  lines.push(`# ${schema.title} — upload template`);
  lines.push("");
  lines.push(`**Issued by:** ${schema.issuedBy}`);
  lines.push(`**Why it is on the file:** ${schema.basis}`);
  lines.push(`**One row per:** ${schema.rowNoun}`);
  lines.push("");
  lines.push(
    "Fill one row per " +
      schema.rowNoun +
      ". Column headings must match the names below; case, spacing and the listed alternate spellings are all accepted. Extra columns are kept but ignored."
  );
  lines.push("");
  lines.push("| Column | Required | What goes in it | Example |");
  lines.push("|---|---|---|---|");
  for (const field of schema.fields) {
    const aliases = field.aliases?.length
      ? ` _(also accepted: ${field.aliases.join(", ")})_`
      : "";
    const enumNote = field.enumValues?.length
      ? ` One of: ${field.enumValues.join(", ")}.`
      : "";
    lines.push(
      `| **${field.label}**${aliases} | ${field.required ? "Yes" : "No"} | ${field.description}${enumNote} | \`${field.example}\` |`
    );
  }
  lines.push("");
  lines.push("## Accepted file formats");
  lines.push("");
  lines.push(
    "`.csv`, `.xlsx`, `.docx`, and `.pdf` **with a text layer**. A scanned image — a photograph of a document, or a PDF that is only a picture of a page — cannot be read, and is rejected with that reason rather than guessed at. Export the digital extract from e-Sevai, or fill in this template."
  );
  lines.push("");
  lines.push("## How extents are read");
  lines.push("");
  lines.push(
    'A bare number is hectares. Any other unit must be named: `2.08 acres`, `37 cents`, `840 sqm`. The hectare-are-square metre form a chitta prints (`0-84-00`) is also read.'
  );
  if (schema.rules?.length) {
    lines.push("");
    lines.push("## Checks across the whole row");
    lines.push("");
    for (const rule of schema.rules) {
      lines.push(`- \`${rule.name}\``);
    }
  }
  return lines.join("\n") + "\n";
}

/** Filename for a downloaded template, stable and obvious in a downloads folder. */
export function templateFileName(schema: RecordSchema, extension: string): string {
  const slug = schema.category.toLowerCase().replace(/_/g, "-");
  return `tnglms-${slug}-template.${extension}`;
}
