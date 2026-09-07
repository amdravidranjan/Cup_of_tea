/**
 * What happens when a judge uploads something we did not plan for.
 *
 * The document reader in `document-intelligence.ts` assumes it is being handed
 * a real revenue record in a category an officer already chose. At a demo
 * table that assumption breaks in the first thirty seconds: someone uploads a
 * holiday photo, a 40 MB scan, a `.zip`, a file called `test test test.pdf`, or
 * a password-protected PDF, and they do it precisely to see what breaks.
 *
 * So every upload is triaged before it is read. Triage answers three questions
 * and nothing else:
 *
 *  1. **Can anything be read out of this at all?** A `.exe` is not a document.
 *  2. **How confident are we allowed to be?** A photograph of a page has a
 *     genuinely lower ceiling than a PDF with a text layer, and saying so is
 *     the honest position NOVELTY.md commits to — "explicit confidence on
 *     text-layer docs, and a stated reason for low confidence when the PDF is
 *     scanned".
 *  3. **What should the officer do now?** Never a dead end. Every outcome has
 *     a next action, including the outcomes that are refusals.
 *
 * The one thing triage never does is guess. A rejected file gets a sentence
 * explaining the rejection, not a plausible-looking extraction — a system that
 * invents a survey number off a picture of a cat is worse than one that says
 * it cannot read pictures of cats.
 */

import { describe, toSafeText, type InputNote, note } from "@/lib/ai/input-guard";

export type TriageOutcome =
  | "TEXT_LAYER_PDF"
  | "OFFICE_DOCUMENT"
  | "SPREADSHEET"
  | "PLAIN_TEXT"
  | "SCANNED_IMAGE"
  | "IMAGE_ONLY_PDF"
  | "ENCRYPTED"
  | "EMPTY_FILE"
  | "OVERSIZE"
  | "EXTENSION_MISMATCH"
  | "UNSUPPORTED_TYPE"
  | "UNKNOWN";

export interface TriageResult {
  outcome: TriageOutcome;
  /** Short heading for the notice, e.g. "Scanned image". */
  label: string;
  labelTamil: string;
  /** Why this outcome, in a sentence a citizen could read. */
  reason: string;
  reasonTamil: string;
  /** Whether structured fields can be pulled out of it at all. */
  canExtract: boolean;
  /** Upper bound on any confidence figure shown for this file. 0–1. */
  confidenceCeiling: number;
  /** What to do next. Always present, including on refusals. */
  nextAction: string;
  severity: "ok" | "degraded" | "blocked";
  /** The extraction method label shown to the user. */
  method: string;
}

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — above any real revenue record

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/tiff", "image/webp", "image/heic", "image/bmp", "image/gif"];
const OFFICE_MIMES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
];
const SPREADSHEET_MIMES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
];
const UNSUPPORTED_MIMES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-msdownload",
  "application/x-executable",
  "application/octet-stream",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
];

function extensionOf(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return match ? match[1] : "";
}

const EXTENSION_MIME_GROUP: Record<string, string> = {
  pdf: "pdf",
  jpg: "image",
  jpeg: "image",
  png: "image",
  tif: "image",
  tiff: "image",
  webp: "image",
  heic: "image",
  doc: "office",
  docx: "office",
  odt: "office",
  csv: "sheet",
  xls: "sheet",
  xlsx: "sheet",
  ods: "sheet",
  txt: "text",
  md: "text",
  zip: "archive",
  rar: "archive",
  exe: "binary",
  mp4: "media",
  mp3: "media",
};

function mimeGroup(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (IMAGE_MIMES.includes(mimeType)) return "image";
  if (OFFICE_MIMES.includes(mimeType)) return "office";
  if (SPREADSHEET_MIMES.includes(mimeType)) return "sheet";
  if (mimeType.startsWith("text/")) return "text";
  if (UNSUPPORTED_MIMES.includes(mimeType)) return "archive";
  return "";
}

