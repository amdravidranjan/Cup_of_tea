import { describe, it, expect } from "vitest";
import { can } from "./rbac";

describe("can", () => {
  it("allows agency to create projects", () => {
    expect(can("agency", "project:create")).toBe(true);
  });

  it("allows agency to attempt transitions (workflow.ts restricts which ones)", () => {
    expect(can("agency", "project:transition")).toBe(true);
  });

  it("allows district to transition projects", () => {
    expect(can("district", "project:transition")).toBe(true);
  });

  it("allows state to view all projects but not create them", () => {
    expect(can("state", "project:view:all")).toBe(true);
    expect(can("state", "project:create")).toBe(false);
  });

  it("allows field officers to view only their own projects", () => {
    expect(can("field", "project:view:own")).toBe(true);
    expect(can("field", "project:view:all")).toBe(false);
  });

  it("allows agency, district, and field to upload documents", () => {
    expect(can("agency", "document:upload")).toBe(true);
    expect(can("district", "document:upload")).toBe(true);
    expect(can("field", "document:upload")).toBe(true);
  });

  it("does not allow state or central to upload documents", () => {
    expect(can("state", "document:upload")).toBe(false);
    expect(can("central", "document:upload")).toBe(false);
  });
});
