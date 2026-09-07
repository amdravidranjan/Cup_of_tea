import { describe, expect, it } from "vitest";
import { assessProjectRisk } from "./risk-score";

const baseInput = {
  openGrievances: 0,
  totalGrievances: 10,
  slaBreached: 0,
  slaAtRisk: 0,
  slaOnTrack: 10,
  vulnerableFamilies: 0,
  totalFamilies: 10,
  parcelsPossessed: 10,
  totalParcels: 10,
  openLegalDisputes: 0,
  stage: "Acquisition",
};

describe("assessProjectRisk", () => {
  it("returns Low risk when there are no adverse signals", () => {
    const result = assessProjectRisk(baseInput);

    expect(result.band).toBe("Low");
    expect(result.score).toBe(0);
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].label).toBe("No adverse signals");
  });

  it("increases risk when grievances are open", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: 5,
    });

    expect(result.score).toBe(10);
    expect(result.band).toBe("Moderate");
    expect(result.factors[0].label).toBe("Open grievances");
  });

  it("caps open grievances at the total number of grievances", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: 20,
      totalGrievances: 10,
    });

    expect(result.score).toBe(20);
  });

  it("adds risk for SLA breaches", () => {
    const result = assessProjectRisk({
      ...baseInput,
      slaBreached: 1,
    });

    expect(result.score).toBe(12);
    expect(result.factors[0].label).toBe("SLA breaches");
  });

  it("caps SLA breach contribution at 25 points", () => {
    const result = assessProjectRisk({
      ...baseInput,
      slaBreached: 10,
    });

    expect(result.score).toBe(25);
  });

  it("adds risk for SLAs approaching their deadline", () => {
    const result = assessProjectRisk({
      ...baseInput,
      slaAtRisk: 2,
    });

    expect(result.score).toBe(12);
    expect(result.factors[0].label).toBe("SLA at risk");
  });

  it("adds risk for vulnerable families", () => {
    const result = assessProjectRisk({
      ...baseInput,
      vulnerableFamilies: 5,
    });

    expect(result.score).toBe(8);
    expect(result.factors[0].label).toBe(
      "Vulnerable-household share"
    );
  });

  it("caps vulnerable families at the total number of families", () => {
    const result = assessProjectRisk({
      ...baseInput,
      vulnerableFamilies: 20,
      totalFamilies: 10,
    });

    expect(result.score).toBe(15);
  });

  it("adds risk when land parcels are not possessed", () => {
    const result = assessProjectRisk({
      ...baseInput,
      parcelsPossessed: 5,
      totalParcels: 10,
    });

    expect(result.score).toBe(10);
    expect(result.factors[0].label).toBe(
      "Land not yet possessed"
    );
  });

  it("returns zero land risk when all parcels are possessed", () => {
    const result = assessProjectRisk({
      ...baseInput,
      parcelsPossessed: 10,
      totalParcels: 10,
    });

    expect(result.score).toBe(0);
  });

  it("adds significant risk for active litigation", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openLegalDisputes: 1,
    });

    expect(result.score).toBe(15);
    expect(result.factors[0].label).toBe("Active litigation");
  });

  it("caps litigation contribution at 30 points", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openLegalDisputes: 10,
    });

    expect(result.score).toBe(30);
  });

  it("can classify a project as High risk", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: 8,
      slaBreached: 2,
      slaAtRisk: 1,
      vulnerableFamilies: 5,
      parcelsPossessed: 5,
      openLegalDisputes: 1,
    });

    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.band).toBe("High");
  });

  it("can classify a project as Critical risk", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: 10,
      slaBreached: 5,
      slaAtRisk: 3,
      vulnerableFamilies: 10,
      parcelsPossessed: 0,
      openLegalDisputes: 3,
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.band).toBe("Critical");
  });

  it("handles negative judge inputs safely", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: -10,
      totalGrievances: -5,
      slaBreached: -2,
      slaAtRisk: -3,
      vulnerableFamilies: -4,
      totalFamilies: -10,
      parcelsPossessed: -5,
      totalParcels: -10,
      openLegalDisputes: -2,
    });

    expect(result.score).toBe(5);
    expect(result.band).toBe("Low");
  });

  it("handles NaN and Infinity safely", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: NaN,
      totalGrievances: Infinity,
      slaBreached: NaN,
      slaAtRisk: Infinity,
      vulnerableFamilies: NaN,
      totalFamilies: Infinity,
      parcelsPossessed: NaN,
      totalParcels: Infinity,
      openLegalDisputes: NaN,
    });

    expect(result.score).toBe(0);
    expect(result.band).toBe("Low");
  });

  it("never returns a score below 0 or above 100", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: 1000,
      totalGrievances: 1000,
      slaBreached: 1000,
      slaAtRisk: 1000,
      vulnerableFamilies: 1000,
      totalFamilies: 1000,
      parcelsPossessed: 0,
      totalParcels: 1000,
      openLegalDisputes: 1000,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("sorts risk factors from highest to lowest contribution", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openGrievances: 5,
      slaBreached: 1,
      slaAtRisk: 1,
      vulnerableFamilies: 2,
      parcelsPossessed: 5,
      openLegalDisputes: 1,
    });

    for (let i = 1; i < result.factors.length; i++) {
      expect(result.factors[i - 1].points).toBeGreaterThanOrEqual(
        result.factors[i].points
      );
    }
  });

  it("provides a summary matching the risk band", () => {
    const result = assessProjectRisk({
      ...baseInput,
      openLegalDisputes: 5,
      slaBreached: 2,
    });

    expect(result.band).toBe("Critical");
    expect(result.summary).toContain("priority review");
  });
});