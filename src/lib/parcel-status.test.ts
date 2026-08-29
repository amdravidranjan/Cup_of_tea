import { describe, it, expect } from "vitest";
import { nextParcelStatus } from "./parcel-status";

describe("nextParcelStatus", () => {
  it("advances NOTIFIED to ACQUIRED", () => {
    expect(nextParcelStatus("NOTIFIED")).toBe("ACQUIRED");
  });

  it("advances ACQUIRED to POSSESSED", () => {
    expect(nextParcelStatus("ACQUIRED")).toBe("POSSESSED");
  });

  it("returns null once POSSESSED (terminal)", () => {
    expect(nextParcelStatus("POSSESSED")).toBeNull();
  });
});
