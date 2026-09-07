import { and, desc, eq, gte, lte, asc, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import {
  GENESIS_HASH,
  computeEntryHash,
  verifyAuditChain,
} from "@/lib/audit-hash";
import {
  canonicalize,
  diffRecords,
  type AuditAction,
  type AuditEntityType,
  type AuditEntryInput,
  type ChainVerification,
  type FieldChange,
  type StoredAuditEntry,
} from "@/lib/audit";

type Db = LibSQLDatabase<typeof schema>;

export interface AuditActor {
  userId: string;
  role: string;
}

export interface RecordAuditInput {
  actor: AuditActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  projectId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  summary: string;
  ip?: string | null;
}

/**
 * Appends to the hash chain, which means read-then-write on the tail entry.
 * Two concurrent requests that both read the same tail would produce two
 * entries claiming the same predecessor and break verification, so writes
 * are serialized through this promise chain.
 *
 * This is a single-process guard and is honest about that: it holds for the
 * Node server this app runs on, and a multi-instance deployment would move
 * the sequence + tail read into a transaction with `SELECT ... FOR UPDATE`
 * (or an equivalent) against Postgres. The chain itself does not change.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(work, work);
  // Keep the queue alive even if this write rejected — a failed audit write
  // must not wedge every subsequent one.
  writeQueue = result.catch(() => undefined);
  return result;
}

/**
 * The snapshot exactly as it will be stored and hashed.
 *
 * These have to agree byte for byte. `canonicalize` maps `undefined` to null
 * and keeps the key; a plain `JSON.stringify` drops the key. Normalizing once
 * here, and hashing this normalized form rather than the caller's object,
 * is what keeps a stored entry verifiable after a round trip.
 */
function normalizeSnapshot(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  return JSON.parse(canonicalize(value)) as Record<string, unknown>;
}

function serializeSnapshot(value: Record<string, unknown> | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function parseSnapshot(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Writes one audit entry and returns it.
 *
 * Only the fields that actually changed are stored in `before`/`after` for
 * an UPDATE — storing whole rows twice would make the history unreadable and
 * would also copy fields the actor never touched into the tamper record.
 */
export async function recordAuditWith(
  db: Db,
  input: RecordAuditInput
): Promise<StoredAuditEntry> {
  return serialize(async () => {
    const [tail] = await db
      .select({ seq: schema.auditLog.seq, hash: schema.auditLog.hash })
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.seq))
      .limit(1);

    const prevHash = tail?.hash ?? GENESIS_HASH;
    const seq = (tail?.seq ?? 0) + 1;

    let before = input.before ?? null;
    let after = input.after ?? null;
    if (input.action === "UPDATE" && before && after) {
      const changed = diffRecords(before, after);
      before = Object.fromEntries(changed.map((c) => [c.field, c.before]));
      after = Object.fromEntries(changed.map((c) => [c.field, c.after]));
    }

    const entry: AuditEntryInput = {
      actorId: input.actor.userId,
      actorRole: input.actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId ?? null,
      before: normalizeSnapshot(before),
      after: normalizeSnapshot(after),
      reason: input.reason ?? null,
      summary: input.summary,
      ip: input.ip ?? null,
      createdAt: new Date(),
    };

    const hash = computeEntryHash(prevHash, entry);
    const id = `audit-${seq}-${hash.slice(0, 12)}`;

    await db.insert(schema.auditLog).values({
      id,
      seq,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      projectId: entry.projectId,
      before: serializeSnapshot(entry.before),
      after: serializeSnapshot(entry.after),
      reason: entry.reason,
      summary: entry.summary,
      ip: entry.ip,
      prevHash,
      hash,
      createdAt: entry.createdAt,
    });

    return { ...entry, id, prevHash, hash };
  });
}

export function recordAudit(input: RecordAuditInput): Promise<StoredAuditEntry> {
  return recordAuditWith(defaultDb, input);
}

/**
 * Runs a mutation and records what it changed.
 *
 * `loadBefore` and `loadAfter` read the record either side of the write, so
 * the diff comes from the database rather than from what the caller believed
 * it was writing — an update that silently no-ops still records honestly.
 *
 * The audit write is deliberately inside the same await chain as the
 * mutation and not fire-and-forget: if the ledger cannot be written, the
 * caller finds out. A mutation that succeeds while its audit entry is
 * silently dropped is the exact failure this table exists to prevent.
 */
export async function withAuditWith<T>(
  db: Db,
  input: Omit<RecordAuditInput, "before" | "after"> & {
    loadBefore?: () => Promise<Record<string, unknown> | null>;
    loadAfter?: () => Promise<Record<string, unknown> | null>;
  },
  mutate: () => Promise<T>
): Promise<T> {
  const before = input.loadBefore ? await input.loadBefore() : null;
  const result = await mutate();
  const after = input.loadAfter ? await input.loadAfter() : null;
  await recordAuditWith(db, { ...input, before, after });
  return result;
}

export function withAudit<T>(
  input: Omit<RecordAuditInput, "before" | "after"> & {
    loadBefore?: () => Promise<Record<string, unknown> | null>;
    loadAfter?: () => Promise<Record<string, unknown> | null>;
  },
  mutate: () => Promise<T>
): Promise<T> {
  return withAuditWith(defaultDb, input, mutate);
}

/* ── Reading ──────────────────────────────────────────────────────────── */

export interface AuditQuery {
  projectId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  actorId?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditRow extends StoredAuditEntry {
  seq: number;
  changes: FieldChange[];
}

function toRow(row: typeof schema.auditLog.$inferSelect): AuditRow {
  const before = parseSnapshot(row.before);
  const after = parseSnapshot(row.after);
  return {
    id: row.id,
    seq: row.seq,
    actorId: row.actorId,
    actorRole: row.actorRole,
    action: row.action as AuditAction,
    entityType: row.entityType as AuditEntityType,
    entityId: row.entityId,
    projectId: row.projectId,
    before,
    after,
    reason: row.reason,
    summary: row.summary,
    ip: row.ip,
    prevHash: row.prevHash,
    hash: row.hash,
    createdAt: row.createdAt,
    changes: diffRecords(before, after),
  };
}

export async function listAuditEntriesWith(db: Db, query: AuditQuery = {}): Promise<AuditRow[]> {
  const filters = [];
  if (query.projectId) filters.push(eq(schema.auditLog.projectId, query.projectId));
  if (query.entityType) filters.push(eq(schema.auditLog.entityType, query.entityType));
  if (query.entityId) filters.push(eq(schema.auditLog.entityId, query.entityId));
  if (query.actorId) filters.push(eq(schema.auditLog.actorId, query.actorId));
  if (query.action) filters.push(eq(schema.auditLog.action, query.action));
  if (query.from) filters.push(gte(schema.auditLog.createdAt, query.from));
  if (query.to) filters.push(lte(schema.auditLog.createdAt, query.to));

  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.auditLog.seq))
    .limit(query.limit ?? 100)
    .offset(query.offset ?? 0);

  return rows.map(toRow);
}

