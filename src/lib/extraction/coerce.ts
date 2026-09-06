/**
 * Turning what is in the cell into what the register needs.
 *
 * Every function here answers one question: is this a value this field can
 * legitimately hold, and if so, what is it in canonical form? A failure
 * returns a message an officer can act on, naming what was found and what was
 * expected — never a bare "invalid".
 *
 * Strictness is deliberate. A land record that silently accepts "about two
 * acres" as an extent produces an award computed on a guess.
 */

import type { FieldSpec } from "./types";

export interface CoerceOk<T> {
  ok: true;
  value: T;
}
export interface CoerceFail {
  ok: false;
  message: string;
  expected: string;
}
export type CoerceResult<T> = CoerceOk<T> | CoerceFail;

const ok = <T,>(value: T): CoerceOk<T> => ({ ok: true, value });
const fail = (message: string, expected: string): CoerceFail => ({
  ok: false,
  message,
  expected,
});

/* ── Extent ───────────────────────────────────────────────────────────── */

/** One acre in hectares, exactly as the conversion is defined. */
const HECTARES_PER_ACRE = 0.40468564224;
/** A cent is 1/100 acre — how smallholdings are quoted across Tamil Nadu. */
const HECTARES_PER_CENT = HECTARES_PER_ACRE / 100;

const EXTENT_EXPECTED =
  'hectares (e.g. "0.8400"), or a value with its unit — "2.08 acres", "37 cents", or hectare-are-square metre form "0-84-00"';

/**
 * Reads an extent and returns hectares.
 *
 * Revenue records quote land four ways and all four turn up in real extracts:
 * plain hectares, acres, cents, and the hectare-are-square-metre triple that
 * chitta extracts print (0-84-00 meaning 0 ha 84 ares 0 sq m). Guessing
 * between them is not acceptable, so a bare number is always hectares and
 * anything else must name its unit.
 */
export function coerceExtent(raw: string): CoerceResult<number> {
  const input = raw.trim().toLowerCase().replace(/,/g, "");
  if (!input) return fail("no extent given", EXTENT_EXPECTED);

  // Hectare-are-square metre triple, as printed on a chitta.
  const triple = input.match(/^(\d+)\s*[-.]\s*(\d{1,2})\s*[-.]\s*(\d{1,2})$/);
  if (triple) {
    const [, h, a, sqm] = triple;
    const ares = Number(a);
    const squareMetres = Number(sqm);
    if (ares > 99 || squareMetres > 99) {
      return fail(
        `"${raw}" reads as hectare-are-square metre, but ares and square metres must each be under 100`,
        EXTENT_EXPECTED
      );
    }
    return ok(round4(Number(h) + ares / 100 + squareMetres / 10000));
  }

  const withUnit = input.match(/^([0-9]*\.?[0-9]+)\s*([a-z.\s]*)$/);
  if (!withUnit) {
    return fail(`"${raw}" is not a number with an optional unit`, EXTENT_EXPECTED);
  }
  const amount = Number(withUnit[1]);
  if (!Number.isFinite(amount)) {
    return fail(`"${raw}" is not a number`, EXTENT_EXPECTED);
  }
  const unit = withUnit[2].replace(/[.\s]/g, "");

  if (unit === "" || unit === "ha" || unit === "hectare" || unit === "hectares" || unit === "hect") {
    return ok(round4(amount));
  }
  if (unit === "ac" || unit === "acre" || unit === "acres") {
    return ok(round4(amount * HECTARES_PER_ACRE));
  }
  if (unit === "cent" || unit === "cents") {
    return ok(round4(amount * HECTARES_PER_CENT));
  }
  if (unit === "sqm" || unit === "m2" || unit === "sqmetre" || unit === "squaremetres") {
    return ok(round4(amount / 10000));
  }
  return fail(
    `"${raw}" uses the unit "${withUnit[2].trim()}", which is not a land measure this reads`,
    EXTENT_EXPECTED
  );
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/* ── Survey and patta numbers ─────────────────────────────────────────── */

const SURVEY_EXPECTED =
  'a survey number as it appears in the FMB, e.g. "112", "112/2", "112/2A" or "112/2A1"';

/**
 * A Tamil Nadu survey number: a field number, optionally followed by
 * subdivision parts separated by "/".
 *
 * Subdivisions alternate digits and letters as land is partitioned across
 * generations, so 112/2A1B is a legitimate plot and not a typo.
 */
export function coerceSurveyNumber(raw: string): CoerceResult<string> {
  const input = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!input) return fail("no survey number given", SURVEY_EXPECTED);
  if (!/^\d{1,5}(\/[0-9A-Z]{1,8})*$/.test(input)) {
    return fail(
      `"${raw}" is not a survey number — it must start with the field number and use "/" between subdivisions`,
      SURVEY_EXPECTED
    );
  }
  return ok(input);
}

