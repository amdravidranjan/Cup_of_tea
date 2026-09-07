import { describe, expect, it } from "vitest";
import {
  clampInt,
  clampNumber,
  formatINR,
  formatINRWords,
  looksLikeProbe,
  parseExtentHectares,
  parseFlexibleDate,
  parseIndianNumber,
  pastDateOnly,
  toSafeText,
} from "./input-guard";

/**
 * The contract under test is "nothing throws and every repair is reported",
 * so the cases are chosen to be the things a judge actually types rather than
 * a sweep of the type space: currency with words, extents in local units,
 * day-first dates, and the values that break naive parsers (`NaN`, `Infinity`,
 * `[]`, a 40,000-character paste).
 */

describe("parseIndianNumber", () => {
  it("reads plain numbers and numeric strings", () => {
    expect(parseIndianNumber(45)).toBe(45);
    expect(parseIndianNumber("45")).toBe(45);
    expect(parseIndianNumber(" 45.5 ")).toBe(45.5);
  });

  it("reads Indian currency formatting", () => {
    expect(parseIndianNumber("₹45,00,000")).toBe(4_500_000);
    expect(parseIndianNumber("Rs. 1,20,000")).toBe(120_000);
    expect(parseIndianNumber("INR 5000")).toBe(5000);
  });

  it("reads lakh and crore", () => {
    expect(parseIndianNumber("45 lakh")).toBe(4_500_000);
    expect(parseIndianNumber("1.2 crore")).toBe(12_000_000);
    expect(parseIndianNumber("2 cr")).toBe(20_000_000);
  });

  it("strips per-hectare suffixes rather than choking on them", () => {
    expect(parseIndianNumber("42,00,000 per hectare")).toBe(4_200_000);
    expect(parseIndianNumber("38,00,000/ha")).toBe(3_800_000);
  });

  it("returns null rather than zero when nothing numeric is present", () => {
    // Zero is a meaningful answer for most of these fields, so guessing it
    // would hide the fact that the field was never filled in.
    expect(parseIndianNumber("abcd")).toBeNull();
    expect(parseIndianNumber("")).toBeNull();
    expect(parseIndianNumber(undefined)).toBeNull();
    expect(parseIndianNumber(null)).toBeNull();
    expect(parseIndianNumber({})).toBeNull();
    expect(parseIndianNumber([])).toBeNull();
    expect(parseIndianNumber(NaN)).toBeNull();
    expect(parseIndianNumber(Infinity)).toBeNull();
  });
});

describe("clampInt", () => {
  it("clamps below the floor and says so", () => {
    const result = clampInt(-5, "Open grievances", 0, 100);
    expect(result.value).toBe(0);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].message).toContain("below 0");
  });

  it("caps above the ceiling and says so", () => {
    const result = clampInt(1e9, "Total parcels", 0, 1000);
    expect(result.value).toBe(1000);
    expect(result.notes[0].severity).toBe("adjusted");
  });

  it("reports unparseable input as rejected, not silently zeroed", () => {
    const result = clampInt("many", "Open grievances", 0, 100);
    expect(result.value).toBe(0);
    expect(result.notes[0].severity).toBe("rejected");
  });

  it("stays quiet for an empty field, which is not an error", () => {
    expect(clampInt("", "Open grievances", 0, 100).notes).toHaveLength(0);
    expect(clampInt(undefined, "Open grievances", 0, 100).notes).toHaveLength(0);
  });
});

describe("clampNumber", () => {
  it("keeps decimals that clampInt would round", () => {
    expect(clampNumber("2.5", "Multiplier", 1, 4).value).toBe(2.5);
  });
});

