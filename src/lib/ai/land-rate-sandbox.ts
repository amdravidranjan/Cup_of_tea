/**
 * Making the land-rate prediction something a judge can push on.
 *
 * `land-rate.ts` projects a rate from whatever the district has on record. On
 * the demo laptop that is one number per project and a judge cannot change it,
 * so the prediction card looks like an oracle. It is not one — it is four
 * adjustments applied to a base rate — and the way to prove that is to let
 * someone type a different district, a different base, a different revision
 * date, and watch each line move.
 *
 * Two things this file adds that the module cannot have:
 *
 *  - **A district reference table.** The module's fallback for a district with
 *    no notified rate is a state-level figure nudged by a hash of the district
 *    name. That is fine as a floor but it is not defensible if a judge from
 *    Coimbatore asks why Coimbatore reads like Perambalur. The table below is
 *    a real ordering of Tamil Nadu districts by land value band, so an unset
 *    district still produces a number an officer would recognise, with the
 *    band named in the answer.
 *
 *  - **The policy comparison.** NOVELTY.md promises "if we change the
 *    multiplier from 2× to 3×, impact on a 50-hectare project is ₹X". That is
 *    a First Schedule question, not a prediction question, and it is the one a
 *    government audience actually cares about. `compareMultiplierPolicy` is it.
 *
 * The projection formula itself is imported, never reimplemented, for the same
 * reason as in `risk-score-sandbox.ts`: a sandbox with its own arithmetic would
 * let the demo and the product disagree in front of the person we are trying
 * to convince.
 */

import { predictLandRate, type RatePrediction } from "@/lib/ai/land-rate";
import { calculateCompensation, type CompensationBreakdown } from "@/lib/compensation";
import {
  clampNumber,
  fieldAny,
  formatINR,
  formatINRWords,
  mergeNotes,
  note,
  parseExtentHectares,
  parseIndianNumber,
  pastDateOnly,
  toSafeText,
  type InputNote,
} from "@/lib/ai/input-guard";
import { step, type FormulaTrace } from "@/lib/ai/explain";

/* ── District reference table ─────────────────────────────────────────── */

export type RateBand = "metropolitan" | "peri-urban" | "industrial" | "agricultural" | "remote";

export interface DistrictRateReference {
  district: string;
  state: string;
  band: RateBand;
  /** Indicative agricultural-land rate per hectare, in rupees. */
  baseRatePerHectare: number;
  /** First Schedule multiplier ordinarily applied here. */
  typicalMultiplier: number;
  /** Why this district sits in this band — shown next to the number. */
  reason: string;
}

/**
 * Indicative bands, not gazette values.
 *
 * Deliberately labelled that way everywhere it surfaces. These are ordered so
 * the relative picture is right — Chennai above Kanchipuram above Perambalur —
 * because a judge checks the ordering, not the absolute figure. Presenting them
 * as notified guideline values would be a false claim; presenting them as a
 * reference band a Collector's office would sanity-check against is true.
 *
 * Every district here appears in the seeded users or projects, so a judge who
 * types a district they saw on a screen always lands on a row.
 */