export interface TriageInput {
  fileName: unknown;
  mimeType: unknown;
  sizeBytes: unknown;
  /** Set by the client PDF probe when a PDF turned out to have no text layer. */
  hasTextLayer?: boolean | null;
  /** Set when a PDF asked for a password. */
  encrypted?: boolean | null;
}

/**
 * Classify an upload. Takes `unknown` for every field because this runs on
 * whatever a form posted, and a missing `sizeBytes` must not become `NaN`
 * flowing into a size comparison.
 */
export function triageUpload(raw: TriageInput): { result: TriageResult; notes: InputNote[] } {
  const notes: InputNote[] = [];

  const nameSafe = toSafeText(raw.fileName, 260);
  const fileName = nameSafe.value || "(unnamed file)";
  notes.push(...nameSafe.notes);
  if (!nameSafe.value) {
    notes.push(note("File name", raw.fileName, "No file name was received.", "info"));
  }

  const mimeSafe = toSafeText(raw.mimeType, 120);
  const mimeType = mimeSafe.value.toLowerCase();

  let sizeBytes = typeof raw.sizeBytes === "number" ? raw.sizeBytes : Number(raw.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    notes.push(
      note("File size", raw.sizeBytes, "Size not reported — size checks were skipped.", "info")
    );
    sizeBytes = -1;
  }

  const extension = extensionOf(fileName);
  const extGroup = EXTENSION_MIME_GROUP[extension] ?? "";
  const declaredGroup = mimeGroup(mimeType);

  // Order matters. Hard blocks first, so a 0-byte `.exe` is reported as an
  // unsupported type rather than as an empty document.
  if (sizeBytes === 0) {
    return { result: EMPTY_FILE, notes };
  }
  if (raw.encrypted === true) {
    return { result: ENCRYPTED, notes };
  }
  if (extGroup === "archive" || extGroup === "binary" || extGroup === "media" || declaredGroup === "archive") {
    return {
      result: {
        ...UNSUPPORTED_TYPE,
        reason: `A ${extension ? `.${extension}` : mimeType || "file of this type"} is not a document this system can read. Nothing was extracted from it, and nothing was guessed.`,
      },
      notes,
    };
  }
  if (sizeBytes > MAX_BYTES) {
    return {
      result: {
        ...OVERSIZE,
        reason: `This file is ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB. Files above 25 MB are not read, because a revenue record is never this large and reading it would stall the page.`,
      },
      notes,
    };
  }
  if (declaredGroup && extGroup && declaredGroup !== extGroup) {
    return {
      result: {
        ...EXTENSION_MISMATCH,
        reason: `The file is named .${extension} but its contents are ${mimeType}. It was read as ${mimeType}, because the contents are what matter — the name is only a label.`,
      },
      notes,
    };
  }

  const group = declaredGroup || extGroup;

  if (group === "pdf") {
    if (raw.hasTextLayer === false) return { result: IMAGE_ONLY_PDF, notes };
    return { result: TEXT_LAYER_PDF, notes };
  }
  if (group === "image") return { result: SCANNED_IMAGE, notes };
  if (group === "office") return { result: OFFICE_DOCUMENT, notes };
  if (group === "sheet") return { result: SPREADSHEET, notes };
  if (group === "text") return { result: PLAIN_TEXT, notes };

  notes.push(
    note(
      "File type",
      describe(raw.mimeType),
      "Type could not be determined from either the name or the contents.",
      "info"
    )
  );
  return { result: UNKNOWN_TYPE, notes };
}

/* ── The outcome table ───────────────────────────────────────────────── */

