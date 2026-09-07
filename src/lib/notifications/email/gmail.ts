/**
 * Email via the sender's own Gmail account — no third-party email
 * service, no API key from a company. Auth is a Gmail "App Password"
 * (Google Account → Security → App passwords), which is free and takes
 * about 30 seconds to generate.
 *
 * Swap-out note: this file is the only thing that knows about Gmail /
 * nodemailer. To move to Resend, SES, etc. later, add a sibling file
 * implementing EmailProvider and register it in ./index.ts — nothing
 * else in the app changes.
 */
import nodemailer, { type Transporter } from "nodemailer";
import type { EmailProvider, EmailMessage, SendResult } from "../types";

// Cached across requests (and, in dev, across HMR reloads via globalThis)
// so we don't open a new SMTP connection per send.
declare global {
  // eslint-disable-next-line no-var
  var __gmailTransporter: Transporter | undefined;
}

function getTransporter(): Transporter {
  if (globalThis.__gmailTransporter) return globalThis.__gmailTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER / GMAIL_APP_PASSWORD are not set. Add them to .env.local — " +
        "see docs/NOTIFICATIONS.md for how to generate a Gmail App Password."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  globalThis.__gmailTransporter = transporter;
  return transporter;
}

export const gmailEmailProvider: EmailProvider = {
  name: "gmail",
  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const info = await getTransporter().sendMail({
        from: `NILAMS <${process.env.GMAIL_USER}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return { ok: true, providerMessageId: info.messageId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
