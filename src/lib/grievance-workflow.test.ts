import { describe, it, expect } from "vitest";
import {
  transitionGrievance,
  getAvailableGrievanceActions,
  generateTrackingNumber,
} from "./grievance-workflow";

describe("transitionGrievance", () => {
  it("moves FILED to UNDER_REVIEW via START_REVIEW for district", () => {
    expect(transitionGrievance("FILED", "START_REVIEW", "district")).toBe("UNDER_REVIEW");
  });

  it("moves UNDER_REVIEW to RESOLVED via RESOLVE for state", () => {
    expect(transitionGrievance("UNDER_REVIEW", "RESOLVE", "state")).toBe("RESOLVED");
  });

  it("rejects an action not valid from the current status", () => {
    expect(() => transitionGrievance("FILED", "RESOLVE", "district")).toThrow();
  });

  it("rejects a role not allowed to perform the action", () => {
    expect(() => transitionGrievance("FILED", "START_REVIEW", "agency")).toThrow();
    expect(() => transitionGrievance("FILED", "START_REVIEW", "field")).toThrow();
    expect(() => transitionGrievance("FILED", "START_REVIEW", "central")).toThrow();
  });
});

describe("getAvailableGrievanceActions", () => {
  it("returns START_REVIEW for district/state at FILED", () => {
    expect(getAvailableGrievanceActions("FILED", "district")).toEqual(["START_REVIEW"]);
    expect(getAvailableGrievanceActions("FILED", "state")).toEqual(["START_REVIEW"]);
  });

  it("returns nothing for RESOLVED (terminal)", () => {
    expect(getAvailableGrievanceActions("RESOLVED", "district")).toEqual([]);
  });

  it("returns nothing for roles with no grievance permissions", () => {
    expect(getAvailableGrievanceActions("FILED", "agency")).toEqual([]);
    expect(getAvailableGrievanceActions("FILED", "central")).toEqual([]);
  });
});

describe("generateTrackingNumber", () => {
  it("matches the GRV-YYYY-XXXXXX format", () => {
    const tn = generateTrackingNumber();
    expect(tn).toMatch(/^GRV-\d{4}-[A-Z0-9]{6}$/);
  });

  it("excludes visually ambiguous characters (0, O, 1, I)", () => {
    for (let i = 0; i < 50; i++) {
      const tn = generateTrackingNumber();
      const code = tn.split("-")[2];
      expect(code).not.toMatch(/[0O1I]/);
    }
  });

  it("is not the same on every call", () => {
    const samples = new Set(Array.from({ length: 20 }, () => generateTrackingNumber()));
    expect(samples.size).toBeGreaterThan(1);
  });
});
