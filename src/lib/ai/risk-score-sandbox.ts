/**
 * Making the risk score something a judge can push on.
 *
 * `risk-score.ts` computes a defensible number from a project's real signals,
 * but on the demo laptop it only ever sees one project's numbers at a time and
 * a judge cannot change them — the inputs are database counts. The first
 * question at a table is always "what if there were more grievances?", and the
 * honest answer is a form they can type into.
 *
 * Three things live here and nothing else:
 *
 *  - `assessProjectRiskSafe` — the same scorer, but it cannot be crashed. It
 *    takes `unknown`, repairs it, and reports every repair.
 *  - `explainRisk` — the weighted formula written out with the numbers in, so
 *    the score is checkable by hand.
 *  - `RISK_PRESETS` — the scenarios a judge would think to try, one click each,
 *    including the two that break naive implementations (all-zero, and
 *    contradictory counts).
 *
 * The scoring itself is deliberately *not* reimplemented here. It is imported.
 * A sandbox that computed its own score would let the demo and the product
 * disagree, which is the one failure mode that would actually cost us the
 * "deterministic and explainable" claim.
 */

import {
  assessProjectRisk,
  type RiskAssessment,
  type RiskAssessmentInput,
} from "@/lib/ai/risk-score";
import {
  clampInt,
  describe,
  fieldAny,
  mergeNotes,
  note,
  toSafeText,
  type InputNote,
} from "@/lib/ai/input-guard";
import { step, type FormulaTrace } from "@/lib/ai/explain";

/** The weight table, stated once so the UI, the trace and the docs agree. */
export const RISK_WEIGHTS = {
  openGrievances: { max: 20, formula: "open ÷ total × 20" },
  slaBreached: { max: 25, formula: "min(25, breached × 12)" },
  slaAtRisk: { max: 15, formula: "min(15, at-risk × 6)" },
  vulnerableFamilies: { max: 15, formula: "vulnerable ÷ total × 15" },
  unpossessedLand: { max: 20, formula: "(1 − possessed ÷ total) × 20" },
  litigation: { max: 30, formula: "min(30, open disputes × 15)" },
} as const;

/** Score bands, matching `bandFor` in the scorer. Kept for the UI legend. */
export const RISK_BANDS = [
  { band: "Low", from: 0, to: 19, meaning: "Routine monitoring." },
  { band: "Moderate", from: 20, to: 44, meaning: "Watch this cycle." },
  { band: "High", from: 45, to: 69, meaning: "Needs a closer look now." },
  { band: "Critical", from: 70, to: 100, meaning: "Priority review; escalate." },
] as const;

/**
 * Ceilings, not opinions.
 *
 * These are set well above anything real — the largest seeded project has a
 * few hundred parcels — so a judge typing a plausible large number is never
 * told they are wrong. They exist to stop `1e309` and a pasted phone number
 * from becoming the score.
 */
const LIMITS = {
  grievances: 100_000,
  slaMetrics: 50,
  families: 100_000,
  parcels: 1_000_000,
  disputes: 1_000,
} as const;

/** Stages the scorer understands, used to normalise a typed stage name. */
const KNOWN_STAGES = [
  "DRAFT",
  "SCRUTINY",
  "SIA",
  "NOTIFIED",
  "STATE_APPROVED",
  "CENTRAL_APPROVED",
  "DECLARED",
  "AWARDED",
  "RR_IN_PROGRESS",
  "POSSESSION",
  "RR_COMPLETE",
];

export interface CoercedRiskInput {
  input: RiskAssessmentInput;
  notes: InputNote[];
}

/**
 * Anything at all in, a computable `RiskAssessmentInput` out.
 *
 * The interesting work is not the per-field clamping — it is the cross-field
 * repair afterwards. "40 open grievances out of 12 filed" is the single most
 * likely thing a judge types, because they change one box and not the other,
 * and a scorer that divides those produces a share above 1 and a score that
 * looks broken. Repairing the pair and *saying so* is the difference between
 * looking careless and looking careful.
 */
