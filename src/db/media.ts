import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export const MEDIA_ENTITY_TYPES = [
  "PROJECT",
  "PARCEL",
  "FAMILY",
  "ENTITLEMENT",
  "REHABILITATION_SERVICE",
  "GRAM_SABHA",
  "INFRASTRUCTURE_ITEM",
  "GRIEVANCE",
  "LEGAL_DISPUTE",
  "NOTIFICATION",
  "COMPENSATION",
  "TENDER",
  "CONTRACTOR",
  "LAND_BANK_ENTRY",
  "DOCUMENT",
  "PROJECT_REQUEST",
] as const;

export const MEDIA_KINDS = ["PHOTO", "VIDEO", "DOC", "AUDIO"] as const;
export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];

export interface CreateMediaAssetInput {
  entityType: MediaEntityType;
  entityId: string;
  projectId: string;
  kind: MediaKind;
  storagePath: string;
  mimeType: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: Date;
  uploadedBy: string;
}

export async function createMediaAssetWith(
  database: Db,
  input: CreateMediaAssetInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(schema.mediaAssets).values({
    id,
    entityType: input.entityType,
    entityId: input.entityId,
    projectId: input.projectId,
    kind: input.kind,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    caption: input.caption ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    capturedAt: input.capturedAt ?? null,
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date(),
  });
  return id;
}

export async function listMediaAssetsWith(
  database: Db,
  query: {
    projectId?: string;
    entityType?: MediaEntityType;
    entityId?: string;
    from?: Date;
    to?: Date;
  } = {}
) {
  const filters = [];
  if (query.projectId) filters.push(eq(schema.mediaAssets.projectId, query.projectId));
  if (query.entityType) filters.push(eq(schema.mediaAssets.entityType, query.entityType));
  if (query.entityId) filters.push(eq(schema.mediaAssets.entityId, query.entityId));
  if (query.from) filters.push(gte(schema.mediaAssets.uploadedAt, query.from));
  if (query.to) filters.push(lte(schema.mediaAssets.uploadedAt, query.to));
  return database
    .select()
    .from(schema.mediaAssets)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.mediaAssets.uploadedAt));
}

export const createMediaAsset = (input: CreateMediaAssetInput) =>
  createMediaAssetWith(defaultDb, input);
export const listMediaAssets = (query?: Parameters<typeof listMediaAssetsWith>[1]) =>
  listMediaAssetsWith(defaultDb, query);
