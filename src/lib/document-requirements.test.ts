import { describe, it, expect } from "vitest";
import { computeDocumentChecklist } from "./document-requirements";

const STAGES = [
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
] as const;

describe("computeDocumentChecklist", () => {
  it("only includes requirements at or before the current stage", () => {
    const items = computeDocumentChecklist("DRAFT", new Set(), [...STAGES]);
    expect(items.map((i) => i.category)).toEqual(["DPR", "DESIGN_DRAWING"]);
  });

  it("accumulates requirements as the project advances", () => {
    const items = computeDocumentChecklist("SIA", new Set(), [...STAGES]);
    expect(items.map((i) => i.category)).toEqual([
      "DPR",
      "DESIGN_DRAWING",
      "SITE_INVESTIGATION",
      "ROW_PLAN",
      "SIA_REPORT",
    ]);
  });

  it("marks a category satisfied when it has been uploaded", () => {
    const items = computeDocumentChecklist("DRAFT", new Set(["DPR"]), [...STAGES]);
    expect(items.find((i) => i.category === "DPR")?.satisfied).toBe(true);
    expect(items.find((i) => i.category === "DESIGN_DRAWING")?.satisfied).toBe(false);
  });

  it("does not include requirements for stages beyond the current one", () => {
    const items = computeDocumentChecklist("DRAFT", new Set(), [...STAGES]);
    expect(items.some((i) => i.category === "SIA_REPORT")).toBe(false);
  });
});
