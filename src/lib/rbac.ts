import type { Role } from "./workflow";

export type Permission =
  | "project:create"
  | "project:view:own"
  | "project:view:all"
  | "project:transition"
  | "document:upload";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // "project:transition" here is the coarse gate ("can this role attempt
  // any transition endpoint at all"); workflow.ts's per-action allowedRoles
  // is the fine gate that actually restricts agency to DRAFT:SUBMIT only.
  agency: ["project:create", "project:view:own", "project:transition", "document:upload"],
  district: ["project:create", "project:view:own", "project:transition", "document:upload"],
  state: ["project:view:all", "project:transition"],
  central: ["project:view:all", "project:transition"],
  field: ["project:view:own", "document:upload"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
