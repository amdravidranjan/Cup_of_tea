import { createHash } from "node:crypto";
import {
  canonicalize,
  type AuditEntryInput,
  type StoredAuditEntry,
} from "@/lib/audit";

/** The genesis link — the prevHash of the very first entry in the chain. */
export const GENESIS_HASH = "0".repeat(64);

/** Node-only hash-chain operations used by database and API code. */
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

export interface ChainVerification {
  valid: boolean;
  checked: number;
  brokenAt: { id: string; index: number; reason: string } | null;
}

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