export function coerceRiskInput(raw: unknown): CoercedRiskInput {
  const openGrievances = clampInt(
    fieldAny(raw, ["openGrievances", "open_grievances", "open"]),
    "Open grievances",
    0,
    LIMITS.grievances,
    0
  );
  const totalGrievances = clampInt(
    fieldAny(raw, ["totalGrievances", "total_grievances", "grievances"]),
    "Total grievances",
    0,
    LIMITS.grievances,
    0
  );
  const slaBreached = clampInt(
    fieldAny(raw, ["slaBreached", "sla_breached", "breached"]),
    "SLA metrics breached",
    0,
    LIMITS.slaMetrics,
    0
  );
  const slaAtRisk = clampInt(
    fieldAny(raw, ["slaAtRisk", "sla_at_risk", "atRisk"]),
    "SLA metrics at risk",
    0,
    LIMITS.slaMetrics,
    0
  );
  const slaOnTrack = clampInt(
    fieldAny(raw, ["slaOnTrack", "sla_on_track", "onTrack"]),
    "SLA metrics on track",
    0,
    LIMITS.slaMetrics,
    0
  );
  const vulnerableFamilies = clampInt(
    fieldAny(raw, ["vulnerableFamilies", "vulnerable_families", "vulnerable"]),
    "Vulnerable families",
    0,
    LIMITS.families,
    0
  );
  const totalFamilies = clampInt(
    fieldAny(raw, ["totalFamilies", "total_families", "families"]),
    "Total families",
    0,
    LIMITS.families,
    0
  );
  const parcelsPossessed = clampInt(
    fieldAny(raw, ["parcelsPossessed", "parcels_possessed", "possessed"]),
    "Parcels possessed",
    0,
    LIMITS.parcels,
    0
  );
  const totalParcels = clampInt(
    fieldAny(raw, ["totalParcels", "total_parcels", "parcels"]),
    "Total parcels",
    0,
    LIMITS.parcels,
    0
  );
  const openLegalDisputes = clampInt(
    fieldAny(raw, ["openLegalDisputes", "open_legal_disputes", "disputes"]),
    "Open legal disputes",
    0,
    LIMITS.disputes,
    0
  );

  const rawStage = fieldAny(raw, ["stage", "currentStage"]);
  const stageText = toSafeText(rawStage, 40);
  let stage = stageText.value.toUpperCase().replace(/[\s-]+/g, "_");
  const stageNotes: InputNote[] = [...stageText.notes];
  if (stage === "") {
    stage = "DRAFT";
  } else if (!KNOWN_STAGES.includes(stage)) {
    stageNotes.push(
      note(
        "Stage",
        rawStage,
        "Not one of the eleven RFCTLARR stages — the score does not weight stage, so this is shown as typed and otherwise ignored.",
        "info"
      )
    );
  }

  const crossFieldNotes: InputNote[] = [];

  let open = openGrievances.value;
  let total = totalGrievances.value;
  if (open > total) {
    if (total === 0) {
      // The judge filled in "open" alone. Reading total as equal to open is the
      // charitable reading and produces the answer they were reaching for
      // (all grievances open) instead of dropping the field.
      total = open;
      crossFieldNotes.push(
        note(
          "Total grievances",
          describe(fieldAny(raw, ["totalGrievances", "total_grievances", "grievances"])),
          `Left blank while ${open} open were entered — read as ${open} filed, all still open.`
        )
      );
    } else {
      open = total;
      crossFieldNotes.push(
        note(
          "Open grievances",
          open,
          `Cannot exceed the ${total} grievances filed — reduced to ${total}.`
        )
      );
    }
  }

  let vulnerable = vulnerableFamilies.value;
  let familiesTotal = totalFamilies.value;
  if (vulnerable > familiesTotal) {
    if (familiesTotal === 0) {
      familiesTotal = vulnerable;
      crossFieldNotes.push(
        note(
          "Total families",
          describe(fieldAny(raw, ["totalFamilies", "total_families", "families"])),
          `Left blank while ${vulnerable} vulnerable were entered — read as ${vulnerable} families, all vulnerable.`
        )
      );
    } else {
      vulnerable = familiesTotal;
      crossFieldNotes.push(
        note("Vulnerable families", vulnerable, `Cannot exceed the ${familiesTotal} registered — reduced.`)
      );
    }
  }

  let possessed = parcelsPossessed.value;
  let parcelsTotal = totalParcels.value;
  if (possessed > parcelsTotal) {
    if (parcelsTotal === 0) {
      parcelsTotal = possessed;
      crossFieldNotes.push(
        note(
          "Total parcels",
          describe(fieldAny(raw, ["totalParcels", "total_parcels", "parcels"])),
          `Left blank while ${possessed} possessed were entered — read as ${possessed} parcels, all possessed.`
        )
      );
    } else {
      possessed = parcelsTotal;
      crossFieldNotes.push(
        note("Parcels possessed", possessed, `Cannot exceed the ${parcelsTotal} in the project — reduced.`)
      );
    }
  }

  return {
    input: {
      openGrievances: open,
      totalGrievances: total,
      slaBreached: slaBreached.value,
      slaAtRisk: slaAtRisk.value,
      slaOnTrack: slaOnTrack.value,
      vulnerableFamilies: vulnerable,
      totalFamilies: familiesTotal,
      parcelsPossessed: possessed,
      totalParcels: parcelsTotal,
      openLegalDisputes: openLegalDisputes.value,
      stage,
    },
    notes: mergeNotes(
      openGrievances.notes,
      totalGrievances.notes,
      slaBreached.notes,
      slaAtRisk.notes,
      slaOnTrack.notes,
      vulnerableFamilies.notes,
      totalFamilies.notes,
      parcelsPossessed.notes,
      totalParcels.notes,
      openLegalDisputes.notes,
      stageNotes,
      crossFieldNotes
    ),
  };
}

