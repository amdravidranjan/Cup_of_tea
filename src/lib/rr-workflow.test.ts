import { describe, it, expect } from "vitest";
import { transitionRR, getAvailableRRActions, RR_STAGES, type Role } from "./rr-workflow";

describe("transitionRR", () => {
  it("starts the workflow with COMPLETE_SURVEY by district", () => {
    expect(transitionRR(null, "COMPLETE_SURVEY", "district")).toBe("SURVEYED");
  });

  it("walks the full 6-step happy path", () => {
    let stage = transitionRR(null, "COMPLETE_SURVEY", "district");
    stage = transitionRR(stage, "COMPLETE_SCHEME", "district");
    stage = transitionRR(stage, "COMPLETE_HEARING", "district");
    stage = transitionRR(stage, "SUBMIT_TO_COLLECTOR", "district");
    stage = transitionRR(stage, "APPROVE_RR_SCHEME", "state");
    stage = transitionRR(stage, "PASS_RR_AWARD", "district");
    expect(stage).toBe("RR_AWARDED");
  });

  it("rejects an action not valid for the current stage", () => {
    expect(() => transitionRR(null, "PASS_RR_AWARD", "district")).toThrow(/no r&r transition/i);
  });

  it("rejects district attempting the government-approval step", () => {
    let stage = transitionRR(null, "COMPLETE_SURVEY", "district");
    stage = transitionRR(stage, "COMPLETE_SCHEME", "district");
    stage = transitionRR(stage, "COMPLETE_HEARING", "district");
    stage = transitionRR(stage, "SUBMIT_TO_COLLECTOR", "district");
    expect(() => transitionRR(stage, "APPROVE_RR_SCHEME", "district" as Role)).toThrow(/role/i);
  });

  it("RR_STAGES lists all 6 stages in order", () => {
    expect(RR_STAGES).toHaveLength(6);
    expect(RR_STAGES[0]).toBe("SURVEYED");
    expect(RR_STAGES[RR_STAGES.length - 1]).toBe("RR_AWARDED");
  });
});

describe("getAvailableRRActions", () => {
  it("returns COMPLETE_SURVEY for district when the workflow has not started", () => {
    expect(getAvailableRRActions(null, "district")).toEqual(["COMPLETE_SURVEY"]);
  });

  it("returns nothing for a role with no valid action at that stage", () => {
    expect(getAvailableRRActions(null, "state")).toEqual([]);
  });

  it("returns APPROVE_RR_SCHEME for state at SUBMITTED_TO_COLLECTOR, nothing for district", () => {
    expect(getAvailableRRActions("SUBMITTED_TO_COLLECTOR", "state")).toEqual([
      "APPROVE_RR_SCHEME",
    ]);
    expect(getAvailableRRActions("SUBMITTED_TO_COLLECTOR", "district")).toEqual([]);
  });

  it("returns nothing at the terminal stage", () => {
    expect(getAvailableRRActions("RR_AWARDED", "district")).toEqual([]);
  });
});
