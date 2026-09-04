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
  | "grievance:manage"
  | "legal-dispute:manage"
  | "tender:manage"
  | "rehabilitation:manage"
  | "project-request:review"
  | "notification:send"
  | "conflict:review"
  | "succession:manage"
  | "gram-sabha:manage"
  | "land-bank:manage"
  | "notice-draft:manage"
  | "encroachment:review";

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
    "tender:manage",
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
    "legal-dispute:manage",
    "tender:manage",
    "rehabilitation:manage",
    "project-request:review",
    "notification:send",
    "conflict:review",
    "succession:manage",
    "gram-sabha:manage",
    "land-bank:manage",
    "notice-draft:manage",
    "encroachment:review",
  ],
  state: [
    "project:view:all",
    "project:transition",
    "compensation:manage-rate",
    "grievance:manage",
    "legal-dispute:manage",
    "project-request:review",
    "conflict:review",
    "land-bank:manage",
    "encroachment:review",
  ],
  central: [
    "project:view:all",
    "project:transition",
    "conflict:review",
    "encroachment:review",
  ],
  field: [
    "project:view:own",
    "document:upload",
    "family:manage",
    "parcel:update-status",
    "rehabilitation:manage",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