export const DISTRICT_RATE_TABLE: DistrictRateReference[] = [
  { district: "Chennai", state: "Tamil Nadu", band: "metropolitan", baseRatePerHectare: 42_000_000, typicalMultiplier: 1, reason: "Fully urban; multiplier is 1× inside municipal limits" },
  { district: "Kanchipuram", state: "Tamil Nadu", band: "peri-urban", baseRatePerHectare: 18_500_000, typicalMultiplier: 2, reason: "IT corridor pressure on the Chennai fringe" },
  { district: "Thiruvallur", state: "Tamil Nadu", band: "peri-urban", baseRatePerHectare: 16_800_000, typicalMultiplier: 2, reason: "Metro extension and port corridor demand" },
  { district: "Coimbatore", state: "Tamil Nadu", band: "peri-urban", baseRatePerHectare: 14_200_000, typicalMultiplier: 2, reason: "Second-city industrial and residential growth" },
  { district: "Madurai", state: "Tamil Nadu", band: "peri-urban", baseRatePerHectare: 9_600_000, typicalMultiplier: 2, reason: "Regional hub with metro works underway" },
  { district: "Tiruchirappalli", state: "Tamil Nadu", band: "peri-urban", baseRatePerHectare: 8_900_000, typicalMultiplier: 2, reason: "Airport expansion and central-corridor position" },
  { district: "Salem", state: "Tamil Nadu", band: "industrial", baseRatePerHectare: 7_400_000, typicalMultiplier: 2, reason: "Steel and engineering belt" },
  { district: "Vellore", state: "Tamil Nadu", band: "industrial", baseRatePerHectare: 6_800_000, typicalMultiplier: 2, reason: "Leather cluster and Bengaluru-highway frontage" },
  { district: "Thoothukudi", state: "Tamil Nadu", band: "industrial", baseRatePerHectare: 6_200_000, typicalMultiplier: 2, reason: "Port-led industrial demand" },
  { district: "Krishnagiri", state: "Tamil Nadu", band: "industrial", baseRatePerHectare: 5_900_000, typicalMultiplier: 3, reason: "Border district on the Bengaluru corridor" },
  { district: "Thanjavur", state: "Tamil Nadu", band: "agricultural", baseRatePerHectare: 5_400_000, typicalMultiplier: 3, reason: "Delta command area; high-yield wet land" },
  { district: "Sivaganga", state: "Tamil Nadu", band: "agricultural", baseRatePerHectare: 3_800_000, typicalMultiplier: 4, reason: "Dry-belt agriculture, low transaction volume" },
  { district: "Perambalur", state: "Tamil Nadu", band: "agricultural", baseRatePerHectare: 3_400_000, typicalMultiplier: 4, reason: "Small district, predominantly rain-fed" },
  { district: "Koraput", state: "Odisha", band: "remote", baseRatePerHectare: 2_100_000, typicalMultiplier: 4, reason: "Scheduled area; the full 4× rural multiplier applies" },
  { district: "Bengaluru Urban", state: "Karnataka", band: "metropolitan", baseRatePerHectare: 38_000_000, typicalMultiplier: 1, reason: "Metropolitan; ring-road corridor land" },
];

/** Fallback base rate per band, for a district not in the table. */
const BAND_FALLBACK: Record<RateBand, number> = {
  metropolitan: 35_000_000,
  "peri-urban": 15_000_000,
  industrial: 6_500_000,
  agricultural: 4_000_000,
  remote: 2_200_000,
};

/** State-level floor, used when neither the district nor a band is known. */
const STATE_FALLBACK: Record<string, number> = {
  "Tamil Nadu": 5_500_000,
  Odisha: 2_400_000,
  Karnataka: 7_000_000,
};

const GENERIC_FALLBACK = 4_500_000;

/**
 * Land classification adjustment.
 *
 * Nanjai (wet) land is worth more than punjai (dry) in the same village, and a
 * house site more than either. The Tamil terms are the ones on the chitta, so
 * they are the labels here rather than translated ones.
 */
export const CLASSIFICATION_FACTORS: {
  id: string;
  label: string;
  tamil: string;
  factor: number;
  note: string;
}[] = [
  { id: "NANJAI", label: "Wet land (nanjai)", tamil: "நஞ்சை", factor: 1.35, note: "Irrigated, higher yield" },
  { id: "PUNJAI", label: "Dry land (punjai)", tamil: "புஞ்சை", factor: 1.0, note: "Rain-fed baseline" },
  { id: "MANAVARI", label: "Rain-fed (manavari)", tamil: "மானாவாரி", factor: 0.85, note: "Single-crop, no assured water" },
  { id: "HOUSE_SITE", label: "House site", tamil: "வீட்டுமனை", factor: 2.4, note: "Converted for residential use" },
  { id: "COMMERCIAL", label: "Commercial", tamil: "வணிக", factor: 3.2, note: "Frontage or commercially converted" },
];