export function coercePattaNumber(raw: string): CoerceResult<string> {
  const input = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!input) return fail("no patta number given", 'a patta number, e.g. "1247"');
  if (!/^\d{1,8}$/.test(input)) {
    return fail(
      `"${raw}" is not a patta number — a patta is numbered, with no letters or punctuation`,
      'a patta number, e.g. "1247"'
    );
  }
  return ok(input);
}

/* ── Aadhaar ──────────────────────────────────────────────────────────── */

const AADHAAR_EXPECTED =
  'either a masked Aadhaar ("XXXX-XXXX-1234") or the full 12 digits, which is masked before it is stored';

/**
 * The Verhoeff checksum Aadhaar numbers carry.
 *
 * Validating it is what makes this a real check rather than a length test: a
 * mistyped digit fails, so a transposition in a household register is caught
 * at intake instead of at payment time.
 */
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(digits: string): boolean {
  let c = 0;
  const reversed = digits.split("").reverse().map(Number);
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]];
  }
  return c === 0;
}

/**
 * Returns the masked form. The full number is never returned and never
 * stored — masking happens at the point of reading, not at the point of
 * display, so an unmasked Aadhaar never reaches the database at all.
 */
export function coerceAadhaar(raw: string): CoerceResult<string> {
  const input = raw.trim().replace(/[\s-]/g, "");
  if (!input) return fail("no Aadhaar given", AADHAAR_EXPECTED);

  const masked = input.match(/^[X*]{8}(\d{4})$/i);
  if (masked) return ok(`XXXX-XXXX-${masked[1]}`);

  if (!/^\d{12}$/.test(input)) {
    return fail(
      `"${raw}" is not an Aadhaar number — it must be 12 digits, or already masked`,
      AADHAAR_EXPECTED
    );
  }
  if (input.startsWith("0") || input.startsWith("1")) {
    return fail(
      "an Aadhaar number never begins with 0 or 1",
      AADHAAR_EXPECTED
    );
  }
  if (!verhoeffValid(input)) {
    return fail(
      "the Aadhaar checksum does not match, so at least one digit is wrong",
      AADHAAR_EXPECTED
    );
  }
  return ok(`XXXX-XXXX-${input.slice(-4)}`);
}

/* ── Contact ──────────────────────────────────────────────────────────── */

export function coercePhone(raw: string): CoerceResult<string> {
  const input = raw.trim().replace(/[\s-()]/g, "").replace(/^(\+91|0091|91)/, "");
  if (!input) return fail("no phone number given", 'a 10-digit Indian mobile number, e.g. "9445012345"');
  if (!/^[6-9]\d{9}$/.test(input)) {
    return fail(
      `"${raw}" is not a 10-digit Indian mobile number`,
      'a 10-digit Indian mobile number starting 6-9, e.g. "9445012345"'
    );
  }
  return ok(input);
}

export function coerceEmail(raw: string): CoerceResult<string> {
  const input = raw.trim().toLowerCase();
  if (!input) return fail("no email given", 'an email address, e.g. "name@example.com"');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input)) {
    return fail(`"${raw}" is not an email address`, 'an email address, e.g. "name@example.com"');
  }
  return ok(input);
}

/* ── Dates ────────────────────────────────────────────────────────────── */

const DATE_EXPECTED = 'a date as DD-MM-YYYY or YYYY-MM-DD, e.g. "14-03-2026"';

/**
 * Indian records write DD-MM-YYYY. ISO is accepted because exports produce
 * it. Ambiguous US-style MM/DD/YYYY is deliberately not guessed at: reading
 * 03/04/2026 as either March or April silently would put a statutory date on
 * the file that nobody can defend.
 */
export function coerceDate(raw: string): CoerceResult<Date> {
  const input = raw.trim();
  if (!input) return fail("no date given", DATE_EXPECTED);

  let year: number, month: number, day: number;
  const iso = input.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dmy = input.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);

  if (iso) {
    [, , ,] = iso;
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
    if (day <= 12 && month <= 12 && day !== month) {
      // Both readings are possible. DD-MM is the Indian convention and the
      // one the template asks for, so it is used — but the ambiguity is
      // surfaced as a warning by the validator rather than hidden.
    }
  } else {
    return fail(`"${raw}" is not a date this reads`, DATE_EXPECTED);
  }

  if (month < 1 || month > 12) {
    return fail(`"${raw}" has month ${month}, which is not a month`, DATE_EXPECTED);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return fail(`"${raw}" is not a real calendar date`, DATE_EXPECTED);
  }
  return ok(date);
}

/* ── Coordinates ──────────────────────────────────────────────────────── */

const COORD_EXPECTED =
  'a longitude and latitude pair, e.g. "80.2412 13.0521" — or several, separated by ";", to trace a boundary';

