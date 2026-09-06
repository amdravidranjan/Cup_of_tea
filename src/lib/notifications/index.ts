/**
 * Public entry point for real notification sending. Everything else in
 * the app (src/db/notifications-log.ts) calls only these two functions —
 * never a provider file directly — so a provider swap never ripples
 * beyond email/index.ts or whatsapp/index.ts. See docs/NOTIFICATIONS.md.
 */
export * from "./types";

import { getEmailProvider } from "./email";
import { getWhatsAppProvider } from "./whatsapp";
import type { EmailMessage, WhatsAppMessage, SendResult } from "./types";

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  return getEmailProvider().send(message);
}

export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<SendResult> {
  return getWhatsAppProvider().send(message);
}

export function isWhatsAppReady(): boolean {
  return getWhatsAppProvider().isReady();
}