export function listAuditEntries(query: AuditQuery = {}): Promise<AuditRow[]> {
  return listAuditEntriesWith(defaultDb, query);
}

export async function countAuditEntriesWith(db: Db, query: AuditQuery = {}): Promise<number> {
  const filters = [];
  if (query.projectId) filters.push(eq(schema.auditLog.projectId, query.projectId));
  if (query.entityType) filters.push(eq(schema.auditLog.entityType, query.entityType));
  if (query.entityId) filters.push(eq(schema.auditLog.entityId, query.entityId));
  if (query.actorId) filters.push(eq(schema.auditLog.actorId, query.actorId));
  if (query.action) filters.push(eq(schema.auditLog.action, query.action));
  if (query.from) filters.push(gte(schema.auditLog.createdAt, query.from));
  if (query.to) filters.push(lte(schema.auditLog.createdAt, query.to));

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.auditLog)
    .where(filters.length ? and(...filters) : undefined);
  return Number(row?.count ?? 0);
}

export function countAuditEntries(query: AuditQuery = {}): Promise<number> {
  return countAuditEntriesWith(defaultDb, query);
}

/** The history of one record, oldest first — what a "History" panel shows. */
export async function getEntityHistoryWith(
  db: Db,
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditRow[]> {
  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.entityType, entityType), eq(schema.auditLog.entityId, entityId)))
    .orderBy(asc(schema.auditLog.seq));
  return rows.map(toRow);
}

export function getEntityHistory(
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditRow[]> {
  return getEntityHistoryWith(defaultDb, entityType, entityId);
}

/**
 * Verifies the whole chain from genesis.
 *
 * Deliberately not filterable: a slice of the chain has a predecessor it
 * cannot see, so verifying one would report a break that is not there.
 */
export async function verifyAuditLogWith(db: Db): Promise<ChainVerification> {
  const rows = await db.select().from(schema.auditLog).orderBy(asc(schema.auditLog.seq));
  return verifyAuditChain(rows.map(toRow));
}

export function verifyAuditLog(): Promise<ChainVerification> {
  return verifyAuditLogWith(defaultDb);
}

/** Distinct actors present in the log, for the audit view's filter. */
export async function listAuditActorsWith(db: Db): Promise<{ actorId: string; actorRole: string }[]> {
  const rows = await db
    .selectDistinct({ actorId: schema.auditLog.actorId, actorRole: schema.auditLog.actorRole })
    .from(schema.auditLog)
    .orderBy(asc(schema.auditLog.actorId));
  return rows;
}

export function listAuditActors(): Promise<{ actorId: string; actorRole: string }[]> {
  return listAuditActorsWith(defaultDb);
}
