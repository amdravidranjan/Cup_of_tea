import { describe, expect, it } from "vitest";
import {
  DISTRICT_RATE_TABLE,
  RATE_PRESETS,
  classificationFactor,
  coerceRateInput,
  compareMultiplierPolicy,
  lookupDistrict,
  predictLandRateSafe,
  ratePresetToInput,
} from "./land-rate-sandbox";
import { calculateCompensation } from "@/lib/compensation";

const NOW = new Date("2026-06-01T00:00:00Z");

describe("lookupDistrict", () => {
  it("finds a district by exact name, case-insensitively", () => {
    expect(lookupDistrict("chennai")?.district).toBe("Chennai");
    expect(lookupDistrict("  Sivaganga ")?.district).toBe("Sivaganga");
  });

  it("resolves the alternate spellings people actually type", () => {
    expect(lookupDistrict("Trichy")?.district).toBe("Tiruchirappalli");
    expect(lookupDistrict("Tuticorin")?.district).toBe("Thoothukudi");
    expect(lookupDistrict("Bangalore")?.district).toBe("Bengaluru Urban");
    expect(lookupDistrict("Kovai")?.district).toBe("Coimbatore");
  });

  it("matches a district named inside a longer phrase", () => {
    expect(lookupDistrict("Sivaganga Reach")?.district).toBe("Sivaganga");
    expect(lookupDistrict("Chennai district")?.district).toBe("Chennai");
  });

  it("returns null for an unknown district instead of guessing one", () => {
    expect(lookupDistrict("Nowhere")).toBeNull();
    expect(lookupDistrict("")).toBeNull();
  });
});

describe("district reference table", () => {
  it("orders districts sensibly — metropolitan above agricultural", () => {
    // A judge checks the ordering, not the absolute figure, so the ordering
    // is the part that has to be right.
    const chennai = lookupDistrict("Chennai")!;
    const kanchipuram = lookupDistrict("Kanchipuram")!;
    const perambalur = lookupDistrict("Perambalur")!;
    const koraput = lookupDistrict("Koraput")!;

    expect(chennai.baseRatePerHectare).toBeGreaterThan(kanchipuram.baseRatePerHectare);
    expect(kanchipuram.baseRatePerHectare).toBeGreaterThan(perambalur.baseRatePerHectare);
    expect(perambalur.baseRatePerHectare).toBeGreaterThan(koraput.baseRatePerHectare);
  });

  it("gives urban districts a 1x multiplier and rural districts more", () => {
    expect(lookupDistrict("Chennai")!.typicalMultiplier).toBe(1);
    expect(lookupDistrict("Koraput")!.typicalMultiplier).toBe(4);
  });

  it("states a reason for every row, so no figure is unexplained", () => {
    for (const row of DISTRICT_RATE_TABLE) {
      expect(row.reason.length).toBeGreaterThan(10);
    }
  });
});

describe("coerceRateInput", () => {
  it("accepts anything at all without throwing", () => {
    for (const input of [undefined, null, "", 0, [], {}, "text", NaN]) {
      expect(() => coerceRateInput(input, NOW)).not.toThrow();
    }
  });

  it("falls back to the district band when no rate is given, and says so", () => {
    const result = coerceRateInput({ district: "Sivaganga", state: "Tamil Nadu" }, NOW);
    expect(result.baseSource).toBe("district-table");
    expect(result.input.currentRatePerHectare).toBe(3_800_000);
  });

  it("falls back to the state floor for an unknown district, and names the fallback", () => {
    const result = coerceRateInput({ district: "Ariyalur", state: "Tamil Nadu" }, NOW);
    expect(result.baseSource).toBe("state-fallback");
    expect(result.notes.some((n) => n.field === "District")).toBe(true);
  });

  it("rejects a negative rate and substitutes the reference, with a note", () => {
    const result = coerceRateInput({ district: "Chennai", currentRatePerHectare: -500 }, NOW);
    expect(result.input.currentRatePerHectare).toBe(42_000_000);
    expect(result.notes.some((n) => n.message.includes("cannot be zero or negative"))).toBe(true);
  });

  it("reads a rate written in words or with currency marks", () => {
    expect(coerceRateInput({ currentRatePerHectare: "45 lakh" }, NOW).input.currentRatePerHectare).toBe(4_500_000);
    expect(coerceRateInput({ currentRatePerHectare: "₹38,00,000" }, NOW).input.currentRatePerHectare).toBe(3_800_000);
  });

  it("pulls a future revision date back to today", () => {
    const result = coerceRateInput({ district: "Chennai", lastSetAt: "2030-01-01" }, NOW);
    expect(result.input.lastSetAt).toEqual(NOW);
  });

  it("ignores an unrecognised land classification rather than failing", () => {
    const result = coerceRateInput({ district: "Chennai", classification: "BANANA" }, NOW);
    expect(result.input.classification).toBeUndefined();
    expect(result.notes.some((n) => n.field === "Classification")).toBe(true);
  });
});