export interface SafeRiskResult {
  assessment: RiskAssessment;
  /** What was actually scored, after repairs. */
  input: RiskAssessmentInput;
  notes: InputNote[];
  trace: FormulaTrace;
}

/**
 * The scorer with a floor under it.
 *
 * If `assessProjectRisk` itself ever throws — it should not, but a page that
 * renders a stack trace to a judge is unrecoverable and a wrong-but-labelled
 * zero is not — the catch produces a visibly inconclusive result that says so.
 */
export function assessProjectRiskSafe(raw: unknown): SafeRiskResult {
  const coerced = coerceRiskInput(raw);
  try {
    const assessment = assessProjectRisk(coerced.input);
    return {
      assessment,
      input: coerced.input,
      notes: coerced.notes,
      trace: explainRisk(coerced.input, assessment),
    };
  } catch {
    const assessment: RiskAssessment = {
      score: 0,
      band: "Low",
      factors: [
        {
          label: "Score could not be computed",
          detail: "The inputs given could not be scored. Nothing was inferred in their place.",
          points: 0,
        },
      ],
      summary: "No score is being claimed for these inputs.",
    };
    return {
      assessment,
      input: coerced.input,
      notes: mergeNotes(coerced.notes, [
        note("Risk score", "—", "Scoring failed for these inputs; no score is being claimed.", "rejected"),
      ]),
      trace: {
        title: "Risk score",
        method: "Weighted sum of project signals",
        steps: [],
        totalLabel: "Score",
        total: "not computed",
      },
    };
  }
}

/** The score written out as arithmetic, term by term. */
export function explainRisk(input: RiskAssessmentInput, assessment: RiskAssessment): FormulaTrace {
  const steps = [];

  if (input.totalGrievances > 0) {
    const share = input.openGrievances / input.totalGrievances;
    steps.push(
      step(
        "Open grievances",
        RISK_WEIGHTS.openGrievances.formula,
        `${input.openGrievances} ÷ ${input.totalGrievances} × 20`,
        `+${Math.round(share * 20)}`,
        "Share of filed grievances still unresolved"
      )
    );
  }
  if (input.slaBreached > 0) {
    steps.push(
      step(
        "SLA breaches",
        RISK_WEIGHTS.slaBreached.formula,
        `min(25, ${input.slaBreached} × 12)`,
        `+${Math.min(25, input.slaBreached * 12)}`,
        "RFCTLARR statutory timelines — s.19(2), s.25, s.38"
      )
    );
  }
  if (input.slaAtRisk > 0) {
    steps.push(
      step(
        "SLA at risk",
        RISK_WEIGHTS.slaAtRisk.formula,
        `min(15, ${input.slaAtRisk} × 6)`,
        `+${Math.min(15, input.slaAtRisk * 6)}`,
        "Within 20% of a statutory deadline"
      )
    );
  }
  if (input.totalFamilies > 0) {
    const share = input.vulnerableFamilies / input.totalFamilies;
    steps.push(
      step(
        "Vulnerable-household share",
        RISK_WEIGHTS.vulnerableFamilies.formula,
        `${input.vulnerableFamilies} ÷ ${input.totalFamilies} × 15`,
        `+${Math.round(share * 15)}`,
        "SC/ST and other vulnerable groups — Second Schedule"
      )
    );
  }
  if (input.totalParcels > 0) {
    const unsecured = 1 - input.parcelsPossessed / input.totalParcels;
    steps.push(
      step(
        "Land not yet possessed",
        RISK_WEIGHTS.unpossessedLand.formula,
        `(1 − ${input.parcelsPossessed} ÷ ${input.totalParcels}) × 20`,
        `+${Math.round(unsecured * 20)}`,
        "Delivery exposure — s.38 possession"
      )
    );
  }
  if (input.openLegalDisputes > 0) {
    steps.push(
      step(
        "Active litigation",
        RISK_WEIGHTS.litigation.formula,
        `min(30, ${input.openLegalDisputes} × 15)`,
        `+${Math.min(30, input.openLegalDisputes * 15)}`,
        "Undisposed matters, including any stay order"
      )
    );
  }
  if (steps.length === 0) {
    steps.push(
      step(
        "No adverse signals",
        "floor of 5",
        "no grievances, no breaches, no litigation recorded",
        "+5",
        "A project with no data recorded is not the same as a project with no risk"
      )
    );
  }

  return {
    title: "How this risk score was calculated",
    method:
      "Weighted sum of six project signals, capped to 0–100. A fixed formula — not a trained model.",
    basis: "Weights are policy settings held in lib/ai/risk-score.ts, not learned from data.",
    steps,
    totalLabel: `Total (capped to 0–100) — ${assessment.band} risk`,
    total: `${assessment.score} / 100`,
  };
}

