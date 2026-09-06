import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { sendEmail, sendWhatsAppMessage } from "@/lib/notifications";
import { draftCitizenNotice } from "@/lib/notice-template";

type Db = LibSQLDatabase<typeof schema>;

export const NOTIFICATION_CHANNELS = ["VOICE", "EMAIL", "SMS", "WHATSAPP", "POST"] as const;
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
 * Records a notification attempt.
 *
 * EMAIL and WHATSAPP are real: this looks up the family's contact details
 * and actually sends, via whichever provider is configured in
 * src/lib/notifications (Gmail + a Baileys-linked WhatsApp number by
 * default — see docs/NOTIFICATIONS.md). If the family has no contact
 * info on file, or the send fails (e.g. WhatsApp not yet linked), the
 * entry is stored as FAILED with the reason in `note` — never silently
 * dropped and never falsely marked as sent.
 *
 * VOICE/SMS remain simulated (no telephony/SMS gateway is wired up) and
 * move straight to a simulated "SENT" status — see docs/all-features.md
 * for why those two are deliberately left as demo logic. POST is the one
 * channel with a real artifact behind it (a generated PDF via the
 * existing document pipeline) and starts QUEUED until staff log that it
 * was actually handed to the postal service with a tracking id.
 */
export async function sendNotificationWith(
  database: Db,
  input: SendNotificationInput
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();

  let status: NotificationStatus = "SENT";
  let note = input.note ?? null;

  if (input.channel === "POST") {
    status = "QUEUED";
  } else if (input.channel === "EMAIL" || input.channel === "WHATSAPP") {
    const result = await sendRealNotification(database, input);
    status = result.ok ? "SENT" : "FAILED";
    note = result.ok ? note : [note, result.error].filter(Boolean).join(" — ");
  }
  // VOICE / SMS: fall through with the simulated "SENT" default above.

  await database.insert(schema.notificationLog).values({
    id,
    familyId: input.familyId,
    projectId: input.projectId,
    channel: input.channel,
    status,
    postalTrackingId: null,
    postalDocumentId: input.postalDocumentId ?? null,
    note,
    sentBy: input.sentBy,
    sentAt: now,
    updatedAt: now,
  });
  return id;
}

/** Looks up the family + project, drafts the notice text, and dispatches
 *  it through the real Email/WhatsApp provider. Isolated here so a missing
 *  contact field or a provider error can never throw past sendNotificationWith
 *  — it always resolves to a { ok, error? } the caller records as-is. */
async function sendRealNotification(
  database: Db,
  input: SendNotificationInput
): Promise<{ ok: boolean; error?: string }> {
  const [familyRows, projectRows] = await Promise.all([
    database.select().from(schema.families).where(eq(schema.families.id, input.familyId)),
    database.select().from(schema.projects).where(eq(schema.projects.id, input.projectId)),
  ]);
  const family = familyRows[0];
  const project = projectRows[0];
  if (!family || !project) {
    return { ok: false, error: "Family or project not found" };
  }

  const text = draftCitizenNotice({
    projectName: project.name,
    purpose: project.purpose,
    district: project.district,
    state: project.state,
    stage: project.stage,
    familyName: family.headOfHouseholdName,
    village: family.village,
  });

  if (input.channel === "EMAIL") {
    if (!family.contactEmail) {
      return { ok: false, error: "No email on file for this family" };
    }
    return sendEmail({
      to: family.contactEmail,
      subject: `Update on ${project.name}`,
      text,
    });
  }

  // WHATSAPP
  if (!family.contactPhone) {
    return { ok: false, error: "No WhatsApp/contact number on file for this family" };
  }
  return sendWhatsAppMessage({ to: family.contactPhone, text });
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
