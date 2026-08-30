import type { Role } from "./workflow";

export type Permission =
  | "project:create"
  | "project:view:own"
  | "project:view:all"
  | "project:transition"
  | "document:upload"
  | "project:geometry:edit"
  | "compensation:manage-rate"
  | "compensation:assess"
  | "family:manage"
  | "entitlement:grant"
  | "parcel:update-status"
  | "infrastructure:manage"
  | "grievance:manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // "project:transition" here is the coarse gate ("can this role attempt
  // any transition endpoint at all"); workflow.ts's per-action allowedRoles
  // is the fine gate that actually restricts agency to DRAFT:SUBMIT only.
  agency: [
    "project:create",
    "project:view:own",
    "project:transition",
    "document:upload",
    "project:geometry:edit",
  ],
  district: [
    "project:create",
    "project:view:own",
    "project:transition",
    "document:upload",
    "project:geometry:edit",
    "compensation:manage-rate",
    "compensation:assess",
    "family:manage",
    "entitlement:grant",
    "parcel:update-status",
    "infrastructure:manage",
    "grievance:manage",
  ],
  state: [
    "project:view:all",
    "project:transition",
    "compensation:manage-rate",
    "grievance:manage",
  ],
  central: ["project:view:all", "project:transition"],
  field: ["project:view:own", "document:upload", "family:manage", "parcel:update-status"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