export function classificationFactor(id: string): number {
  return CLASSIFICATION_FACTORS.find((c) => c.id === id)?.factor ?? 1;
}

/** Case- and spacing-tolerant district lookup, plus common alternate spellings. */
const DISTRICT_ALIASES: Record<string, string> = {
  trichy: "Tiruchirappalli",
  tiruchi: "Tiruchirappalli",
  trichinopoly: "Tiruchirappalli",
  tuticorin: "Thoothukudi",
  madras: "Chennai",
  bangalore: "Bengaluru Urban",
  "bengaluru": "Bengaluru Urban",
  sivagangai: "Sivaganga",
  thiruvarur: "Thanjavur",
  tiruvallur: "Thiruvallur",
  kancheepuram: "Kanchipuram",
  coimbatur: "Coimbatore",
  kovai: "Coimbatore",
  madura: "Madurai",
};

export function lookupDistrict(rawDistrict: string): DistrictRateReference | null {
  const key = rawDistrict.trim().toLowerCase().replace(/\s+/g, " ");
  if (key === "") return null;
  const canonical = DISTRICT_ALIASES[key] ?? rawDistrict.trim();
  const exact = DISTRICT_RATE_TABLE.find(
    (d) => d.district.toLowerCase() === canonical.toLowerCase()
  );
  if (exact) return exact;
  // A partial match catches "Chennai district" and "Sivaganga Reach".
  return (
    DISTRICT_RATE_TABLE.find(
      (d) =>
        key.includes(d.district.toLowerCase()) || d.district.toLowerCase().includes(key)
    ) ?? null
  );
}

/* ── Input coercion ───────────────────────────────────────────────────── */

export interface RateSandboxInput {
  state: string;
  district: string;
  currentRatePerHectare: number | null;
  lastSetAt: Date | null;
  parcelCount: number;
  /** Optional, sandbox-only: applies the classification factor to the base. */
  classification?: string;
}

export interface CoercedRateInput {
  input: RateSandboxInput;
  notes: InputNote[];
  /** The table row used, when the district resolved to one. */
  reference: DistrictRateReference | null;
  /** How the base rate was arrived at, for the trace. */
  baseSource: "entered" | "district-table" | "band-fallback" | "state-fallback" | "generic";
}

const MAX_RATE = 500_000_000; // ₹50 crore/ha — above any urban guideline value
const MAX_PARCELS = 1_000_000;