const TEXT_LAYER_PDF: TriageResult = {
  outcome: "TEXT_LAYER_PDF",
  label: "PDF with a text layer",
  labelTamil: "உரை அடுக்குடன் கூடிய PDF",
  reason:
    "This PDF carries selectable text, so fields are read directly from the document rather than guessed from a picture of it.",
  reasonTamil:
    "இந்த PDF-இல் தேர்ந்தெடுக்கக்கூடிய உரை உள்ளது, எனவே தகவல்கள் நேரடியாக ஆவணத்திலிருந்து படிக்கப்படுகின்றன.",
  canExtract: true,
  confidenceCeiling: 0.97,
  nextAction: "Review the extracted fields below and confirm the ingest.",
  severity: "ok",
  method: "Text-layer extraction",
};

const OFFICE_DOCUMENT: TriageResult = {
  outcome: "OFFICE_DOCUMENT",
  label: "Word document",
  labelTamil: "Word ஆவணம்",
  reason: "Text is read from the document body. Tables are read; embedded images are not.",
  reasonTamil:
    "ஆவணத்தின் உரை படிக்கப்படுகிறது. அட்டவணைகள் படிக்கப்படும்; உள்ளடங்கிய படங்கள் படிக்கப்படாது.",
  canExtract: true,
  confidenceCeiling: 0.94,
  nextAction: "Review the extracted fields. If a value came from an image inside the file, enter it by hand.",
  severity: "ok",
  method: "Document body extraction",
};

const SPREADSHEET: TriageResult = {
  outcome: "SPREADSHEET",
  label: "Spreadsheet",
  labelTamil: "விரிதாள்",
  reason:
    "A spreadsheet is treated as a bulk record upload rather than a single document — one row per parcel or household.",
  reasonTamil:
    "விரிதாள் ஒரு மொத்த பதிவேற்றமாக கருதப்படுகிறது — ஒரு வரிசைக்கு ஒரு நிலப்பகுதி அல்லது குடும்பம்.",
  canExtract: true,
  confidenceCeiling: 0.99,
  nextAction: "Use the bulk intake panel, which validates every row and shows what each one would change before anything is written.",
  severity: "ok",
  method: "Tabular row validation",
};

const PLAIN_TEXT: TriageResult = {
  outcome: "PLAIN_TEXT",
  label: "Plain text file",
  labelTamil: "எளிய உரை கோப்பு",
  reason: "Read as text. There is no layout or table structure to work from, so only labelled values are found.",
  reasonTamil: "உரையாக படிக்கப்படுகிறது. அமைப்பு இல்லாததால் பெயரிடப்பட்ட மதிப்புகள் மட்டுமே கிடைக்கும்.",
  canExtract: true,
  confidenceCeiling: 0.88,
  nextAction: "Check each field — a text file has no structure to cross-check a value against.",
  severity: "degraded",
  method: "Text-layer extraction",
};

const SCANNED_IMAGE: TriageResult = {
  outcome: "SCANNED_IMAGE",
  label: "Scanned image",
  labelTamil: "ஸ்கேன் செய்யப்பட்ட படம்",
  reason:
    "This is a photograph or scan, not a document with a text layer. No character recognition runs here, so no field is read off the image — the record is prepared from the document category and the project's own data, and every value must be checked against the paper.",
  reasonTamil:
    "இது ஒரு படம் — உரை அடுக்கு இல்லை. படத்திலிருந்து எந்த தகவலும் படிக்கப்படவில்லை; ஒவ்வொரு மதிப்பையும் அசல் ஆவணத்துடன் ஒப்பிட்டு சரிபார்க்க வேண்டும்.",
  canExtract: true,
  confidenceCeiling: 0.78,
  nextAction:
    "Confirm each field against the paper record before committing. If a digital extract exists on e-Sevai, upload that instead — it reads without this caveat.",
  severity: "degraded",
  method: "Category template (no character recognition)",
};

