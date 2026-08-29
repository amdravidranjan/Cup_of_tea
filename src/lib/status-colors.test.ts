import { describe, it, expect } from "vitest";
import { toneBadgeClass, stageTone, compensationTone, toneHex, slaStatusTone } from "./status-colors";

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

describe("toneHex", () => {
  it("returns a distinct hex color for each tone", () => {
    const colors = new Set([
      toneHex("pending"),
      toneHex("success"),
      toneHex("danger"),
      toneHex("info"),
    ]);
    expect(colors.size).toBe(4);
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("slaStatusTone", () => {
  it("maps on-track/at-risk/breached to success/pending/danger", () => {
    expect(slaStatusTone("on-track")).toBe("success");
    expect(slaStatusTone("at-risk")).toBe("pending");
    expect(slaStatusTone("breached")).toBe("danger");
  });

  it("defaults unknown statuses to pending", () => {
    expect(slaStatusTone("not-applicable")).toBe("pending");
  });
});
