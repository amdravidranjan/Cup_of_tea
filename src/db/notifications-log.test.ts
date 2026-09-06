import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createTestDb } from "./test-helpers";

// sendNotificationWith calls out to src/lib/notifications (real Email/
// WhatsApp providers). Mocked here so this test exercises the DB/status
// logic without touching Gmail or a WhatsApp socket.
const sendEmail = vi.fn();
const sendWhatsAppMessage = vi.fn();
vi.mock("@/lib/notifications", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  sendWhatsAppMessage: (...args: unknown[]) => sendWhatsAppMessage(...args),
}));

let testDb: LibSQLDatabase<typeof schema>;

beforeEach(async () => {
  vi.clearAllMocks();
  testDb = await createTestDb();

  await testDb.insert(schema.projects).values({
    id: "p-1",
    name: "Test Project",
    purpose: "Testing",
    state: "Tamil Nadu",
    district: "Chennai",
    stage: "NOTIFIED",
    createdBy: "u-agency-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await testDb.insert(schema.families).values([
    {
      id: "f-with-contact",
      projectId: "p-1",
      headOfHouseholdName: "Family With Contact",
      village: "Test Village",
      category: "landowner",
      memberCount: 3,
      vulnerableGroup: false,
      contactPhone: "9876543210",
      contactEmail: "family@example.com",
      surveyedBy: "u-district-1",
      surveyedAt: new Date(),
    },
    {
      id: "f-no-contact",
      projectId: "p-1",
      headOfHouseholdName: "Family Without Contact",
      village: "Test Village",
      category: "landowner",
      memberCount: 2,
      vulnerableGroup: false,
      contactPhone: null,
      contactEmail: null,
      surveyedBy: "u-district-1",
      surveyedAt: new Date(),
    },
  ]);
});

describe("sendNotificationWith — EMAIL", () => {
  it("sends for real and stores SENT when the family has an email on file", async () => {
    sendEmail.mockResolvedValueOnce({ ok: true, providerMessageId: "msg-1" });
    const { sendNotificationWith, getNotificationByIdWith } = await import("./notifications-log");

    const id = await sendNotificationWith(testDb, {
      familyId: "f-with-contact",
      projectId: "p-1",
      channel: "EMAIL",
      sentBy: "u-district-1",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "family@example.com", subject: expect.stringContaining("Test Project") })
    );
    const entry = await getNotificationByIdWith(testDb, id);
    expect(entry?.status).toBe("SENT");
  });

  it("stores FAILED with a reason when the family has no email on file", async () => {
    const { sendNotificationWith, getNotificationByIdWith } = await import("./notifications-log");

    const id = await sendNotificationWith(testDb, {
      familyId: "f-no-contact",
      projectId: "p-1",
      channel: "EMAIL",
      sentBy: "u-district-1",
    });

    expect(sendEmail).not.toHaveBeenCalled();
    const entry = await getNotificationByIdWith(testDb, id);
    expect(entry?.status).toBe("FAILED");
    expect(entry?.note).toMatch(/no email/i);
  });

  it("stores FAILED with the provider's error when the send itself fails", async () => {
    sendEmail.mockResolvedValueOnce({ ok: false, error: "SMTP timeout" });
    const { sendNotificationWith, getNotificationByIdWith } = await import("./notifications-log");

    const id = await sendNotificationWith(testDb, {
      familyId: "f-with-contact",
      projectId: "p-1",
      channel: "EMAIL",
      sentBy: "u-district-1",
    });

    const entry = await getNotificationByIdWith(testDb, id);
    expect(entry?.status).toBe("FAILED");
    expect(entry?.note).toMatch(/SMTP timeout/);
  });
});

describe("sendNotificationWith — WHATSAPP", () => {
  it("sends for real and stores SENT when the family has a number on file", async () => {
    sendWhatsAppMessage.mockResolvedValueOnce({ ok: true, providerMessageId: "wamid-1" });
    const { sendNotificationWith, getNotificationByIdWith } = await import("./notifications-log");

    const id = await sendNotificationWith(testDb, {
      familyId: "f-with-contact",
      projectId: "p-1",
      channel: "WHATSAPP",
      sentBy: "u-district-1",
    });

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: "9876543210" })
    );
    const entry = await getNotificationByIdWith(testDb, id);
    expect(entry?.status).toBe("SENT");
  });

  it("stores FAILED with a reason when the family has no number on file", async () => {
    const { sendNotificationWith, getNotificationByIdWith } = await import("./notifications-log");

    const id = await sendNotificationWith(testDb, {
      familyId: "f-no-contact",
      projectId: "p-1",
      channel: "WHATSAPP",
      sentBy: "u-district-1",
    });

    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    const entry = await getNotificationByIdWith(testDb, id);
    expect(entry?.status).toBe("FAILED");
    expect(entry?.note).toMatch(/no whatsapp/i);
  });
});

describe("sendNotificationWith — simulated channels unaffected", () => {
  it("VOICE still records a simulated SENT without calling any provider", async () => {
    const { sendNotificationWith, getNotificationByIdWith } = await import("./notifications-log");
    const id = await sendNotificationWith(testDb, {
      familyId: "f-with-contact",
      projectId: "p-1",
      channel: "VOICE",
      sentBy: "u-district-1",
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    expect((await getNotificationByIdWith(testDb, id))?.status).toBe("SENT");
  });

  it("POST still starts QUEUED", async () => {
    const { sendNotificationWith, getNotificationByIdWith } = await import("./notifications-log");
    const id = await sendNotificationWith(testDb, {
      familyId: "f-with-contact",
      projectId: "p-1",
      channel: "POST",
      sentBy: "u-district-1",
    });
    expect((await getNotificationByIdWith(testDb, id))?.status).toBe("QUEUED");
  });
});
