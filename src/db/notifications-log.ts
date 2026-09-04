import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export const NOTIFICATION_CHANNELS = ["VOICE", "EMAIL", "SMS", "POST"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export const NOTIFICATION_STATUSES = ["QUEUED", "SENT", "DELIVERED", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationEntry {
  id: string;
  familyId: string;
  projectId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  postalTrackingId: string | null;
  postalDocumentId: string | null;
  note: string | null;
  sentBy: string;
  sentAt: Date;
  updatedAt: Date;
}

function toEntry(row: typeof schema.notificationLog.$inferSelect): NotificationEntry {
  return {
    id: row.id,
    familyId: row.familyId,
    projectId: row.projectId,
    channel: row.channel as NotificationChannel,
    status: row.status as NotificationStatus,
    postalTrackingId: row.postalTrackingId,
    postalDocumentId: row.postalDocumentId,
    note: row.note,
    sentBy: row.sentBy,
    sentAt: row.sentAt,
    updatedAt: row.updatedAt,
  };
}

export interface SendNotificationInput {
  familyId: string;
  projectId: string;
  channel: NotificationChannel;
  postalDocumentId?: string;
  note?: string;
  sentBy: string;
}

/**
 * Records a notification attempt. VOICE/EMAIL/SMS are simulated —
 * no real telephony/SMTP/SMS gateway is wired up here — and move
 * straight to a simulated "SENT" status. POST is the one channel with a
 * real artifact behind it (a generated PDF via the existing document
 * pipeline) and starts QUEUED until staff log that it was actually
 * handed to the postal service with a tracking id.
 */
export async function sendNotificationWith(
  database: Db,
  input: SendNotificationInput
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await database.insert(schema.notificationLog).values({
    id,
    familyId: input.familyId,
    projectId: input.projectId,
    channel: input.channel,
    status: input.channel === "POST" ? "QUEUED" : "SENT",
    postalTrackingId: null,
    postalDocumentId: input.postalDocumentId ?? null,
    note: input.note ?? null,
    sentBy: input.sentBy,
    sentAt: now,
    updatedAt: now,
  });
  return id;
}

export async function listNotificationsForProjectWith(
  database: Db,
  projectId: string
): Promise<NotificationEntry[]> {
  const rows = await database
    .select()
    .from(schema.notificationLog)
    .where(eq(schema.notificationLog.projectId, projectId))
    .orderBy(desc(schema.notificationLog.sentAt));
  return rows.map(toEntry);
}

export async function updatePostalStatusWith(
  database: Db,
  id: string,
  input: { postalTrackingId?: string; status: NotificationStatus }
): Promise<void> {
  await database
    .update(schema.notificationLog)
    .set({
      status: input.status,
      ...(input.postalTrackingId ? { postalTrackingId: input.postalTrackingId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.notificationLog.id, id));
}

export async function getNotificationByIdWith(
  database: Db,
  id: string
): Promise<NotificationEntry | null> {
  const rows = await database.select().from(schema.notificationLog).where(eq(schema.notificationLog.id, id));
  return rows[0] ? toEntry(rows[0]) : null;
}

export const sendNotification = (input: SendNotificationInput) =>
  sendNotificationWith(defaultDb, input);
export const listNotificationsForProject = (projectId: string) =>
  listNotificationsForProjectWith(defaultDb, projectId);
export const updatePostalStatus = (
  id: string,
  input: { postalTrackingId?: string; status: NotificationStatus }
) => updatePostalStatusWith(defaultDb, id, input);
export const getNotificationById = (id: string) => getNotificationByIdWith(defaultDb, id);
