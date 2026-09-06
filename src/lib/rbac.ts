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
  | "encroachment:review"
  // Reading the audit trail is a supervisory act, not an editing one: an
  // officer who can change a record is not automatically the person who
  // should be able to review who else changed it.
  | "audit:view"
  // Correcting a record already on the file, as distinct from creating one.
  // Every edit demands a written reason and lands in the audit trail.
  | "record:edit";

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
    "record:edit",
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
    "audit:view",
    "record:edit",
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
    "audit:view",
    "record:edit",
  ],
  central: [
    "project:view:all",
    "project:transition",
    "conflict:review",
    "encroachment:review",
    "audit:view",
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