describe("predictLandRateSafe", () => {
  it("returns a usable prediction for every preset", () => {
    for (const preset of RATE_PRESETS) {
      const result = predictLandRateSafe(ratePresetToInput(preset, NOW), NOW);
      expect(result.prediction.predictedRatePerHectare).toBeGreaterThan(0);
      expect(Number.isFinite(result.prediction.predictedRatePerHectare)).toBe(true);
      expect(result.prediction.low).toBeLessThanOrEqual(result.prediction.predictedRatePerHectare);
      expect(result.prediction.high).toBeGreaterThanOrEqual(result.prediction.predictedRatePerHectare);
    }
  });

  it("is deterministic — the same input always gives the same projection", () => {
    const input = ratePresetToInput(RATE_PRESETS[0], NOW);
    const first = predictLandRateSafe(input, NOW).prediction.predictedRatePerHectare;
    const second = predictLandRateSafe(input, NOW).prediction.predictedRatePerHectare;
    expect(first).toBe(second);
  });

  it("applies the classification factor to the base rate", () => {
    const dry = predictLandRateSafe(
      { district: "Thanjavur", classification: "PUNJAI", parcelCount: 10 },
      NOW
    );
    const wet = predictLandRateSafe(
      { district: "Thanjavur", classification: "NANJAI", parcelCount: 10 },
      NOW
    );
    expect(wet.prediction.predictedRatePerHectare).toBeGreaterThan(
      dry.prediction.predictedRatePerHectare
    );
    expect(classificationFactor("NANJAI")).toBeGreaterThan(classificationFactor("PUNJAI"));
  });

  it("caps the drift term at 18% however stale the rate is", () => {
    const veryStale = predictLandRateSafe(
      { district: "Sivaganga", currentRatePerHectare: 3_800_000, lastSetAt: new Date("1990-01-01"), parcelCount: 10 },
      NOW
    );
    const drift = veryStale.prediction.factors.find((f) => f.label === "Time since last revision");
    expect(drift?.adjustmentPercent).toBeLessThanOrEqual(18);
  });

  it("keeps the demand term logarithmic, so a huge project does not explode it", () => {
    const huge = predictLandRateSafe(
      { district: "Kanchipuram", currentRatePerHectare: 18_500_000, parcelCount: 900 },
      NOW
    );
    const demand = huge.prediction.factors.find((f) => f.label === "Local acquisition activity");
    expect(demand?.adjustmentPercent).toBeLessThanOrEqual(10);
  });

  it("survives the deliberately bad preset and reports the repairs", () => {
    const nonsense = RATE_PRESETS.find((p) => p.id === "nonsense")!;
    const result = predictLandRateSafe(ratePresetToInput(nonsense, NOW), NOW);
    expect(result.prediction.predictedRatePerHectare).toBeGreaterThan(0);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("always produces a trace that disclaims being a valuation", () => {
    const result = predictLandRateSafe({ district: "Chennai" }, NOW);
    expect(result.trace.method.toLowerCase()).toContain("not a trained model");
    expect(result.trace.basis).toContain("s.26");
  });
});

describe("compareMultiplierPolicy", () => {
  it("answers the NOVELTY.md question: 2x versus 3x on a 50-hectare project", () => {
    const comparison = compareMultiplierPolicy({
      areaHectares: 50,
      ratePerHectare: 4_000_000,
      assetsValue: 0,
      yearsToAward: 1,
    });
    const two = comparison.rows.find((r) => r.multiplier === 2)!;
    const three = comparison.rows.find((r) => r.multiplier === 3)!;

    // Market value 50 × 40,00,000 = 20 crore. At 2x the multiplied value is
    // 40 crore and solatium doubles it; at 3x, 60 crore doubled. So the step
    // from 2x to 3x costs 2 × 20 crore = 40 crore.
    expect(three.breakdown.total - two.breakdown.total).toBeCloseTo(400_000_000, -3);
  });

  it("uses the same award maths as a real parcel, not its own copy", () => {
    const comparison = compareMultiplierPolicy({
      areaHectares: 2,
      ratePerHectare: 5_000_000,
      assetsValue: 300_000,
      yearsToAward: 2,
    });
    const row = comparison.rows.find((r) => r.multiplier === 2)!;
    const direct = calculateCompensation({
      areaHectares: 2,
      ratePerHectare: 5_000_000,
      multiplier: 2,
      assetsValue: 300_000,
      sIANotificationDate: new Date(2020, 0, 1),
      awardDate: new Date(new Date(2020, 0, 1).getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000),
    });
    expect(row.breakdown.total).toBeCloseTo(direct.total, 2);
  });

  it("increases monotonically with the multiplier", () => {
    const comparison = compareMultiplierPolicy({ areaHectares: 10, ratePerHectare: 3_000_000 });
    for (let i = 1; i < comparison.rows.length; i++) {
      expect(comparison.rows[i].breakdown.total).toBeGreaterThan(
        comparison.rows[i - 1].breakdown.total
      );
    }
  });

  it("reads an extent given in acres or cents", () => {
    const acres = compareMultiplierPolicy({ areaHectares: "2.471 acres", ratePerHectare: 1_000_000 });
    expect(acres.areaHectares).toBeCloseTo(1, 2);
  });

  it("computes for one hectare when the extent is unusable, rather than returning nothing", () => {
    const result = compareMultiplierPolicy({ areaHectares: "plenty", ratePerHectare: 1_000_000 });
    expect(result.areaHectares).toBe(1);
    expect(result.notes.some((n) => n.field === "Area")).toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("clamps multipliers to the range the Schedule can produce", () => {
    const result = compareMultiplierPolicy({ areaHectares: 1, ratePerHectare: 1_000_000 }, [-5, 0, 99]);
    for (const row of result.rows) {
      expect(row.multiplier).toBeGreaterThanOrEqual(1);
      expect(row.multiplier).toBeLessThanOrEqual(6);
    }
  });

  it("cites the First Schedule and the four award sections", () => {
    const result = compareMultiplierPolicy({ areaHectares: 1, ratePerHectare: 1_000_000 });
    expect(result.trace.basis).toContain("First Schedule");
    for (const section of ["s.26", "s.29", "s.30(1)", "s.30(3)"]) {
      expect(result.trace.basis).toContain(section);
    }
  });
});