/**
 * A boundary as surveyed points, in longitude-latitude order.
 *
 * Bounded to India's extent, because a DGPS report whose points land in the
 * Atlantic is a units or axis-order mistake, not a plot.
 */
export function coerceCoordinates(raw: string): CoerceResult<[number, number][]> {
  const input = raw.trim();
  if (!input) return fail("no coordinates given", COORD_EXPECTED);

  const points: [number, number][] = [];
  for (const part of input.split(/\s*;\s*/)) {
    if (!part.trim()) continue;
    const nums = part.trim().split(/[\s,]+/).map(Number);
    if (nums.length !== 2 || nums.some((n) => !Number.isFinite(n))) {
      return fail(`"${part.trim()}" is not a longitude and latitude pair`, COORD_EXPECTED);
    }
    const [lon, lat] = nums;
    if (lon < 68 || lon > 98 || lat < 6 || lat > 38) {
      return fail(
        `the point ${lon}, ${lat} is outside India — check the longitude and latitude are not swapped`,
        COORD_EXPECTED
      );
    }
    points.push([lon, lat]);
  }
  if (points.length === 0) return fail("no coordinates given", COORD_EXPECTED);
  return ok(points);
}

/* ── Simple kinds ─────────────────────────────────────────────────────── */

const TRUE_WORDS = new Set(["yes", "y", "true", "1", "ஆம்"]);
const FALSE_WORDS = new Set(["no", "n", "false", "0", "இல்லை"]);

export function coerceBoolean(raw: string): CoerceResult<boolean> {
  const input = raw.trim().toLowerCase();
  if (TRUE_WORDS.has(input)) return ok(true);
  if (FALSE_WORDS.has(input)) return ok(false);
  return fail(`"${raw}" is not a yes or no`, '"Yes" or "No"');
}

export function coerceInteger(raw: string, spec: FieldSpec): CoerceResult<number> {
  const input = raw.trim().replace(/,/g, "");
  if (!/^-?\d+$/.test(input)) {
    return fail(`"${raw}" is not a whole number`, "a whole number");
  }
  return boundsCheck(Number(input), spec, "a whole number");
}

export function coerceDecimal(raw: string, spec: FieldSpec): CoerceResult<number> {
  const input = raw.trim().replace(/,/g, "");
  if (!/^-?\d*\.?\d+$/.test(input)) {
    return fail(`"${raw}" is not a number`, "a number");
  }
  return boundsCheck(Number(input), spec, "a number");
}

function boundsCheck(value: number, spec: FieldSpec, noun: string): CoerceResult<number> {
  if (spec.min !== undefined && value < spec.min) {
    return fail(`${value} is below the minimum of ${spec.min}`, `${noun} of at least ${spec.min}`);
  }
  if (spec.max !== undefined && value > spec.max) {
    return fail(`${value} is above the maximum of ${spec.max}`, `${noun} of at most ${spec.max}`);
  }
  return ok(value);
}

export function coerceEnum(raw: string, spec: FieldSpec): CoerceResult<string> {
  const values = spec.enumValues ?? [];
  // Both sides are normalized the same way. Comparing a normalized input
  // against a raw value means any enum containing a hyphen or a space could
  // never be matched, whatever the officer typed.
  const normalize = (v: string) => v.trim().toUpperCase().replace(/[\s_-]+/g, "_");
  const input = normalize(raw);
  const match = values.find((v) => normalize(v) === input);
  if (!match) {
    return fail(
      `"${raw}" is not one of the accepted values`,
      `one of: ${values.join(", ")}`
    );
  }
  return ok(match);
}

export function coerceText(raw: string, spec: FieldSpec): CoerceResult<string> {
  const input = raw.trim().replace(/\s+/g, " ");
  if (!input) return fail("the cell is empty", "some text");
  if (spec.max !== undefined && input.length > spec.max) {
    return fail(
      `${input.length} characters is longer than the ${spec.max} allowed`,
      `text of at most ${spec.max} characters`
    );
  }
  return ok(input);
}

/** Dispatches to the coercion for a field's kind. */
export function coerceField(raw: string, spec: FieldSpec): CoerceResult<unknown> {
  switch (spec.kind) {
    case "extent":
      return coerceExtent(raw);
    case "surveyNumber":
      return coerceSurveyNumber(raw);
    case "pattaNumber":
      return coercePattaNumber(raw);
    case "aadhaar":
      return coerceAadhaar(raw);
    case "phone":
      return coercePhone(raw);
    case "email":
      return coerceEmail(raw);
    case "date":
      return coerceDate(raw);
    case "coordinates":
      return coerceCoordinates(raw);
    case "boolean":
      return coerceBoolean(raw);
    case "integer":
      return coerceInteger(raw, spec);
    case "decimal":
      return coerceDecimal(raw, spec);
    case "enum":
      return coerceEnum(raw, spec);
    case "text":
    default:
      return coerceText(raw, spec);
  }
}
