/**
 * Provider-agnostic contracts for the real notification channels (Email,
 * WhatsApp). Everything that sends a message — the notification-log
 * integration, any future API route, tests — talks to these interfaces,
 * never to nodemailer/Baileys/Twilio/etc. directly.
 *
 * To swap a provider later (e.g. Gmail → Resend, Baileys → Twilio):
 *   1. Write a new file implementing `EmailProvider` or `WhatsAppProvider`.
 *   2. Register it in the PROVIDERS map in email/index.ts or whatsapp/index.ts.
 *   3. Flip the EMAIL_PROVIDER / WHATSAPP_PROVIDER env var.
 * No caller of sendEmail()/sendWhatsAppMessage() ever needs to change.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendResult {
  ok: boolean;
  /** The provider's own id for this message, if it gave one back. */
  providerMessageId?: string;
  /** Present when ok is false — safe to store in the notification's `note` field. */
  error?: string;
}

export interface EmailProvider {
  /** Short identifier, also the value the EMAIL_PROVIDER env var selects. */
  name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

export interface WhatsAppMessage {
  /** Any format; the provider normalizes it (e.g. to E.164 / WhatsApp JID). */
  to: string;
  text: string;
}

export interface WhatsAppProvider {
  name: string;
  send(message: WhatsAppMessage): Promise<SendResult>;
  /**
   * Whether the provider can send right now. Baileys needs a one-time QR
   * scan before it's connected; API-key providers (Twilio, Meta Cloud API)
   * can just return true once configured.
   */
  isReady(): boolean;
}
