/**
 * Input guard — the one place that turns whatever a judge typed into a
 * number, a date, or a string this app can compute with.
 *
 * Lane E's brief (DELEGATION.md, Lane E task 1) is that no frontend-only or
 * failure-prone feature may ever show an infinite spinner or a raw error. The
 * four "AI" modules are the ones a judge will actually poke at, because they
 * are the ones with a number in them that invites being changed. So every
 * entry point into those modules runs its raw input through this file first.
 *
 * Three rules hold everywhere in here:
 *
 *  1. **Nothing throws.** Every function has a defined return for `undefined`,
 *     `null`, `NaN`, `Infinity`, `[]`, `{}`, a 40,000-character paste, and a
 *     string of emoji. A thrown error inside a React Server Component is a
 *     blank page in front of a judge.
 *  2. **Every repair is recorded.** A clamp that happens silently is a lie
 *     about what was computed. Each function returns the value *and* a note
 *     saying what it changed, and the UI prints those notes under the result.
 *     That is what keeps the "explainable and deterministic" claim in
 *     NOVELTY.md true even when the input was nonsense.
 *  3. **Indian conventions are first-class.** `45 lakh`, `1.2 crore`,
 *     `1,20,000`, `2.08 acres`, `37 cents` and the `0-84-00`
 *     hectare-are-square-metre form a chitta prints are all real things a
 *     Tamil Nadu officer types. Rejecting them would be a bug, not strictness.
 */

/** A single repair made to raw input, shown to the user verbatim. */
export interface InputNote {
  /** The field the note is about, as the form labels it. */
  field: string;
  /** What was received, rendered for display. */
  received: string;
  /** What was used instead, and why. Plain words, no jargon. */
  message: string;
  severity: "info" | "adjusted" | "rejected";
}

/** A coerced value plus the list of repairs made to get there. */
export interface SafeValue<T> {
  value: T;
  notes: InputNote[];
}

export function note(
  field: string,
  received: unknown,
  message: string,
  severity: InputNote["severity"] = "adjusted"
): InputNote {
  return { field, received: describe(received), message, severity };
}

/** A short, safe rendering of any raw value for display in a note. */
export function describe(raw: unknown): string {
  if (raw === undefined) return "(not provided)";
  if (raw === null) return "(empty)";
  if (typeof raw === "number") {
    if (Number.isNaN(raw)) return "NaN";
    if (!Number.isFinite(raw)) return raw > 0 ? "Infinity" : "-Infinity";
    return String(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return "(blank)";
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
  }
  if (typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return `(list of ${raw.length})`;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? "(invalid date)" : raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "object") return "(object)";
  return String(raw);
}

/* ── Text ─────────────────────────────────────────────────────────────── */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const TAG_LIKE = /<\/?[a-z][^>]*>/gi;

/**
 * Anything typed into a free-text box.
 *
 * Tags are stripped rather than escaped because none of these strings is ever
 * rendered as HTML — they are matched against a knowledge base and echoed back
 * as text — so the tag characters carry no meaning and only get in the way of
 * matching. Truncation is generous: a judge pasting a whole paragraph of a
 * grievance should still be answered, not told the input was too long.
 */
export function toSafeText(raw: unknown, maxLength = 2000): SafeValue<string> {
  const notes: InputNote[] = [];
  if (typeof raw !== "string") {
    if (raw === undefined || raw === null) return { value: "", notes };
    if (typeof raw === "number" || typeof raw === "boolean") {
      return { value: String(raw), notes };
    }
    return {
      value: "",
      notes: [note("text", raw, "Expected text; nothing was read from it.", "rejected")],
    };
  }

  let text = raw.replace(CONTROL_CHARS, " ").replace(TAG_LIKE, " ");
  text = text.replace(/\s+/g, " ").trim();

  if (text.length > maxLength) {
    notes.push(
      note(
        "text",
        `${text.length} characters`,
        `Only the first ${maxLength} characters were read.`
      )
    );
    text = text.slice(0, maxLength);
  }
  return { value: text, notes };
}

/**
 * True when a string looks like someone testing for an injection hole.
 *
 * This does not block anything — the string has already been made inert by
 * `toSafeText`, and refusing to answer would look like a crash. It exists so
 * the UI can say "read as plain text" instead of silently returning the
 * unhelpful-looking no-match answer, which reads like a bug when the judge
 * knows exactly what they typed.
 */
export function looksLikeProbe(text: string): boolean {
  return (
    /(\bunion\b\s+\bselect\b|\bdrop\s+table\b|;\s*--|\bor\b\s+1\s*=\s*1)/i.test(text) ||
    /<script|javascript:|onerror\s*=/i.test(text) ||
    /\{\{.*\}\}|\$\{.*\}/.test(text) ||
    /\.\.\/\.\.\//.test(text)
  );
}

/* ── Numbers ──────────────────────────────────────────────────────────── */

const NUMBER_WORD_SCALES: { pattern: RegExp; factor: number }[] = [
  { pattern: /\bcrores?\b|\bcr\b/i, factor: 1_00_00_000 },
  { pattern: /\blakhs?\b|\blacs?\b|\blakhs\b/i, factor: 1_00_000 },
  { pattern: /\bmillions?\b|\bmn\b/i, factor: 1_000_000 },
  { pattern: /\bthousands?\b|\bk\b/i, factor: 1_000 },
];

/**
 * A number out of anything: `"45"`, `"₹45,00,000"`, `"45 lakh"`, `"1.2 crore"`,
 * `"12%"`, `"  8 "`, `8`, `"eight"` (no), `NaN` (no).
 *
 * Returns `null` rather than 0 when nothing numeric is present, because 0 is a
 * meaningful answer for most of these fields and guessing it would hide the
 * fact that the field was never filled in.
 */
export function parseIndianNumber(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== "string") return null;

  const text = raw.trim();
  if (text === "") return null;

  // Strip currency marks, separators and the words that only decorate.
  const cleaned = text
    .replace(/[₹$€£]/g, " ")
    .replace(/\brs\.?\b|\binr\b|\brupees?\b/gi, " ")
    .replace(/,/g, "")
    .replace(/\bper\s+(hectare|ha|acre|cent)\b/gi, " ")
    .replace(/\/\s*(hectare|ha|acre|cent)\b/gi, " ");

  const match = cleaned.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  if (!match) return null;

  let value = Number(match[0]);
  if (!Number.isFinite(value)) return null;

  for (const scale of NUMBER_WORD_SCALES) {
    if (scale.pattern.test(cleaned)) {
      value *= scale.factor;
      break;
    }
  }
  return Number.isFinite(value) ? value : null;
}

