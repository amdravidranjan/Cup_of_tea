import { describe, it, expect } from "vitest";
import { toneBadgeClass, stageTone, compensationTone } from "./status-colors";

describe("toneBadgeClass", () => {
  it("returns distinct classes for each tone", () => {
    const classes = new Set([
      toneBadgeClass("pending"),
      toneBadgeClass("success"),
      toneBadgeClass("danger"),
      toneBadgeClass("info"),
    ]);
    expect(classes.size).toBe(4);
  });
});

describe("stageTone", () => {
  it("marks terminal/awarded stages as success", () => {
    expect(stageTone("AWARDED")).toBe("success");
    expect(stageTone("POSSESSION")).toBe("success");
    expect(stageTone("RR_COMPLETE")).toBe("success");
  });

  it("marks pre-notification stages as pending", () => {
    expect(stageTone("DRAFT")).toBe("pending");
    expect(stageTone("SCRUTINY")).toBe("pending");
    expect(stageTone("SIA")).toBe("pending");
  });

  it("marks approval-chain stages as info", () => {
    expect(stageTone("NOTIFIED")).toBe("info");
    expect(stageTone("STATE_APPROVED")).toBe("info");
    expect(stageTone("CENTRAL_APPROVED")).toBe("info");
    expect(stageTone("DECLARED")).toBe("info");
    expect(stageTone("RR_IN_PROGRESS")).toBe("info");
  });

  it("defaults unknown stages to pending", () => {
    expect(stageTone("SOMETHING_NEW")).toBe("pending");
  });
});

describe("compensationTone", () => {
  it("marks PAID as success and ASSESSED as pending", () => {
    expect(compensationTone("PAID")).toBe("success");
    expect(compensationTone("ASSESSED")).toBe("pending");
  });
});
