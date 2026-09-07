import { describe, expect, it } from "vitest";
import {
  RISK_PRESETS,
  assessProjectRiskSafe,
  coerceRiskInput,
  explainRisk,
  riskWhatIf,
} from "./risk-score-sandbox";
import { assessProjectRisk } from "./risk-score";

/**
 * Two things matter here and the tests are split along them.
 *
 * The coercion tests prove a judge cannot produce a page that crashes or a
 * score that is silently wrong. The cross-field cases are the interesting ones:
 * "40 open out of 12 filed" is what someone types when they change one box and
 * not the other, and a scorer that divides those produces a share above 1.
 *
 * The scoring tests prove the sandbox has not accidentally become a second
 * implementation of the scorer — it must call the real one, so a preset scored
 * through the sandbox and through `assessProjectRisk` directly must agree.
 */

const CLEAN = {
  openGrievances: 2,
  totalGrievances: 10,
  slaBreached: 0,
  slaAtRisk: 0,
  slaOnTrack: 4,
  vulnerableFamilies: 5,
  totalFamilies: 50,
  parcelsPossessed: 40,
  totalParcels: 50,
  openLegalDisputes: 0,
  stage: "POSSESSION",
};

describe("coerceRiskInput", () => {
  it("accepts anything at all without throwing", () => {
    for (const input of [undefined, null, "", 42, [], {}, "text", NaN, () => {}]) {
      expect(() => coerceRiskInput(input)).not.toThrow();
      expect(coerceRiskInput(input).input.stage).toBeTypeOf("string");
    }
  });

  it("clamps negatives to zero and reports it", () => {
    const result = coerceRiskInput({ ...CLEAN, openLegalDisputes: -4 });
    expect(result.input.openLegalDisputes).toBe(0);
    expect(result.notes.some((n) => n.field === "Open legal disputes")).toBe(true);
  });

  it("caps absurd magnitudes", () => {
    const result = coerceRiskInput({ ...CLEAN, totalParcels: 1e12 });
    expect(result.input.totalParcels).toBe(1_000_000);
  });

  it("reduces open grievances that exceed the number filed", () => {
    const result = coerceRiskInput({ ...CLEAN, openGrievances: 40, totalGrievances: 12 });
    expect(result.input.openGrievances).toBe(12);
    expect(result.notes.some((n) => n.message.includes("Cannot exceed"))).toBe(true);
  });

  it("reads a blank total as 'all of them open' rather than dropping the field", () => {
    // The charitable reading of someone who filled in one box: they meant
    // every grievance is open, not that there are no grievances.
    const result = coerceRiskInput({ ...CLEAN, openGrievances: 7, totalGrievances: 0 });
    expect(result.input.totalGrievances).toBe(7);
    expect(result.input.openGrievances).toBe(7);
    expect(result.notes.some((n) => n.message.includes("all still open"))).toBe(true);
  });

  it("applies the same repair to families and parcels", () => {
    const result = coerceRiskInput({
      ...CLEAN,
      vulnerableFamilies: 80,
      totalFamilies: 20,
      parcelsPossessed: 90,
      totalParcels: 20,
    });
    expect(result.input.vulnerableFamilies).toBe(20);
    expect(result.input.parcelsPossessed).toBe(20);
  });

  it("normalises a typed stage and notes an unknown one without failing", () => {
    expect(coerceRiskInput({ ...CLEAN, stage: "notified" }).input.stage).toBe("NOTIFIED");
    expect(coerceRiskInput({ ...CLEAN, stage: "rr in progress" }).input.stage).toBe("RR_IN_PROGRESS");

    const unknown = coerceRiskInput({ ...CLEAN, stage: "banana" });
    expect(unknown.input.stage).toBe("BANANA");
    expect(unknown.notes.some((n) => n.field === "Stage")).toBe(true);
  });

  it("reads snake_case keys, since a form post and a JSON paste differ", () => {
    const result = coerceRiskInput({ open_grievances: 3, total_grievances: 9 });
    expect(result.input.openGrievances).toBe(3);
    expect(result.input.totalGrievances).toBe(9);
  });
});