export function coerceRateInput(raw: unknown, now: Date = new Date()): CoercedRateInput {
  const notes: InputNote[] = [];

  const stateText = toSafeText(fieldAny(raw, ["state"]), 60);
  const districtText = toSafeText(fieldAny(raw, ["district"]), 60);
  const state = stateText.value || "Tamil Nadu";
  const district = districtText.value;

  if (!stateText.value) {
    notes.push(note("State", fieldAny(raw, ["state"]), "Not given — read as Tamil Nadu.", "info"));
  }

  const reference = district ? lookupDistrict(district) : null;
  if (district && !reference) {
    notes.push(
      note(
        "District",
        district,
        "Not in the reference table — a state-level band was used instead, and the answer says so.",
        "info"
      )
    );
  }

  const rawRate = fieldAny(raw, ["currentRatePerHectare", "ratePerHectare", "rate", "baseRate"]);
  const parsedRate = parseIndianNumber(rawRate);
  let currentRatePerHectare: number | null = null;
  let baseSource: CoercedRateInput["baseSource"] = "entered";

  if (parsedRate !== null && parsedRate > 0) {
    const clamped = clampNumber(parsedRate, "Rate per hectare", 1_000, MAX_RATE, GENERIC_FALLBACK);
    currentRatePerHectare = clamped.value;
    notes.push(...clamped.notes);
  } else {
    if (parsedRate !== null && parsedRate <= 0) {
      notes.push(
        note(
          "Rate per hectare",
          rawRate,
          "A rate cannot be zero or negative — the reference rate for this district was used instead."
        )
      );
    }
    if (reference) {
      currentRatePerHectare = reference.baseRatePerHectare;
      baseSource = "district-table";
    } else if (state && STATE_FALLBACK[state] !== undefined) {
      currentRatePerHectare = STATE_FALLBACK[state];
      baseSource = "state-fallback";
    } else {
      currentRatePerHectare = GENERIC_FALLBACK;
      baseSource = "generic";
    }
  }

  const classificationText = toSafeText(fieldAny(raw, ["classification", "landClassification"]), 40);
  const classification = classificationText.value.toUpperCase().replace(/\s+/g, "_") || undefined;
  if (classification && !CLASSIFICATION_FACTORS.some((c) => c.id === classification)) {
    notes.push(
      note(
        "Classification",
        classification,
        "Not a recognised land classification — no classification adjustment was applied.",
        "info"
      )
    );
  }

  const lastSet = pastDateOnly(
    fieldAny(raw, ["lastSetAt", "lastRevisedAt", "rateSetAt"]),
    "Rate last revised",
    now
  );
  notes.push(...lastSet.notes);

  const parcels = clampNumber(
    fieldAny(raw, ["parcelCount", "parcels", "totalParcels"]),
    "Parcel count",
    0,
    MAX_PARCELS,
    0
  );
  notes.push(...parcels.notes);

  return {
    input: {
      state,
      district: district || (reference?.district ?? ""),
      currentRatePerHectare,
      lastSetAt: lastSet.value,
      parcelCount: Math.round(parcels.value),
      classification:
        classification && CLASSIFICATION_FACTORS.some((c) => c.id === classification)
          ? classification
          : undefined,
    },
    notes: mergeNotes(stateText.notes, districtText.notes, notes),
    reference,
    baseSource,
  };
}

export interface SafeRateResult {
  prediction: RatePrediction;
  input: RateSandboxInput;
  notes: InputNote[];
  reference: DistrictRateReference | null;
  baseSource: CoercedRateInput["baseSource"];
  trace: FormulaTrace;
}

/** The projector with a floor under it — see `assessProjectRiskSafe`. */
export function predictLandRateSafe(raw: unknown, now: Date = new Date()): SafeRateResult {
  const coerced = coerceRateInput(raw, now);
  const factor = coerced.input.classification
    ? classificationFactor(coerced.input.classification)
    : 1;

  const adjustedBase =
    coerced.input.currentRatePerHectare === null
      ? null
      : coerced.input.currentRatePerHectare * factor;

  const notes = [...coerced.notes];
  if (factor !== 1 && coerced.input.classification) {
    const meta = CLASSIFICATION_FACTORS.find((c) => c.id === coerced.input.classification);
    notes.push(
      note(
        "Classification",
        meta?.label ?? coerced.input.classification,
        `Base rate adjusted ×${factor} for ${meta?.label ?? "this classification"} (${meta?.note ?? ""}).`,
        "info"
      )
    );
  }

  try {
    const prediction = predictLandRate({
      state: coerced.input.state,
      district: coerced.input.district,
      currentRatePerHectare: adjustedBase,
      lastSetAt: coerced.input.lastSetAt,
      parcelCount: coerced.input.parcelCount,
    });
    return {
      prediction,
      input: coerced.input,
      notes,
      reference: coerced.reference,
      baseSource: coerced.baseSource,
      trace: explainRatePrediction(coerced, adjustedBase, factor, prediction, now),
    };
  } catch {
    const fallbackRate = adjustedBase ?? GENERIC_FALLBACK;
    const prediction: RatePrediction = {
      predictedRatePerHectare: Math.round(fallbackRate),
      low: Math.round(fallbackRate * 0.92),
      high: Math.round(fallbackRate * 1.08),
      factors: [
        {
          label: "Projection unavailable",
          detail:
            "No adjustment could be applied to these inputs, so the base rate is shown unchanged.",
          adjustmentPercent: 0,
        },
      ],
      basisLabel: "Base rate shown unchanged — no projection is being claimed.",
    };
    return {
      prediction,
      input: coerced.input,
      notes: mergeNotes(notes, [
        note("Projection", "—", "Could not be computed; the base rate is shown as-is.", "rejected"),
      ]),
      reference: coerced.reference,
      baseSource: coerced.baseSource,
      trace: {
        title: "Land rate projection",
        method: "Base rate with adjustments",
        steps: [],
        totalLabel: "Projected rate",
        total: formatINR(fallbackRate),
      },
    };
  }
}