describe("parseExtentHectares", () => {
  it("treats a bare number as hectares, matching the upload templates", () => {
    const result = parseExtentHectares("0.84");
    expect(result.value).toBeCloseTo(0.84, 4);
  });

  it("converts acres and cents", () => {
    expect(parseExtentHectares("2.08 acres").value).toBeCloseTo(0.8417, 3);
    expect(parseExtentHectares("37 cents").value).toBeCloseTo(0.1497, 3);
  });

  it("reads the hectare-are-square-metre form a chitta prints", () => {
    const result = parseExtentHectares("0-84-00");
    expect(result.value).toBeCloseTo(0.84, 4);
    expect(result.notes[0].message).toContain("hectare-are-sqm");
  });

  it("converts square metres, square feet and grounds", () => {
    expect(parseExtentHectares("8400 sqm").value).toBeCloseTo(0.84, 4);
    expect(parseExtentHectares("2400 sq ft").value).toBeCloseTo(0.0223, 3);
    expect(parseExtentHectares("1 ground").value).toBeCloseTo(0.0223, 3);
  });

  it("returns null for nonsense and for negatives", () => {
    expect(parseExtentHectares("plenty").value).toBeNull();
    expect(parseExtentHectares("-3").value).toBeNull();
    expect(parseExtentHectares(undefined).value).toBeNull();
  });
});

describe("parseFlexibleDate", () => {
  it("reads ISO dates", () => {
    expect(parseFlexibleDate("2026-04-01").value?.getUTCFullYear()).toBe(2026);
    expect(parseFlexibleDate("2026-04-01").value?.getUTCMonth()).toBe(3);
  });

  it("reads day-first dates, as every Indian form prints them", () => {
    const result = parseFlexibleDate("01-04-2026");
    expect(result.value?.getUTCDate()).toBe(1);
    expect(result.value?.getUTCMonth()).toBe(3);
    expect(result.notes[0].message).toContain("day-month-year");
  });

  it("rejects an invalid Date object rather than propagating NaN", () => {
    const result = parseFlexibleDate(new Date("nonsense"));
    expect(result.value).toBeNull();
    expect(result.notes[0].severity).toBe("rejected");
  });

  it("returns null for junk", () => {
    expect(parseFlexibleDate("32-13-2026").value).toBeNull();
    expect(parseFlexibleDate("").value).toBeNull();
    expect(parseFlexibleDate({}).value).toBeNull();
  });
});

describe("pastDateOnly", () => {
  it("pulls a future date back to today, because elapsed time cannot be negative", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const result = pastDateOnly("2030-01-01", "Rate last revised", now);
    expect(result.value).toEqual(now);
    expect(result.notes.some((n) => n.message.includes("future"))).toBe(true);
  });

  it("leaves a past date alone", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const result = pastDateOnly("2024-01-01", "Rate last revised", now);
    expect(result.value?.getUTCFullYear()).toBe(2024);
  });
});

describe("toSafeText", () => {
  it("collapses whitespace and strips tags", () => {
    expect(toSafeText("  hello   <b>world</b> ").value).toBe("hello world");
  });

  it("truncates a huge paste and reports the truncation", () => {
    const result = toSafeText("x".repeat(40_000), 2000);
    expect(result.value).toHaveLength(2000);
    expect(result.notes[0].message).toContain("first 2000");
  });

  it("returns an empty string for non-text without throwing", () => {
    expect(toSafeText(undefined).value).toBe("");
    expect(toSafeText(null).value).toBe("");
    expect(toSafeText({}).value).toBe("");
    expect(toSafeText(42).value).toBe("42");
  });
});

describe("looksLikeProbe", () => {
  it("recognises the strings people type to test an input", () => {
    expect(looksLikeProbe("' OR 1=1 --")).toBe(true);
    expect(looksLikeProbe("<script>alert(1)</script>")).toBe(true);
    expect(looksLikeProbe("{{7*7}}")).toBe(true);
    expect(looksLikeProbe("../../etc/passwd")).toBe(true);
  });

  it("does not flag ordinary questions", () => {
    expect(looksLikeProbe("how much compensation will I get")).toBe(false);
    expect(looksLikeProbe("survey number 142/2B")).toBe(false);
  });
});

describe("currency formatting", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(4_500_000)).toBe("₹45,00,000");
  });

  it("speaks in lakh and crore the way an officer does", () => {
    expect(formatINRWords(4_500_000)).toBe("₹45.0 lakh");
    expect(formatINRWords(12_000_000)).toBe("₹1.20 crore");
    expect(formatINRWords(5000)).toBe("₹5,000");
  });

  it("does not emit NaN", () => {
    expect(formatINR(NaN)).toBe("₹0");
    expect(formatINRWords(Infinity)).toBe("₹0");
  });
});