describe("assessProjectRiskSafe", () => {
  it("produces a score in range for every preset", () => {
    for (const preset of RISK_PRESETS) {
      const result = assessProjectRiskSafe(preset.input);
      expect(result.assessment.score).toBeGreaterThanOrEqual(0);
      expect(result.assessment.score).toBeLessThanOrEqual(100);
    }
  });

  it("delegates to the real scorer rather than reimplementing it", () => {
    // If this ever fails, the sandbox has grown its own arithmetic and the
    // demo can disagree with the product in front of a judge. Presets that
    // coercion has to repair are excluded — for those, differing from the raw
    // scorer is the whole point, and the next test covers them.
    for (const preset of RISK_PRESETS) {
      const viaSandbox = assessProjectRiskSafe(preset.input);
      if (viaSandbox.notes.length > 0) continue;
      const direct = assessProjectRisk(preset.input);
      expect(viaSandbox.assessment.score).toBe(direct.score);
      expect(viaSandbox.assessment.band).toBe(direct.band);
    }
  });

  it("protects the scorer from impossible counts that would produce absurd terms", () => {
    // Fed raw, the contradictory preset makes the scorer emit a +67 grievance
    // term (40 open ÷ 12 filed) and a *negative* 70-point possession term
    // (1 − 90 ÷ 20). Both are nonsense, and the second means "more possessed
    // than exists" reads as risk-reducing. This is why coercion exists.
    const contradictory = RISK_PRESETS.find((p) => p.id === "contradictory")!;

    const raw = assessProjectRisk(contradictory.input);
    expect(raw.factors.some((f) => f.points > 25)).toBe(true);
    expect(raw.factors.some((f) => f.points < 0)).toBe(true);

    const guarded = assessProjectRiskSafe(contradictory.input);
    for (const factor of guarded.assessment.factors) {
      expect(factor.points).toBeGreaterThanOrEqual(0);
      expect(factor.points).toBeLessThanOrEqual(30);
    }
    expect(guarded.notes.length).toBeGreaterThan(0);
  });

  it("caps at 100 when the terms sum past it", () => {
    const worst = RISK_PRESETS.find((p) => p.id === "worst-case")!;
    expect(assessProjectRiskSafe(worst.input).assessment.score).toBe(100);
  });

  it("scores an all-zero project above zero, because no data is not no risk", () => {
    const allZero = RISK_PRESETS.find((p) => p.id === "all-zero")!;
    const result = assessProjectRiskSafe(allZero.input);
    expect(result.assessment.score).toBe(5);
    expect(result.assessment.factors[0].label).toBe("No adverse signals");
  });

  it("surfaces repair notes for the contradictory preset", () => {
    const contradictory = RISK_PRESETS.find((p) => p.id === "contradictory")!;
    const result = assessProjectRiskSafe(contradictory.input);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("is deterministic — the same input always gives the same score", () => {
    const first = assessProjectRiskSafe(CLEAN).assessment.score;
    const second = assessProjectRiskSafe(CLEAN).assessment.score;
    expect(first).toBe(second);
  });

  it("always returns a trace with a total, even from junk input", () => {
    const result = assessProjectRiskSafe("garbage");
    expect(result.trace.total).toBeTruthy();
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });
});

describe("explainRisk", () => {
  it("writes one step per contributing term with the numbers substituted", () => {
    const input = coerceRiskInput(CLEAN).input;
    const trace = explainRisk(input, assessProjectRisk(input));
    const grievanceStep = trace.steps.find((s) => s.label === "Open grievances");
    expect(grievanceStep?.substitution).toBe("2 ÷ 10 × 20");
    expect(grievanceStep?.result).toBe("+4");
  });

  it("states that it is a formula and not a model", () => {
    const input = coerceRiskInput(CLEAN).input;
    const trace = explainRisk(input, assessProjectRisk(input));
    expect(trace.method.toLowerCase()).toContain("not a trained model");
  });
});

describe("riskWhatIf", () => {
  it("lowers the score when grievances are resolved", () => {
    const input = coerceRiskInput(CLEAN).input;
    const resolved = riskWhatIf(input).find((d) => d.label.includes("Resolve every"));
    expect(resolved!.change).toBeLessThan(0);
  });

  it("raises the score when a court case is added", () => {
    const input = coerceRiskInput(CLEAN).input;
    const litigation = riskWhatIf(input).find((d) => d.label.includes("court case"));
    expect(litigation!.change).toBeGreaterThan(0);
  });

  it("attributes each movement to a single lever", () => {
    const input = coerceRiskInput(CLEAN).input;
    const deltas = riskWhatIf(input);
    expect(deltas).toHaveLength(6);
    expect(new Set(deltas.map((d) => d.before)).size).toBe(1);
  });
});

describe("presets", () => {
  it("has a unique id and a rationale for every entry", () => {
    const ids = RISK_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of RISK_PRESETS) {
      expect(preset.rationale.length).toBeGreaterThan(20);
    }
  });

  it("covers all four bands, so a judge can see the whole gauge without typing", () => {
    // Without a Moderate and a High preset the gauge reads as binary, which
    // makes the score look like a pass/fail flag rather than a scale.
    const bands = RISK_PRESETS.map((p) => assessProjectRiskSafe(p.input).assessment.band);
    for (const band of ["Low", "Moderate", "High", "Critical"]) {
      expect(bands).toContain(band);
    }
  });
});