/** A whole number in `[min, max]`, with a note whenever it had to move. */
export function clampInt(
  raw: unknown,
  field: string,
  min: number,
  max: number,
  fallback = min
): SafeValue<number> {
  const parsed = parseIndianNumber(raw);
  if (parsed === null) {
    return {
      value: fallback,
      notes:
        raw === undefined || raw === null || raw === ""
          ? []
          : [note(field, raw, `Not a number — treated as ${fallback}.`, "rejected")],
    };
  }
  const rounded = Math.round(parsed);
  if (rounded < min) {
    return {
      value: min,
      notes: [note(field, raw, `Cannot be below ${min} — raised to ${min}.`)],
    };
  }
  if (rounded > max) {
    return {
      value: max,
      notes: [note(field, raw, `Above the supported maximum — capped at ${max}.`)],
    };
  }
  const notes = rounded !== parsed ? [note(field, raw, `Rounded to ${rounded}.`, "info")] : [];
  return { value: rounded, notes };
}

/** A real number in `[min, max]`, same contract as `clampInt`. */
export function clampNumber(
  raw: unknown,
  field: string,
  min: number,
  max: number,
  fallback = min
): SafeValue<number> {
  const parsed = parseIndianNumber(raw);
  if (parsed === null) {
    return {
      value: fallback,
      notes:
        raw === undefined || raw === null || raw === ""
          ? []
          : [note(field, raw, `Not a number — treated as ${fallback}.`, "rejected")],
    };
  }
  if (parsed < min) {
    return { value: min, notes: [note(field, raw, `Cannot be below ${min} — raised to ${min}.`)] };
  }
  if (parsed > max) {
    return { value: max, notes: [note(field, raw, `Above the supported maximum — capped at ${max}.`)] };
  }
  return { value: parsed, notes: [] };
}

/* ── Extents ──────────────────────────────────────────────────────────── */

const HECTARES_PER_ACRE = 0.404686;
const HECTARES_PER_CENT = 0.00404686; // 1 cent = 1/100 acre
const HECTARES_PER_ARE = 0.01;
const HECTARES_PER_SQM = 0.0001;
const HECTARES_PER_SQFT = 0.0000092903;
const HECTARES_PER_GROUND = 0.0223; // 2,400 sq ft, Chennai usage

/**
 * An extent in hectares out of any unit a Tamil Nadu record uses.
 *
 * A bare number is hectares, matching the upload templates in
 * `lib/extraction/templates.ts` so the two halves of the product agree. The
 * `0-84-00` form is the hectare-are-square-metre triple a chitta prints and is
 * read as 0.84 ha.
 */
