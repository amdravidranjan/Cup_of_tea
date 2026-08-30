import { describe, it, expect } from "vitest";
import { projectScopeFor, scopeProjects, canViewProject } from "./project-scope";

describe("projectScopeFor", () => {
  it("gives central no restriction", () => {
    expect(projectScopeFor({ role: "central", userId: "u-1" })).toBeUndefined();
  });

  it("scopes state to its own state", () => {
    expect(projectScopeFor({ role: "state", userId: "u-1", state: "Tamil Nadu" })).toEqual({
      state: "Tamil Nadu",
    });
  });

  it("scopes district and field to their own district", () => {
    expect(
      projectScopeFor({ role: "district", userId: "u-1", state: "Odisha", district: "Koraput" })
    ).toEqual({ district: "Koraput" });
    expect(
      projectScopeFor({ role: "field", userId: "u-1", state: "Odisha", district: "Koraput" })
    ).toEqual({ district: "Koraput" });
  });

  it("scopes agency to projects it created, regardless of state/district", () => {
    expect(projectScopeFor({ role: "agency", userId: "u-agency-1" })).toEqual({
      createdBy: "u-agency-1",
    });
  });

  it("falls back to no restriction when state/district is missing", () => {
    expect(projectScopeFor({ role: "state", userId: "u-1" })).toBeUndefined();
    expect(projectScopeFor({ role: "district", userId: "u-1" })).toBeUndefined();
  });
});

describe("scopeProjects", () => {
  const projects = [
    { id: "p-1", state: "Odisha", district: "Koraput", createdBy: "u-agency-1" },
    { id: "p-2", state: "Tamil Nadu", district: "Chennai", createdBy: "u-agency-1" },
    { id: "p-3", state: "Odisha", district: "Ganjam", createdBy: "u-agency-2" },
  ];

  it("returns everything when filter is undefined", () => {
    expect(scopeProjects(projects, undefined)).toHaveLength(3);
  });

  it("filters by state", () => {
    expect(scopeProjects(projects, { state: "Odisha" }).map((p) => p.id)).toEqual(["p-1", "p-3"]);
  });

  it("filters by district", () => {
    expect(scopeProjects(projects, { district: "Koraput" }).map((p) => p.id)).toEqual(["p-1"]);
  });

  it("filters by createdBy", () => {
    expect(scopeProjects(projects, { createdBy: "u-agency-2" }).map((p) => p.id)).toEqual(["p-3"]);
  });
});

describe("canViewProject", () => {
  const project = { state: "Odisha", district: "Koraput", createdBy: "u-agency-1" };

  it("allows central to view any project", () => {
    expect(canViewProject({ role: "central", userId: "u-x" }, project)).toBe(true);
  });

  it("blocks a district officer from another district", () => {
    expect(
      canViewProject(
        { role: "district", userId: "u-x", state: "Odisha", district: "Ganjam" },
        project
      )
    ).toBe(false);
  });

  it("allows a district officer in the matching district", () => {
    expect(
      canViewProject(
        { role: "district", userId: "u-x", state: "Odisha", district: "Koraput" },
        project
      )
    ).toBe(true);
  });

  it("blocks an agency from a project it didn't create", () => {
    expect(canViewProject({ role: "agency", userId: "u-other-agency" }, project)).toBe(false);
  });
});