/* ── Presets ──────────────────────────────────────────────────────────── */

export interface RiskPreset {
  id: string;
  label: string;
  /** Why a judge would press this one. Shown under the button. */
  rationale: string;
  input: RiskAssessmentInput;
}

/**
 * The scenarios worth one click each.
 *
 * The last two are the point of the list. `all-zero` is what a judge gets by
 * clearing every box, and a scorer that returns 0 for it is claiming a project
 * with no data recorded is a safe project — so the floor of 5 and the "no
 * adverse signals" wording exist, and this preset is how we show that on
 * purpose. `contradictory` is the input that repairs itself, and pressing it
 * makes the repair notes appear, which is the feature.
 */
export const RISK_PRESETS: RiskPreset[] = [
  {
    id: "clean",
    label: "Well-run project",
    rationale: "Everything on track. Shows what Low looks like when it is earned, not assumed.",
    input: {
      openGrievances: 1,
      totalGrievances: 14,
      slaBreached: 0,
      slaAtRisk: 0,
      slaOnTrack: 4,
      vulnerableFamilies: 3,
      totalFamilies: 48,
      parcelsPossessed: 52,
      totalParcels: 56,
      openLegalDisputes: 0,
      stage: "POSSESSION",
    },
  },
  {
    id: "litigation",
    label: "Litigation-heavy",
    rationale: "Three undisposed matters. Litigation is the heaviest single term at 30 points.",
    input: {
      openGrievances: 9,
      totalGrievances: 22,
      slaBreached: 1,
      slaAtRisk: 1,
      slaOnTrack: 2,
      vulnerableFamilies: 11,
      totalFamilies: 60,
      parcelsPossessed: 18,
      totalParcels: 74,
      openLegalDisputes: 3,
      stage: "DECLARED",
    },
  },
  {
    id: "sla-collapse",
    label: "Statutory deadlines blown",
    rationale: "Every timeline breached. Shows the 25-point cap holding instead of running away.",
    input: {
      openGrievances: 16,
      totalGrievances: 19,
      slaBreached: 4,
      slaAtRisk: 0,
      slaOnTrack: 0,
      vulnerableFamilies: 8,
      totalFamilies: 40,
      parcelsPossessed: 4,
      totalParcels: 90,
      openLegalDisputes: 1,
      stage: "AWARDED",
    },
  },
  {
    id: "mid-acquisition",
    label: "Mid-acquisition, minor slippage",
    rationale: "The ordinary case: nothing broken, two deadlines tightening. Lands in Moderate.",
    input: {
      openGrievances: 5,
      totalGrievances: 15,
      slaBreached: 0,
      slaAtRisk: 2,
      slaOnTrack: 2,
      vulnerableFamilies: 6,
      totalFamilies: 40,
      parcelsPossessed: 30,
      totalParcels: 50,
      openLegalDisputes: 0,
      stage: "DECLARED",
    },
  },
  {
    id: "vulnerable-majority",
    label: "Mostly vulnerable households",
    rationale:
      "Tribal-belt profile: 44 of 50 families vulnerable, no litigation yet. Lands in High on R&R exposure alone.",
    input: {
      openGrievances: 6,
      totalGrievances: 12,
      slaBreached: 0,
      slaAtRisk: 2,
      slaOnTrack: 1,
      vulnerableFamilies: 44,
      totalFamilies: 50,
      parcelsPossessed: 22,
      totalParcels: 61,
      openLegalDisputes: 0,
      stage: "RR_IN_PROGRESS",
    },
  },
  {
    id: "nothing-possessed",
    label: "Awarded but no land taken",
    rationale: "Money decided, ground not secured — the classic stalled-project shape.",
    input: {
      openGrievances: 13,
      totalGrievances: 31,
      slaBreached: 2,
      slaAtRisk: 1,
      slaOnTrack: 1,
      vulnerableFamilies: 14,
      totalFamilies: 77,
      parcelsPossessed: 0,
      totalParcels: 120,
      openLegalDisputes: 2,
      stage: "AWARDED",
    },
  },
  {
    id: "worst-case",
    label: "Every signal at maximum",
    rationale: "Proves the cap: the terms sum past 100, and the score still reads 100.",
    input: {
      openGrievances: 500,
      totalGrievances: 500,
      slaBreached: 12,
      slaAtRisk: 12,
      slaOnTrack: 0,
      vulnerableFamilies: 300,
      totalFamilies: 300,
      parcelsPossessed: 0,
      totalParcels: 400,
      openLegalDisputes: 20,
      stage: "DECLARED",
    },
  },
  {
    id: "all-zero",
    label: "Brand-new project (all zeros)",
    rationale:
      "No data yet. Scores 5, not 0 — an empty file is unassessed, and the card says so rather than certifying it safe.",
    input: {
      openGrievances: 0,
      totalGrievances: 0,
      slaBreached: 0,
      slaAtRisk: 0,
      slaOnTrack: 0,
      vulnerableFamilies: 0,
      totalFamilies: 0,
      parcelsPossessed: 0,
      totalParcels: 0,
      openLegalDisputes: 0,
      stage: "DRAFT",
    },
  },
  {
    id: "contradictory",
    label: "Impossible numbers",
    rationale:
      "40 open out of 12 filed, 90 parcels possessed out of 20. Watch the repair notes appear under the score.",
    input: {
      openGrievances: 40,
      totalGrievances: 12,
      slaBreached: 2,
      slaAtRisk: 1,
      slaOnTrack: 1,
      vulnerableFamilies: 80,
      totalFamilies: 20,
      parcelsPossessed: 90,
      totalParcels: 20,
      openLegalDisputes: 1,
      stage: "notified",
    },
  },
];