const IMAGE_ONLY_PDF: TriageResult = {
  outcome: "IMAGE_ONLY_PDF",
  label: "PDF with no text layer",
  labelTamil: "உரை அடுக்கு இல்லாத PDF",
  reason:
    "This PDF is a picture of a page rather than a document — it has no selectable text. That is the single most common reason a confidence figure here is low, and it is a property of the file, not of the reader.",
  reasonTamil:
    "இந்த PDF ஒரு பக்கத்தின் படம் மட்டுமே; தேர்ந்தெடுக்கக்கூடிய உரை இல்லை. இதனால் நம்பகத்தன்மை குறைவாக உள்ளது.",
  canExtract: true,
  confidenceCeiling: 0.78,
  nextAction:
    "Re-export the document from e-Sevai or the issuing office as a digital PDF, or enter the fields by hand and keep this file as the attachment.",
  severity: "degraded",
  method: "Category template (no text layer found)",
};

const ENCRYPTED: TriageResult = {
  outcome: "ENCRYPTED",
  label: "Password-protected file",
  labelTamil: "கடவுச்சொல் பாதுகாக்கப்பட்ட கோப்பு",
  reason:
    "The file is encrypted. It is stored on the project file as an attachment, but nothing can be read out of it.",
  reasonTamil:
    "கோப்பு பாதுகாக்கப்பட்டுள்ளது. இணைப்பாக சேமிக்கப்படும், ஆனால் உள்ளடக்கம் படிக்க முடியாது.",
  canExtract: false,
  confidenceCeiling: 0,
  nextAction: "Upload an unprotected copy, or enter the fields by hand and keep this file attached.",
  severity: "blocked",
  method: "Not read",
};

const EMPTY_FILE: TriageResult = {
  outcome: "EMPTY_FILE",
  label: "Empty file",
  labelTamil: "காலியான கோப்பு",
  reason: "The file has no contents — zero bytes. This usually means the upload was interrupted.",
  reasonTamil: "கோப்பில் உள்ளடக்கம் இல்லை. பதிவேற்றம் இடையில் நின்றிருக்கலாம்.",
  canExtract: false,
  confidenceCeiling: 0,
  nextAction: "Try the upload again.",
  severity: "blocked",
  method: "Not read",
};

const OVERSIZE: TriageResult = {
  outcome: "OVERSIZE",
  label: "File too large",
  labelTamil: "கோப்பு மிகப் பெரியது",
  reason: "Files above 25 MB are not read.",
  reasonTamil: "25 MB-க்கு மேல் உள்ள கோப்புகள் படிக்கப்படாது.",
  canExtract: false,
  confidenceCeiling: 0,
  nextAction:
    "Split the document, or re-export it at a lower scan resolution — 300 dpi is enough for a revenue record.",
  severity: "blocked",
  method: "Not read",
};

const EXTENSION_MISMATCH: TriageResult = {
  outcome: "EXTENSION_MISMATCH",
  label: "Name and contents disagree",
  labelTamil: "பெயரும் உள்ளடக்கமும் பொருந்தவில்லை",
  reason: "The file extension does not match the actual contents.",
  reasonTamil: "கோப்பின் பெயர் அதன் உள்ளடக்கத்துடன் பொருந்தவில்லை.",
  canExtract: true,
  confidenceCeiling: 0.7,
  nextAction: "Check this is the file you meant to upload before confirming anything read from it.",
  severity: "degraded",
  method: "Read by contents, not by name",
};

const UNSUPPORTED_TYPE: TriageResult = {
  outcome: "UNSUPPORTED_TYPE",
  label: "Not a document",
  labelTamil: "ஆவணம் அல்ல",
  reason: "This file type is not read by this system.",
  reasonTamil: "இந்த வகை கோப்பு இந்த அமைப்பால் படிக்கப்படாது.",
  canExtract: false,
  confidenceCeiling: 0,
  nextAction:
    "Accepted formats are PDF, DOCX, XLSX, CSV and image scans. Upload one of those, or enter the record by hand.",
  severity: "blocked",
  method: "Not read",
};

