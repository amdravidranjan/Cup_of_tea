/**
 * Audit primitives — what changed, who changed it, and proof the record of
 * that change has not been edited since.
 *
 * The PDF's Security & Governance scope item asks for audit trails, and
 * requirement 13 asks for a document repository "with version control and
 * audit history". Stage transitions were already historied (`stage_history`,
 * `rr_stage_history`); nothing else was. This module is the shared half of
 * fixing that — the pure functions, so they can be tested without a database.
 * The write path lives in `src/db/audit.ts`.
 *
 * Tamper-evidence: entries form a hash chain. Each entry's hash covers its
 * own canonical payload plus the previous entry's hash, so altering or
 * deleting any historical row breaks verification from that point forward.
 * This is not a blockchain and does not claim to be — it is the same
 * append-only ledger property a government audit trail is expected to have,
 * and `verifyAuditChain` is what demonstrates it.
 */

import { createHash } from "node:crypto";

/** Every record type an officer can act on. */
export type AuditEntityType =
  | "PROJECT"
  | "PARCEL"
  | "FAMILY"
  | "ENTITLEMENT"
  | "COMPENSATION"
  | "COMPENSATION_RATE"
  | "DOCUMENT"
  | "GRIEVANCE"
  | "LEGAL_DISPUTE"
  | "TENDER"
  | "CONTRACTOR"
  | "INFRASTRUCTURE_ITEM"
  | "REHABILITATION_SERVICE"
  | "GRAM_SABHA"
  | "LAND_BANK_ENTRY"
  | "NOTICE_DRAFT"
  | "NOTIFICATION"
  | "PROJECT_REQUEST"
  | "HEIR"
  | "CONFLICT_DISMISSAL"
  | "INGEST_BATCH"
  // Not a record in the domain sense, but sign-in is the start of every
  // trail: an entry attributing later actions to a role needs a beginning.
  | "SESSION";

/**
 * What was done. CREATE/UPDATE/DELETE cover ordinary record editing;
 * the rest are domain actions where "UPDATE" would lose the meaning that
 * makes the entry worth reading back (an award being passed is not the
 * same event as a row being edited).
 */
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STAGE_TRANSITION"
  | "GRANT"
  | "PAY"
  | "APPROVE"
  | "REJECT"
  | "DISMISS"
  | "INGEST"
  | "UPLOAD"
  | "SUPERSEDE"
  | "SEND"
  | "STATUS_CHANGE"
  | "SIGN_IN";

/** A single field that changed, as it is stored and rendered. */
export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface AuditEntryInput {
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  projectId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** Free-text justification. Required for UPDATE and DELETE. */
  reason: string | null;
  /** Short human summary, so a log row reads without expanding the diff. */
  summary: string;
  ip: string | null;
  createdAt: Date;
}

/* ── Diffing ──────────────────────────────────────────────────────────── */

/**
 * Fields that change on every write and carry no audit meaning. Recording
 * them would bury the one field an officer actually changed under noise.
 */
const IGNORED_FIELDS = new Set(["updatedAt", "updated_at"]);

function normalizeForCompare(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return value;
}

/**
 * The changed fields between two snapshots of a record.
 *
 * Compares on normalized values so a `Date` and its ISO string are not
 * reported as a change, and `undefined`/`null` are treated alike — an
 * absent column and an explicitly null one are the same fact here.
 */
export function diffRecords(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): FieldChange[] {
  if (!before && !after) return [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: FieldChange[] = [];
  for (const key of [...keys].sort()) {
    if (IGNORED_FIELDS.has(key)) continue;
    const b = normalizeForCompare(before?.[key]);
    const a = normalizeForCompare(after?.[key]);
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes.push({ field: key, before: b, after: a });
    }
  }
  return changes;
}

/** True when an update would record nothing — the caller should not write. */
export function isNoOpChange(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): boolean {
  return diffRecords(before, after).length === 0;
}

/* ── Hash chain ───────────────────────────────────────────────────────── */

/**
 * Deterministic JSON: object keys sorted at every depth, `Date` as ISO,
 * `undefined` as null. Two structurally equal payloads must serialize
 * identically or verification would fail on re-read for cosmetic reasons.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function canonicalValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      out[key] = canonicalValue(source[key]);
    }
    return out;
  }
  return value;
}

/** The genesis link — the `prevHash` of the very first entry in the chain. */
export const GENESIS_HASH = "0".repeat(64);

