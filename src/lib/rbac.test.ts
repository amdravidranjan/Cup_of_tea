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

  it("allows agency and district to edit project geometry", () => {
    expect(can("agency", "project:geometry:edit")).toBe(true);
    expect(can("district", "project:geometry:edit")).toBe(true);
  });

  it("does not allow state, central, or field to edit project geometry", () => {
    expect(can("state", "project:geometry:edit")).toBe(false);
    expect(can("central", "project:geometry:edit")).toBe(false);
    expect(can("field", "project:geometry:edit")).toBe(false);
  });

  it("allows district and state to manage the compensation rate", () => {
    expect(can("district", "compensation:manage-rate")).toBe(true);
    expect(can("state", "compensation:manage-rate")).toBe(true);
  });

  it("does not allow agency, central, or field to manage the compensation rate", () => {
    expect(can("agency", "compensation:manage-rate")).toBe(false);
    expect(can("central", "compensation:manage-rate")).toBe(false);
    expect(can("field", "compensation:manage-rate")).toBe(false);
  });

  it("only allows district to assess compensation", () => {
    expect(can("district", "compensation:assess")).toBe(true);
    expect(can("agency", "compensation:assess")).toBe(false);
    expect(can("state", "compensation:assess")).toBe(false);
  });

  it("allows district and field to manage families", () => {
    expect(can("district", "family:manage")).toBe(true);
    expect(can("field", "family:manage")).toBe(true);
  });

  it("does not allow agency, state, or central to manage families", () => {
    expect(can("agency", "family:manage")).toBe(false);
    expect(can("state", "family:manage")).toBe(false);
    expect(can("central", "family:manage")).toBe(false);
  });

  it("only allows district to grant entitlements", () => {
    expect(can("district", "entitlement:grant")).toBe(true);
    expect(can("field", "entitlement:grant")).toBe(false);
    expect(can("state", "entitlement:grant")).toBe(false);
  });

  it("allows district and field to update parcel status", () => {
    expect(can("district", "parcel:update-status")).toBe(true);
    expect(can("field", "parcel:update-status")).toBe(true);
  });

  it("does not allow agency, state, or central to update parcel status", () => {
    expect(can("agency", "parcel:update-status")).toBe(false);
    expect(can("state", "parcel:update-status")).toBe(false);
    expect(can("central", "parcel:update-status")).toBe(false);
  });

  it("only allows district to manage the infrastructure checklist", () => {
    expect(can("district", "infrastructure:manage")).toBe(true);
    expect(can("field", "infrastructure:manage")).toBe(false);
    expect(can("state", "infrastructure:manage")).toBe(false);
  });
});