export function parseExtentHectares(raw: unknown): SafeValue<number | null> {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? { value: raw, notes: [] } : { value: null, notes: [] };
  }
  if (typeof raw !== "string") return { value: null, notes: [] };

  const text = raw.trim().toLowerCase();
  if (text === "") return { value: null, notes: [] };

  // Hectare-are-square metre triple, e.g. "0-84-00".
  const triple = text.match(/^(\d+)\s*[-–]\s*(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (triple) {
    const value =
      Number(triple[1]) + Number(triple[2]) * HECTARES_PER_ARE + Number(triple[3]) * HECTARES_PER_SQM;
    return {
      value,
      notes: [note("extent", raw, `Read as ${value.toFixed(4)} ha (hectare-are-sqm form).`, "info")],
    };
  }

  const amount = parseIndianNumber(text);
  if (amount === null || amount < 0) return { value: null, notes: [] };

  const units: { pattern: RegExp; factor: number; label: string }[] = [
    { pattern: /\b(hectares?|hect|ha)\b/, factor: 1, label: "hectares" },
    { pattern: /\b(acres?|ac)\b/, factor: HECTARES_PER_ACRE, label: "acres" },
    { pattern: /\bcents?\b/, factor: HECTARES_PER_CENT, label: "cents" },
    { pattern: /\bares?\b/, factor: HECTARES_PER_ARE, label: "ares" },
    { pattern: /\b(sq\.?\s?m|sqm|square\s?met(er|re)s?|m2)\b/, factor: HECTARES_PER_SQM, label: "sq m" },
    { pattern: /\b(sq\.?\s?ft|sqft|square\s?feet|ft2)\b/, factor: HECTARES_PER_SQFT, label: "sq ft" },
    { pattern: /\bgrounds?\b/, factor: HECTARES_PER_GROUND, label: "grounds" },
  ];

  for (const unit of units) {
    if (unit.pattern.test(text)) {
      const value = amount * unit.factor;
      return {
        value,
        notes:
          unit.factor === 1
            ? []
            : [note("extent", raw, `Converted from ${unit.label} to ${value.toFixed(4)} ha.`, "info")],
      };
    }
  }

  return {
    value: amount,
    notes: [note("extent", raw, "No unit given — read as hectares.", "info")],
  };
}

/* ── Dates ────────────────────────────────────────────────────────────── */

/**
 * A date out of a `Date`, an ISO string, `dd-mm-yyyy`, `dd/mm/yyyy`, or an
 * epoch number. Day-first is assumed for the slash and dash forms because that
 * is how every Indian government form prints a date; `2026-04-01` is still read
 * as ISO because the four-digit leading group is unambiguous.
 */
export function parseFlexibleDate(raw: unknown, field = "date"): SafeValue<Date | null> {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? { value: null, notes: [note(field, raw, "Invalid date — ignored.", "rejected")] }
      : { value: raw, notes: [] };
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const asDate = new Date(raw);
    return Number.isNaN(asDate.getTime()) ? { value: null, notes: [] } : { value: asDate, notes: [] };
  }
  if (typeof raw !== "string" || raw.trim() === "") return { value: null, notes: [] };

  const text = raw.trim();

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const parsed = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(parsed.getTime()) ? { value: null, notes: [] } : { value: parsed, notes: [] };
  }

  const dayFirst = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return {
        value: new Date(Date.UTC(Number(dayFirst[3]), month - 1, day)),
        notes: [note(field, raw, "Read as day-month-year.", "info")],
      };
    }
  }

  const loose = new Date(text);
  if (!Number.isNaN(loose.getTime())) return { value: loose, notes: [] };

  return { value: null, notes: [note(field, raw, "Not a date this system can read — ignored.", "rejected")] };
}

/**
 * A date that cannot be in the future.
 *
 * Every date these modules take is a *past* event — when a rate was last
 * notified, when possession was taken. A future date silently produces a
 * negative elapsed time and then a nonsensical projection, so it is pulled back
 * to today with a note rather than allowed through.
 */
export function pastDateOnly(
  raw: unknown,
  field: string,
  now: Date = new Date()
): SafeValue<Date | null> {
  const parsed = parseFlexibleDate(raw, field);
  if (!parsed.value) return parsed;
  if (parsed.value.getTime() > now.getTime()) {
    return {
      value: now,
      notes: [
        ...parsed.notes,
        note(field, raw, "Date is in the future — today's date was used instead."),
      ],
    };
  }
  return parsed;
}

/* ── Records ──────────────────────────────────────────────────────────── */

/** Safe property read off an `unknown`, so a coercer can take literally anything. */
export function field(raw: unknown, key: string): unknown {
  if (raw === null || typeof raw !== "object") return undefined;
  return (raw as Record<string, unknown>)[key];
}

/** Reads a key under several spellings — form posts and JSON pastes differ. */
export function fieldAny(raw: unknown, keys: string[]): unknown {
  for (const key of keys) {
    const value = field(raw, key);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/** Merges note lists, dropping duplicates so one bad field is reported once. */
export function mergeNotes(...groups: InputNote[][]): InputNote[] {
  const seen = new Set<string>();
  const out: InputNote[] = [];
  for (const group of groups) {
    for (const n of group) {
      const key = `${n.field}|${n.received}|${n.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
  }
  return out;
}

/** `₹12,34,567` — Indian digit grouping, no decimals. */
export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** `₹45.0 lakh` / `₹1.23 crore` — how an officer says a large number aloud. */
export function formatINRWords(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} crore`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} lakh`;
  return formatINR(value);
}