export function riskPreset(id: string): RiskPreset | null {
  return RISK_PRESETS.find((p) => p.id === id) ?? null;
}

/* ── What-if ──────────────────────────────────────────────────────────── */

export interface RiskDelta {
  label: string;
  before: number;
  after: number;
  change: number;
  bandBefore: RiskAssessment["band"];
  bandAfter: RiskAssessment["band"];
}

/**
 * "If I resolved every grievance, what would this project score?"
 *
 * The state officer's actual question, and the one the risk card cannot answer
 * on its own. Each entry is a single-lever change so the answer attributes the
 * movement to one action rather than to a bundle of them.
 */
export function riskWhatIf(base: RiskAssessmentInput): RiskDelta[] {
  const baseline = assessProjectRisk(base);
  const scenarios: { label: string; mutate: (i: RiskAssessmentInput) => RiskAssessmentInput }[] = [
    {
      label: "Resolve every open grievance",
      mutate: (i) => ({ ...i, openGrievances: 0 }),
    },
    {
      label: "Clear all SLA breaches",
      mutate: (i) => ({ ...i, slaBreached: 0, slaOnTrack: i.slaOnTrack + i.slaBreached }),
    },
    {
      label: "Dispose of all litigation",
      mutate: (i) => ({ ...i, openLegalDisputes: 0 }),
    },
    {
      label: "Complete possession of all parcels",
      mutate: (i) => ({ ...i, parcelsPossessed: i.totalParcels }),
    },
    {
      label: "One more court case is filed",
      mutate: (i) => ({ ...i, openLegalDisputes: i.openLegalDisputes + 1 }),
    },
    {
      label: "Another deadline is breached",
      mutate: (i) => ({
        ...i,
        slaBreached: i.slaBreached + 1,
        slaAtRisk: Math.max(0, i.slaAtRisk - 1),
      }),
    },
  ];

  return scenarios.map((scenario) => {
    const after = assessProjectRisk(scenario.mutate(base));
    return {
      label: scenario.label,
      before: baseline.score,
      after: after.score,
      change: after.score - baseline.score,
      bandBefore: baseline.band,
      bandAfter: after.band,
    };
  });
}