const BASE_SOURCE_TEXT: Record<CoercedRateInput["baseSource"], string> = {
  entered: "the rate entered",
  "district-table": "the district reference band (indicative, not a gazette value)",
  "band-fallback": "the band average for comparable districts",
  "state-fallback": "the state-level floor for districts with no rate on record",
  generic: "a generic national floor — no district or state match was found",
};

export function explainRatePrediction(
  coerced: CoercedRateInput,
  adjustedBase: number | null,
  classificationFactorApplied: number,
  prediction: RatePrediction,
  now: Date = new Date()
): FormulaTrace {
  const steps = [];
  const base = coerced.input.currentRatePerHectare ?? GENERIC_FALLBACK;

  steps.push(
    step(
      "Base rate",
      "base",
      `${formatINR(base)} / ha`,
      formatINR(base),
      `Source: ${BASE_SOURCE_TEXT[coerced.baseSource]}`
    )
  );

  if (classificationFactorApplied !== 1) {
    const meta = CLASSIFICATION_FACTORS.find((c) => c.id === coerced.input.classification);
    steps.push(
      step(
        `Classification — ${meta?.label ?? coerced.input.classification}`,
        "base × classification factor",
        `${formatINR(base)} × ${classificationFactorApplied}`,
        formatINR(adjustedBase ?? base),
        meta?.note
      )
    );
  }

  for (const factor of prediction.factors) {
    if (factor.adjustmentPercent === 0) continue;
    steps.push(
      step(
        factor.label,
        "running total × (1 + adjustment)",
        `${factor.adjustmentPercent > 0 ? "+" : ""}${factor.adjustmentPercent}%`,
        `${factor.adjustmentPercent > 0 ? "+" : ""}${factor.adjustmentPercent}%`,
        factor.detail
      )
    );
  }

  if (coerced.input.lastSetAt) {
    const months = Math.round(
      (now.getTime() - coerced.input.lastSetAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    steps.push(
      step(
        "Elapsed since revision",
        "months × 0.6%, capped at 18%",
        `${months} months × 0.6%`,
        `${Math.min(18, Math.round(months * 0.6))}%`,
        "Drift allowance, not a market observation"
      )
    );
  }

  steps.push(
    step(
      "Confidence range",
      "projected ± 8%",
      `${formatINR(prediction.low)} – ${formatINR(prediction.high)}`,
      `${formatINR(prediction.low)} – ${formatINR(prediction.high)}`,
      "A fixed spread, not a statistical interval"
    )
  );

  return {
    title: "How this rate projection was calculated",
    method:
      "A base rate with four percentage adjustments. A fixed formula — not a trained model, and not a market valuation.",
    basis:
      "Under RFCTLARR s.26 the market value for an award is the highest of the guideline value, the average of the top 50% of comparable sale deeds, or a consented amount. This projection is a planning aid and is none of those three.",
    steps,
    totalLabel: "Projected rate per hectare",
    total: `${formatINR(prediction.predictedRatePerHectare)} (${formatINRWords(prediction.predictedRatePerHectare)})`,
  };
}

/* ── Presets ──────────────────────────────────────────────────────────── */

export interface RatePreset {
  id: string;
  label: string;
  rationale: string;
  input: {
    state: string;
    district: string;
    currentRatePerHectare: number | null;
    monthsSinceRevision: number | null;
    parcelCount: number;
    classification?: string;
  };
}

export const RATE_PRESETS: RatePreset[] = [
  {
    id: "chennai-urban",
    label: "Chennai — urban, recently revised",
    rationale: "Metropolitan base, rate three months old. Almost no drift; the projection barely moves.",
    input: { state: "Tamil Nadu", district: "Chennai", currentRatePerHectare: 42_000_000, monthsSinceRevision: 3, parcelCount: 40, classification: "COMMERCIAL" },
  },
  {
    id: "sivaganga-stale",
    label: "Sivaganga — rate not revised in 4 years",
    rationale: "The drift term maxes out at 18%. Shows the cap doing its job on a stale rate.",
    input: { state: "Tamil Nadu", district: "Sivaganga", currentRatePerHectare: 3_800_000, monthsSinceRevision: 48, parcelCount: 74, classification: "NANJAI" },
  },
  {
    id: "unset-district",
    label: "New district — no rate on record",
    rationale: "Nothing notified yet. The answer names the band it fell back to instead of inventing precision.",
    input: { state: "Tamil Nadu", district: "Ariyalur", currentRatePerHectare: null, monthsSinceRevision: null, parcelCount: 12 },
  },
  {
    id: "koraput-tribal",
    label: "Koraput — scheduled area",
    rationale: "Remote band, full 4× multiplier. The lowest base in the table, and the highest multiplier.",
    input: { state: "Odisha", district: "Koraput", currentRatePerHectare: 2_100_000, monthsSinceRevision: 30, parcelCount: 56, classification: "PUNJAI" },
  },
  {
    id: "large-corridor",
    label: "Large corridor — 900 parcels",
    rationale: "The demand term is logarithmic, so a huge project adds 10% and not 900%.",
    input: { state: "Tamil Nadu", district: "Kanchipuram", currentRatePerHectare: 18_500_000, monthsSinceRevision: 14, parcelCount: 900, classification: "HOUSE_SITE" },
  },
  {
    id: "nonsense",
    label: "Deliberately bad input",
    rationale: "Negative rate, unknown district, future revision date. Every repair is listed under the answer.",
    input: { state: "Atlantis", district: "Nowhere", currentRatePerHectare: -500, monthsSinceRevision: -18, parcelCount: 0 },
  },
];

/** Turns a preset into the shape `predictLandRateSafe` takes. */
export function ratePresetToInput(preset: RatePreset, now: Date = new Date()): unknown {
  const lastSetAt =
    preset.input.monthsSinceRevision === null
      ? null
      : new Date(now.getTime() - preset.input.monthsSinceRevision * 30 * 24 * 60 * 60 * 1000);
  return {
    state: preset.input.state,
    district: preset.input.district,
    currentRatePerHectare: preset.input.currentRatePerHectare,
    lastSetAt,
    parcelCount: preset.input.parcelCount,
    classification: preset.input.classification,
  };
}

export function ratePreset(id: string): RatePreset | null {
  return RATE_PRESETS.find((p) => p.id === id) ?? null;
}

/* ── Policy comparison ───────────────────────────────────────────────── */

export interface MultiplierComparisonRow {
  multiplier: number;
  breakdown: CompensationBreakdown;
  perHectare: number;
  /** Difference from the lowest multiplier in the comparison. */
  deltaFromFirst: number;
}

export interface MultiplierComparison {
  areaHectares: number;
  ratePerHectare: number;
  assetsValue: number;
  yearsToAward: number;
  rows: MultiplierComparisonRow[];
  trace: FormulaTrace;
  notes: InputNote[];
}

/**
 * "If we move the multiplier from 2× to 3×, what does this project cost?"
 *
 * The First Schedule multiplier is a *state policy choice* between 1 and 2 for
 * rural land (and states commonly notify higher), which makes it the one number
 * in the whole award that a government audience can actually decide to change.
 * Answering the question with a table rather than a paragraph is the whole
 * point of the feature.
 *
 * The arithmetic is `calculateCompensation` — Lane C's award maths, the same
 * function the real awards run through — so this table cannot drift from what
 * the project workspace shows.
 */
export function compareMultiplierPolicy(
  raw: unknown,
  multipliers: number[] = [1, 1.5, 2, 3, 4]
): MultiplierComparison {
  const notes: InputNote[] = [];

  const areaParsed = parseExtentHectares(fieldAny(raw, ["areaHectares", "area", "extent"]));
  notes.push(...areaParsed.notes);
  let area = areaParsed.value ?? 0;
  if (area <= 0) {
    area = 1;
    notes.push(
      note("Area", fieldAny(raw, ["areaHectares", "area", "extent"]), "No usable extent — computed for 1 hectare so the per-hectare effect is still visible.")
    );
  }
  if (area > 100_000) {
    notes.push(note("Area", area, "Above the supported maximum — capped at 100,000 ha."));
    area = 100_000;
  }

  const rateClamped = clampNumber(
    fieldAny(raw, ["ratePerHectare", "rate"]),
    "Rate per hectare",
    1_000,
    MAX_RATE,
    GENERIC_FALLBACK
  );
  notes.push(...rateClamped.notes);

  const assetsClamped = clampNumber(
    fieldAny(raw, ["assetsValue", "assets"]),
    "Assets value",
    0,
    1_000_000_000,
    0
  );
  notes.push(...assetsClamped.notes);

  const yearsClamped = clampNumber(
    fieldAny(raw, ["yearsToAward", "years"]),
    "Years from notification to award",
    0,
    30,
    1
  );
  notes.push(...yearsClamped.notes);

  const sIANotificationDate = new Date(2020, 0, 1);
  const awardDate = new Date(
    sIANotificationDate.getTime() + yearsClamped.value * 365.25 * 24 * 60 * 60 * 1000
  );

  const cleanMultipliers = Array.from(
    new Set(
      multipliers
        .map((m) => (Number.isFinite(m) ? Math.min(6, Math.max(1, m)) : null))
        .filter((m): m is number => m !== null)
    )
  ).sort((a, b) => a - b);

  const rows: MultiplierComparisonRow[] = cleanMultipliers.map((multiplier) => {
    const breakdown = calculateCompensation({
      areaHectares: area,
      ratePerHectare: rateClamped.value,
      multiplier,
      assetsValue: assetsClamped.value,
      sIANotificationDate,
      awardDate,
    });
    return {
      multiplier,
      breakdown,
      perHectare: breakdown.total / area,
      deltaFromFirst: 0,
    };
  });
  const first = rows[0]?.breakdown.total ?? 0;
  for (const row of rows) row.deltaFromFirst = row.breakdown.total - first;

  const trace: FormulaTrace = {
    title: "Multiplier policy comparison",
    method:
      "The First Schedule award formula evaluated once per multiplier. Identical arithmetic to the award shown on a real parcel.",
    basis:
      "RFCTLARR First Schedule with s.26 (market value), s.29 (assets), s.30(1) (100% solatium) and s.30(3) (12% p.a. interest).",
    steps: [
      step("Market value", "area × rate", `${area} ha × ${formatINR(rateClamped.value)}`, formatINR(area * rateClamped.value), "s.26"),
      step("Multiplied market value", "market value × multiplier", `${formatINR(area * rateClamped.value)} × multiplier`, "varies by row", "First Schedule"),
      step("Assets attached to the land", "+ assets", `+ ${formatINR(assetsClamped.value)}`, formatINR(assetsClamped.value), "s.29"),
      step("Solatium", "(multiplied market value + assets) × 100%", "× 1.00", "equal to the amount above it", "s.30(1)"),
      step("Interest", "market value × 12% × years", `${formatINR(area * rateClamped.value)} × 12% × ${yearsClamped.value}`, formatINR(area * rateClamped.value * 0.12 * yearsClamped.value), "s.30(3)"),
    ],
    totalLabel: "Total award, per multiplier",
    total: rows
      .map((r) => `${r.multiplier}× → ${formatINRWords(r.breakdown.total)}`)
      .join("  ·  "),
  };

  return {
    areaHectares: area,
    ratePerHectare: rateClamped.value,
    assetsValue: assetsClamped.value,
    yearsToAward: yearsClamped.value,
    rows,
    trace,
    notes: mergeNotes(notes),
  };
}