/**
 * An entry's hash. Covers the previous hash and every field that carries
 * meaning, so no part of a recorded change can be altered without detection.
 */
export function computeEntryHash(prevHash: string, entry: AuditEntryInput): string {
  const payload = canonicalize({
    prevHash,
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    projectId: entry.projectId,
    before: entry.before,
    after: entry.after,
    reason: entry.reason,
    summary: entry.summary,
    createdAt: entry.createdAt,
  });
  return createHash("sha256").update(payload).digest("hex");
}

/** A stored entry, as read back from the database. */
export interface StoredAuditEntry extends AuditEntryInput {
  id: string;
  prevHash: string;
  hash: string;
}

export interface ChainVerification {
  valid: boolean;
  checked: number;
  /** The first entry that fails, if any — everything after it is suspect. */
  brokenAt: { id: string; index: number; reason: string } | null;
}

/**
 * Re-derive every hash in order and confirm the chain is intact.
 *
 * `entries` must be in insertion order, oldest first, and must start at the
 * genesis link — verifying a filtered slice would report a false break,
 * because a slice legitimately has a predecessor it cannot see.
 */
export function verifyAuditChain(entries: StoredAuditEntry[]): ChainVerification {
  let prev = GENESIS_HASH;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.prevHash !== prev) {
      return {
        valid: false,
        checked: i,
        brokenAt: { id: entry.id, index: i, reason: "prevHash does not match the preceding entry" },
      };
    }
    const expected = computeEntryHash(prev, entry);
    if (expected !== entry.hash) {
      return {
        valid: false,
        checked: i,
        brokenAt: { id: entry.id, index: i, reason: "entry contents do not match its recorded hash" },
      };
    }
    prev = entry.hash;
  }
  return { valid: true, checked: entries.length, brokenAt: null };
}

/* ── Presentation ─────────────────────────────────────────────────────── */

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  PROJECT: "Project",
  PARCEL: "Parcel",
  FAMILY: "Family",
  ENTITLEMENT: "Entitlement",
  COMPENSATION: "Compensation",
  COMPENSATION_RATE: "Compensation rate",
  DOCUMENT: "Document",
  GRIEVANCE: "Grievance",
  LEGAL_DISPUTE: "Legal dispute",
  TENDER: "Tender",
  CONTRACTOR: "Contractor",
  INFRASTRUCTURE_ITEM: "Infrastructure item",
  REHABILITATION_SERVICE: "R&R service",
  GRAM_SABHA: "Gram Sabha consultation",
  LAND_BANK_ENTRY: "Land bank entry",
  NOTICE_DRAFT: "Notice draft",
  NOTIFICATION: "Notification",
  PROJECT_REQUEST: "Project request",
  HEIR: "Heir",
  CONFLICT_DISMISSAL: "Conflict dismissal",
  INGEST_BATCH: "Bulk intake batch",
  SESSION: "Session",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "created",
  UPDATE: "edited",
  DELETE: "deleted",
  STAGE_TRANSITION: "advanced the stage of",
  GRANT: "granted",
  PAY: "recorded payment on",
  APPROVE: "approved",
  REJECT: "rejected",
  DISMISS: "dismissed",
  INGEST: "registered records from",
  UPLOAD: "uploaded",
  SUPERSEDE: "superseded",
  SEND: "sent",
  STATUS_CHANGE: "changed the status of",
  SIGN_IN: "signed in to",
};

export function auditEntityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType as AuditEntityType] ?? entityType.replace(/_/g, " ").toLowerCase();
}

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action as AuditAction] ?? action.replace(/_/g, " ").toLowerCase();
}

/** Field names as an officer reads them, not as the column is spelled. */
export function auditFieldLabel(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** A rendered value for the history table. Long text is left to the UI to clamp. */
export function auditValueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Actions where a written justification is mandatory. */
export function requiresReason(action: AuditAction): boolean {
  return action === "UPDATE" || action === "DELETE" || action === "SUPERSEDE";
}