const UNKNOWN_TYPE: TriageResult = {
  outcome: "UNKNOWN",
  label: "Unrecognised file type",
  labelTamil: "அறியப்படாத கோப்பு வகை",
  reason:
    "Neither the file name nor the reported type identifies this file. It is kept as an attachment and read for display only.",
  reasonTamil:
    "கோப்பின் வகை அறியப்படவில்லை. இணைப்பாக மட்டும் வைக்கப்படும்.",
  canExtract: false,
  confidenceCeiling: 0.5,
  nextAction: "Rename the file with its correct extension and upload it again, or enter the record by hand.",
  severity: "degraded",
  method: "Not read",
};

export const TRIAGE_OUTCOMES: TriageResult[] = [
  TEXT_LAYER_PDF,
  OFFICE_DOCUMENT,
  SPREADSHEET,
  PLAIN_TEXT,
  SCANNED_IMAGE,
  IMAGE_ONLY_PDF,
  ENCRYPTED,
  EMPTY_FILE,
  OVERSIZE,
  EXTENSION_MISMATCH,
  UNSUPPORTED_TYPE,
  UNKNOWN_TYPE,
];

/* ── Category inference ──────────────────────────────────────────────── */

/**
 * Guessing the document category from the file name.
 *
 * An officer picks the category from a dropdown before uploading, so in the
 * product this is a convenience. In a demo it is load-bearing: a judge drags a
 * file in without touching the dropdown, and landing on the right reader is
 * the difference between "it read my patta" and "it read a generic document".
 *
 * Tamil transliterations are in the table because that is what the files are
 * actually called in a taluk office — `pattaa_extract.pdf`, `chitta adangal
 * 2024.pdf`, `FMB_sketch_142-2B.pdf`.
 */
const CATEGORY_HINTS: { category: string; patterns: RegExp[]; why: string }[] = [
  { category: "PATTA_CHITTA", patterns: [/\bpatt?a+\b/i, /chitta/i, /adangal/i, /\brор\b/i, /record.?of.?rights/i], why: "the name mentions a patta, chitta or adangal extract" },
  { category: "FMB_SKETCH", patterns: [/\bfmb\b/i, /field.?measurement/i, /\bsketch\b/i, /\bnaksha\b/i], why: "the name mentions an FMB or field-measurement sketch" },
  { category: "GPS_SURVEY_REPORT", patterns: [/\bdgps\b/i, /\bgps\b/i, /total.?station/i, /survey.?report/i, /coordinate/i], why: "the name mentions a DGPS, GPS or total-station survey" },
  { category: "ENCUMBRANCE_CERTIFICATE", patterns: [/encumbrance/i, /\bec\b/i, /\bnil.?ec\b/i], why: "the name mentions an encumbrance certificate" },
  { category: "GUIDELINE_VALUE_CERTIFICATE", patterns: [/guideline.?value/i, /\bgv\b/i, /market.?value.?certificate/i], why: "the name mentions a guideline value certificate" },
  { category: "ASSET_VALUATION_REPORT", patterns: [/valuation/i, /\btrees?\b/i, /\bwell\b/i, /borewell/i, /horticulture/i, /\bpwd\b.*valu/i], why: "the name mentions a valuation of trees, wells or structures" },
  { category: "LEGAL_HEIR_CERTIFICATE", patterns: [/legal.?heir/i, /\bheir\b/i, /succession/i, /\bvaris\b/i], why: "the name mentions a legal heir or succession certificate" },
  { category: "NOTIFICATION", patterns: [/section.?11/i, /\bs\.?11\b/i, /preliminary.?notif/i, /gazette/i, /\bnotification\b/i], why: "the name mentions a s.11 preliminary notification or a gazette" },
  { category: "DECLARATION", patterns: [/section.?19/i, /\bs\.?19\b/i, /\bdeclaration\b/i], why: "the name mentions a s.19 declaration" },
  { category: "AWARD_LETTER", patterns: [/\baward\b/i, /section.?23/i, /\bs\.?23\b/i], why: "the name mentions an award" },
  { category: "POSSESSION_CERTIFICATE", patterns: [/possession/i, /\bs\.?38\b/i, /handover/i], why: "the name mentions possession or handover" },
  { category: "SIA_REPORT", patterns: [/\bsia\b/i, /social.?impact/i], why: "the name mentions a Social Impact Assessment" },
  { category: "DPR", patterns: [/\bdpr\b/i, /detailed.?project.?report/i, /feasibility/i], why: "the name mentions a Detailed Project Report" },
  { category: "ROW_PLAN", patterns: [/\brow\b.?plan/i, /right.?of.?way/i, /alignment/i, /land.?plan/i], why: "the name mentions a right-of-way or alignment plan" },
  { category: "DESIGN_DRAWING", patterns: [/\bdrawing\b/i, /\bgad\b/i, /\bdwg\b/i, /general.?arrangement/i], why: "the name mentions a design drawing" },
  { category: "SITE_INVESTIGATION", patterns: [/site.?investigation/i, /geotech/i, /soil.?test/i, /borehole/i], why: "the name mentions a site or geotechnical investigation" },
];

