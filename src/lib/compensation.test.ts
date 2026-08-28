import { describe, it, expect } from "vitest";
import { calculateCompensation, resolveCompensationDates } from "./compensation";

describe("calculateCompensation", () => {
  it("computes market value, multiplier, solatium, and total with no interest when dates match", () => {
    const result = calculateCompensation({
      areaHectares: 2,
      ratePerHectare: 500_000,
      multiplier: 1.5,
      assetsValue: 0,
      sIANotificationDate: new Date("2026-01-01"),
      awardDate: new Date("2026-01-01"),
    });
    expect(result.marketValue).toBe(1_000_000);
    expect(result.multipliedMarketValue).toBe(1_500_000);
    expect(result.interest).toBe(0);
    expect(result.solatium).toBe(1_500_000);
    expect(result.total).toBe(3_000_000);
  });

  it("adds 12% p.a. interest on the base market value over the elapsed period", () => {
    const result = calculateCompensation({
      areaHectares: 2,
      ratePerHectare: 500_000,
      multiplier: 1.5,
      assetsValue: 0,
      sIANotificationDate: new Date("2025-01-01"),
      awardDate: new Date("2026-01-01"),
    });
    // 2025-01-01 to 2026-01-01 is 365 days, not exactly 365.25 (a full
    // Gregorian year average) — the interest is ~119,918, not exactly
    // 120,000. Precision -3 (tolerance ±500) tolerates that real-calendar
    // slack without being so loose it'd pass a wrong formula.
    expect(result.interest).toBeCloseTo(120_000, -3);
    expect(result.total).toBeCloseTo(3_120_000, -3);
  });

  it("includes assetsValue in solatium and total, but not in interest", () => {
    const result = calculateCompensation({
      areaHectares: 2,
      ratePerHectare: 500_000,
      multiplier: 1.5,
      assetsValue: 200_000,
      sIANotificationDate: new Date("2026-01-01"),
      awardDate: new Date("2026-01-01"),
    });
    expect(result.solatium).toBe(1_700_000);
    expect(result.total).toBe(3_400_000);
  });
});

describe("resolveCompensationDates", () => {
  it("returns null when the project hasn't reached AWARDED", () => {
    const history = [
      { action: "CREATE", toStage: "DRAFT", createdAt: new Date("2026-01-01") },
      { action: "SUBMIT", toStage: "SCRUTINY", createdAt: new Date("2026-01-02") },
    ];
    expect(resolveCompensationDates(history)).toBeNull();
  });

  it("returns null when SIA notification happened but the project isn't awarded yet", () => {
    const history = [
      { action: "COMPLETE", toStage: "NOTIFIED", createdAt: new Date("2026-01-05") },
    ];
    expect(resolveCompensationDates(history)).toBeNull();
  });

  it("resolves both dates once the project has been awarded", () => {
    const history = [
      { action: "CREATE", toStage: "DRAFT", createdAt: new Date("2026-01-01") },
      { action: "COMPLETE", toStage: "NOTIFIED", createdAt: new Date("2026-01-05") },
      { action: "STATE_APPROVE", toStage: "STATE_APPROVED", createdAt: new Date("2026-01-10") },
      { action: "PASS_AWARD", toStage: "AWARDED", createdAt: new Date("2026-06-01") },
    ];
    const dates = resolveCompensationDates(history);
    expect(dates?.sIANotificationDate).toEqual(new Date("2026-01-05"));
    expect(dates?.awardDate).toEqual(new Date("2026-06-01"));
  });
});
