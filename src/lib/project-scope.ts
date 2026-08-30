import type { Role } from "./workflow";

export interface ProjectScopeFilter {
  state?: string;
  district?: string;
  createdBy?: string;
}

export interface ScopeSession {
  role: Role;
  userId: string;
  state?: string | null;
  district?: string | null;
}

/**
 * Mirrors the `project:view:own` vs `project:view:all` split in rbac.ts:
 * central and state see everything in their remit; district and field
 * (both `project:view:own`) are scoped to their own district; agency
 * (also `project:view:own`) is scoped to projects it created, since
 * agencies aren't tied to a state/district the way government roles are.
 * Returns undefined for "no restriction" (central, or a demo user with
 * no state/district set).
 */
export function projectScopeFor(session: ScopeSession): ProjectScopeFilter | undefined {
  switch (session.role) {
    case "central":
      return undefined;
    case "state":
      return session.state ? { state: session.state } : undefined;
    case "district":
    case "field":
      return session.district ? { district: session.district } : undefined;
    case "agency":
      return { createdBy: session.userId };
    default:
      return undefined;
  }
}

function isInScope(
  project: { state: string; district: string; createdBy: string },
  filter?: ProjectScopeFilter
): boolean {
  if (!filter) return true;
  return (
    (filter.state === undefined || project.state === filter.state) &&
    (filter.district === undefined || project.district === filter.district) &&
    (filter.createdBy === undefined || project.createdBy === filter.createdBy)
  );
}

export function scopeProjects<T extends { state: string; district: string; createdBy: string }>(
  projects: T[],
  filter?: ProjectScopeFilter
): T[] {
  return projects.filter((p) => isInScope(p, filter));
}

/** Single-project check for direct-navigation/API guards (e.g. project detail pages). */
export function canViewProject(
  session: ScopeSession,
  project: { state: string; district: string; createdBy: string }
): boolean {
  return isInScope(project, projectScopeFor(session));
}