export interface CategoryGuess {
  category: string;
  confidence: number;
  /** Plain-words justification, shown next to the guess so it can be overridden. */
  why: string;
}

export function inferCategoryFromFileName(rawName: unknown): CategoryGuess {
  const name = toSafeText(rawName, 260).value;
  if (!name) {
    return { category: "OTHER", confidence: 0, why: "no file name to go on — filed as Other" };
  }
  // Separators become spaces before matching. Real file names are
  // `pattaa_extract.pdf` and `FMB_sketch_142-2B.pdf`, and `\b` does not fire
  // against an underscore because an underscore is a word character — so
  // matching the raw name misses the majority of actual uploads.
  const searchable = name.replace(/[_.\-/\\]+/g, " ");
  for (const hint of CATEGORY_HINTS) {
    if (hint.patterns.some((p) => p.test(searchable))) {
      return { category: hint.category, confidence: 0.75, why: hint.why };
    }
  }
  return {
    category: "OTHER",
    confidence: 0,
    why: "the file name does not identify a document type — filed as Other and read for display only",
  };
}

/**
 * Full pre-read: triage plus category, ready to hand to the reader.
 *
 * A caller passes whatever the form gave it and gets back something safe to
 * render. When the officer already picked a category that choice wins — an
 * inferred guess must never quietly overrule a human who was explicit.
 */
export function prepareDocumentRead(raw: {
  fileName: unknown;
  mimeType: unknown;
  sizeBytes: unknown;
  category?: unknown;
  hasTextLayer?: boolean | null;
  encrypted?: boolean | null;
}): {
  triage: TriageResult;
  category: string;
  categoryWasInferred: boolean;
  categoryWhy: string;
  notes: InputNote[];
} {
  const { result, notes } = triageUpload(raw);
  const chosen = toSafeText(raw.category, 60).value.toUpperCase().replace(/\s+/g, "_");

  if (chosen && chosen !== "OTHER") {
    return {
      triage: result,
      category: chosen,
      categoryWasInferred: false,
      categoryWhy: "category selected by the officer",
      notes,
    };
  }

  const guess = inferCategoryFromFileName(raw.fileName);
  const inferredNotes = [...notes];
  if (guess.category !== "OTHER") {
    inferredNotes.push(
      note(
        "Document category",
        chosen || "(not selected)",
        `Read as ${guess.category.replace(/_/g, " ").toLowerCase()} because ${guess.why}. Change the category if that is wrong.`,
        "info"
      )
    );
  }
  return {
    triage: result,
    category: guess.category,
    categoryWasInferred: guess.category !== "OTHER",
    categoryWhy: guess.why,
    notes: inferredNotes,
  };
}
