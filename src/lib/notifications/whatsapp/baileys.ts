/**
 * WhatsApp via the sender's own phone — no Meta Business API, no Twilio,
 * no company signup. Baileys drives the same protocol WhatsApp Web uses:
 * scan a QR code once with the sending phone (WhatsApp → Linked Devices →
 * Link a Device) and this process can then send messages as that number.
 *
 * Honesty note (also in docs/NOTIFICATIONS.md): this is the *unofficial*
 * WhatsApp Web protocol, not Meta's sanctioned Business API. Fine for a
 * handful of demo messages; use a spare/secondary WhatsApp number rather
 * than your only personal one if you can, as a precaution.
 *
 * Swap-out note: this file is the only thing that knows about Baileys.
 * To move to Twilio's WhatsApp API or Meta's Cloud API later, add a
 * sibling file implementing WhatsAppProvider and register it in
 * ./index.ts — nothing else in the app changes.
 *
 * Session credentials are written to .baileys-auth/ on disk (gitignored —
 * never commit it, it's equivalent to a login session for a real phone
 * number). Delete that folder to force a fresh QR scan.
 */
import path from "node:path";
import pino from "pino";
import { Boom } from "@hapi/boom";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import type { WhatsAppProvider, WhatsAppMessage, SendResult } from "../types";

const AUTH_DIR = path.join(process.cwd(), ".baileys-auth");
const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? "silent" });

// Cached on globalThis so Next.js's dev-mode HMR (which re-executes this
// module on every edit) doesn't open a second WhatsApp connection.
declare global {
  // eslint-disable-next-line no-var
  var __waSocket: WASocket | null | undefined;
  // eslint-disable-next-line no-var
  var __waReady: boolean | undefined;
  // eslint-disable-next-line no-var
  var __waConnecting: boolean | undefined;
  // eslint-disable-next-line no-var
  var __waRetryCount: number | undefined;
  // eslint-disable-next-line no-var
  var __waReconnectTimer: ReturnType<typeof setTimeout> | undefined;
}

function log(...args: unknown[]) {
  console.log("[whatsapp]", ...args);
}

const MAX_RECONNECT_DELAY_MS = 30_000;

/** Backs off up to MAX_RECONNECT_DELAY_MS instead of retrying instantly —
 *  without this, a genuinely unreachable network (no internet, a firewalled
 *  environment) turns into a tight loop that hammers the log and the CPU. */
function scheduleReconnect(): void {
  clearTimeout(globalThis.__waReconnectTimer);
  const attempt = (globalThis.__waRetryCount ?? 0) + 1;
  globalThis.__waRetryCount = attempt;
  const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** Math.min(attempt, 5));
  log(`reconnecting in ${Math.round(delay / 1000)}s (attempt ${attempt})…`);
  globalThis.__waReconnectTimer = setTimeout(() => {
    connectSafely();
  }, delay);
}

// Baileys needs to know which WhatsApp Web protocol version to speak.
// fetchLatestBaileysVersion() looks it up from a small remote JSON file;
// if that lookup itself can't reach the network (proxy, firewall, DNS
// hiccup) we fall back to a recent known-good version rather than
// letting the whole connect() attempt throw before it even opens a
// socket.
const FALLBACK_WA_VERSION: [number, number, number] = [2, 3000, 1023223821];

async function resolveVersion(): Promise<[number, number, number]> {
  try {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    if (!isLatest) {
      log(`using WA web version ${version.join(".")} (not confirmed latest)`);
    }
    return version;
  } catch (err) {
    log(
      "couldn't fetch the latest WhatsApp Web version (network issue?) — falling back to a pinned version:",
      err instanceof Error ? err.message : String(err)
    );
    return FALLBACK_WA_VERSION;
  }
}

async function connect(): Promise<void> {
  if (globalThis.__waConnecting || globalThis.__waSocket) return;
  clearTimeout(globalThis.__waReconnectTimer);
  globalThis.__waConnecting = true;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const version = await resolveVersion();

  const sock = makeWASocket({ auth: state, version, logger, printQRInTerminal: false });
  globalThis.__waSocket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Printed to the server terminal, not to any UI — scanning it hands
      // over control of a real WhatsApp account, so it must never be
      // exposed over HTTP.
      import("qrcode-terminal").then(({ default: qrcodeTerminal }) => {
        log("scan this QR code with WhatsApp → Linked Devices → Link a Device:");
        qrcodeTerminal.generate(qr, { small: true });
      });
    }

    if (connection === "open") {
      globalThis.__waReady = true;
      globalThis.__waConnecting = false;
      globalThis.__waRetryCount = 0;
      log("connected");
    }

    if (connection === "close") {
      globalThis.__waReady = false;
      globalThis.__waConnecting = false;
      globalThis.__waSocket = null;
      const boom = lastDisconnect?.error as Boom | undefined;
      const statusCode = boom?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      // Always logged (not gated behind BAILEYS_LOG_LEVEL) — this is the
      // one piece of information that actually explains a failed link,
      // and it was previously silenced, which is why past failures showed
      // only "reconnecting" with no reason.
      log(
        `connection closed — statusCode=${statusCode ?? "unknown"} reason="${
          boom?.message ?? lastDisconnect?.error?.message ?? "unknown"
        }"`
      );
      if (loggedOut) {
        log("logged out — delete .baileys-auth/ and restart to re-link");
      } else {
        scheduleReconnect();
      }
    }
  });
}

/** Wraps connect() so a thrown setup error (e.g. useMultiFileAuthState
 *  failing to read/write .baileys-auth/) is logged and still retried,
 *  instead of leaving __waConnecting stuck true forever. */
function connectSafely(): void {
  connect().catch((err) => {
    globalThis.__waConnecting = false;
    globalThis.__waSocket = null;
    log("connect() threw:", err instanceof Error ? err.message : String(err));
    scheduleReconnect();
  });
}

function toJid(phone: string): string {
  // Accepts "+91 98765 43210", "9876543210", etc. — strips everything but
  // digits and assumes an Indian number (91-prefixed) if no country code
  // is present, since this system's phone numbers are all Indian.
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `${withCountryCode}@s.whatsapp.net`;
}

export const baileysWhatsAppProvider: WhatsAppProvider = {
  name: "baileys",

  isReady() {
    return globalThis.__waReady === true;
  },

  async send(message: WhatsAppMessage): Promise<SendResult> {
    if (!globalThis.__waSocket || !globalThis.__waReady) {
      connectSafely(); // fire-and-forget; surfaces the QR code if not linked yet
      return {
        ok: false,
        error:
          "WhatsApp is not connected yet. Check the server terminal for a QR code, scan it with WhatsApp → Linked Devices, then retry.",
      };
    }
    try {
      const result = await globalThis.__waSocket.sendMessage(toJid(message.to), {
        text: message.text,
      });
      return { ok: true, providerMessageId: result?.key?.id ?? undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

// Start connecting as soon as this module is first imported, so the QR
// code (if needed) appears in the server terminal before anyone tries to
// send anything.
if (process.env.WHATSAPP_PROVIDER !== "off") {
  connectSafely();
}
