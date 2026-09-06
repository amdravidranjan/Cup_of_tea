# Real Email & WhatsApp Notifications

`docs/all-features (1).md` used to list Email and WhatsApp as simulated,
alongside Voice call and SMS. **Email and WhatsApp are now real** — this
doc is the setup guide and the record of how they work.

**Why only these two:** Voice calls need a telephony provider, and SMS to
Indian mobile numbers legally requires DLT template registration with
TRAI — both are multi-day approvals, not something to take on mid-build.
Email and WhatsApp have a path that costs nothing and needs no company
signup: your own Gmail account, and your own WhatsApp number. See the
"Voice / SMS" section at the bottom for why those stay simulated.

## Setup

### Email — your own Gmail account

1. Go to your Google Account → **Security** → **2-Step Verification** (turn
   it on if it isn't already) → **App passwords**.
2. Create an app password for "Mail". Google gives you a 16-character code.
3. Copy `.env.example` to `.env.local` and fill in:
   ```
   GMAIL_USER=youraddress@gmail.com
   GMAIL_APP_PASSWORD=the16charcode
   ```
4. Restart the dev server. That's it — no other signup, no API key from a
   company.

### WhatsApp — your own phone, no signup

1. Just start the dev server (`npm run dev`) and watch the **server
   terminal** (not the browser) the first time any page that touches
   notifications loads.
2. A QR code prints in the terminal. On the phone whose WhatsApp number
   should send messages: **WhatsApp → Settings → Linked Devices → Link a
   Device**, and scan it.
3. Once linked, the terminal prints `[whatsapp] connected`. The session is
   saved to `.baileys-auth/` (gitignored) so you won't need to re-scan on
   every restart — only if that folder is deleted or the phone unlinks it.
4. **Use a spare/secondary WhatsApp number if you have one.** This drives
   the same protocol WhatsApp Web uses, not Meta's official Business API —
   fine for a handful of demo messages, but not something to point at a
   number you can't afford to have flagged under heavy use.

## How it's wired (for swapping providers later)

Every call site talks only to `src/lib/notifications` (`sendEmail`,
`sendWhatsAppMessage`, `isWhatsAppReady`) — never to nodemailer or Baileys
directly. That indirection is the whole point: swapping providers later
never touches the caller.

```
src/lib/notifications/
├── types.ts              # EmailProvider / WhatsAppProvider contracts
├── index.ts               # sendEmail(), sendWhatsAppMessage(), isWhatsAppReady()
├── email/
│   ├── gmail.ts            # current implementation (nodemailer + App Password)
│   └── index.ts            # PROVIDERS map, keyed by EMAIL_PROVIDER
└── whatsapp/
    ├── baileys.ts           # current implementation (WhatsApp Web protocol)
    └── index.ts             # PROVIDERS map, keyed by WHATSAPP_PROVIDER
```

**To swap Email (e.g. to Resend, SES, SendGrid) later:**
1. Add `src/lib/notifications/email/resend.ts` implementing the same
   `EmailProvider` interface from `types.ts` (one method: `send`).
2. Register it in `email/index.ts`'s `PROVIDERS` map.
3. Set `EMAIL_PROVIDER=resend` in `.env.local`.

Nothing in `src/db/notifications-log.ts` or any component changes.

**To swap WhatsApp (e.g. to Twilio, Meta Cloud API) later:** same pattern,
in `whatsapp/`, keyed by `WHATSAPP_PROVIDER`.

## What actually happens when a notification is sent

`sendNotificationWith` in `src/db/notifications-log.ts`:

1. Looks up the family (for `contactEmail` / `contactPhone`) and the
   project (for the notice text).
2. Drafts the message via the existing `draftCitizenNotice()` template
   generator (`src/lib/notice-template.ts`) — the same text used for the
   AI-drafted-notice feature elsewhere in the app.
3. Calls `sendEmail()` or `sendWhatsAppMessage()`.
4. Records the **real** result: `SENT` if the provider succeeded, `FAILED`
   with the reason in `note` if it didn't (missing contact info on the
   family, WhatsApp not linked yet, SMTP error, etc.) — never silently
   dropped, never marked as sent when it wasn't.

A family must have a `contactEmail` (added to the `families` table) or
`contactPhone` on file for the respective channel to work — capture these
on the Families tab's "Register family" form.

## Voice call & SMS — deliberately still simulated

- **SMS to Indian numbers** requires DLT (Distributed Ledger Technology)
  template registration with TRAI, a multi-day process needing a
  registered business entity — not realistic mid-build.
- **Voice call** has no equivalent "use your own phone" trick the way
  Email and WhatsApp do; a real path needs a telephony provider (Twilio
  Voice, at cost) with no free/self-hosted alternative.

Both remain logged with the existing realistic status lifecycle
(`QUEUED → SENT → DELIVERED → FAILED`) but nothing is actually dialed or
texted, matching how Postal already worked before this change: real where
it can be, honestly simulated where it can't.
