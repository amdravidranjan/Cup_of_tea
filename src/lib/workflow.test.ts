import { describe, it, expect } from "vitest";
import { transitionProject, STAGES, type Role } from "./workflow";

describe("transitionProject", () => {
  it("moves DRAFT to SCRUTINY on SUBMIT by an agency", () => {
    expect(transitionProject("DRAFT", "SUBMIT", "agency")).toBe("SCRUTINY");
  });

  it("moves SCRUTINY to SIA on APPROVE by district", () => {
    expect(transitionProject("SCRUTINY", "APPROVE", "district")).toBe("SIA");
  });

  it("moves SCRUTINY back to DRAFT on REJECT by district", () => {
    expect(transitionProject("SCRUTINY", "REJECT", "district")).toBe("DRAFT");
  });

  it("rejects an action not valid for the current stage", () => {
    expect(() => transitionProject("DRAFT", "PASS_AWARD", "district")).toThrow(
      /no transition/i
    );
  });

  it("rejects an actor whose role cannot perform the action", () => {
    expect(() => transitionProject("DRAFT", "SUBMIT", "field" as Role)).toThrow(
      /role/i
    );
  });

  it("walks the full happy path from DRAFT to RR_COMPLETE", () => {
    let stage = transitionProject("DRAFT", "SUBMIT", "agency");
    stage = transitionProject(stage, "APPROVE", "district");
    stage = transitionProject(stage, "COMPLETE", "district");
    stage = transitionProject(stage, "STATE_APPROVE", "state");
    stage = transitionProject(stage, "CENTRAL_APPROVE", "central");
    stage = transitionProject(stage, "PUBLISH_DECLARATION", "district");
    stage = transitionProject(stage, "PASS_AWARD", "district");
    stage = transitionProject(stage, "START_RR", "district");
    stage = transitionProject(stage, "COMPLETE_RR", "district");
    stage = transitionProject(stage, "COMPLETE_INFRASTRUCTURE", "district");
    expect(stage).toBe("RR_COMPLETE");
  });

  it("STAGES lists all 11 stages in order starting with DRAFT", () => {
    expect(STAGES[0]).toBe("DRAFT");
    expect(STAGES).toHaveLength(11);
    expect(STAGES[STAGES.length - 1]).toBe("RR_COMPLETE");
  });
});
