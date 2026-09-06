import type { EmailProvider } from "../types";
import { gmailEmailProvider } from "./gmail";

/**
 * Registered email providers, keyed by the value EMAIL_PROVIDER selects.
 * Add a new provider by implementing EmailProvider in a sibling file and
 * adding one line here — e.g.:
 *   import { resendEmailProvider } from "./resend";
 *   const PROVIDERS = { gmail: gmailEmailProvider, resend: resendEmailProvider };
 * Then set EMAIL_PROVIDER=resend in .env.local. No other file changes.
 */
const PROVIDERS: Record<string, EmailProvider> = {
  gmail: gmailEmailProvider,
};

export function getEmailProvider(): EmailProvider {
  const key = process.env.EMAIL_PROVIDER || "gmail";
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new Error(
      `Unknown EMAIL_PROVIDER "${key}". Available: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return provider;
}
