import type { WhatsAppProvider } from "../types";
import { baileysWhatsAppProvider } from "./baileys";

/**
 * Registered WhatsApp providers, keyed by the value WHATSAPP_PROVIDER
 * selects. Add a new provider (e.g. Twilio, Meta Cloud API) by
 * implementing WhatsAppProvider in a sibling file and adding one line
 * here, then set WHATSAPP_PROVIDER to its key in .env.local. No other
 * file changes.
 */
const PROVIDERS: Record<string, WhatsAppProvider> = {
  baileys: baileysWhatsAppProvider,
};

export function getWhatsAppProvider(): WhatsAppProvider {
  const key = process.env.WHATSAPP_PROVIDER || "baileys";
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new Error(
      `Unknown WHATSAPP_PROVIDER "${key}". Available: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return provider;
}
