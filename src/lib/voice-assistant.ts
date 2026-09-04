/**
 * Speech + project-lookup logic for the public "VANI" assistant.
 *
 * Extracted from the old `voice-chatbot.tsx`, which was fully built — Web
 * Speech API in and out, real lookups against the public projects API — but
 * was never imported anywhere. The widget actually mounted on the site was a
 * different component with canned replies and no voice at all, so the
 * voice-enabled assistant in the feature list did not exist for users.
 *
 * Keeping this as a plain module lets the styled public widget use it without
 * inheriting the orphan's (differently styled) markup.
 *
 * Speech is the browser's built-in Web Speech API — no external STT/TTS
 * service is contacted. Browsers without it fall back to text-only.
 */

export interface PublicProject {
  id: string;
  name: string;
  district: string;
  state: string;
  stage: string;
}

const STAGE_LABELS: Record<string, string> = {
  DRAFT: "at the draft stage — not yet formally notified",
  SCRUTINY: "under scrutiny",
  SIA: "undergoing a Social Impact Assessment",
  NOTIFIED: "notified — the government has formally announced this project",
  STATE_APPROVED: "approved at the state level",
  CENTRAL_APPROVED: "approved at the central government level",
  DECLARED: "declared — the acquisition is now legally final",
  AWARDED: "awarded — compensation amounts have been decided",
  RR_IN_PROGRESS: "in the rehabilitation & resettlement stage",
  POSSESSION: "at the possession stage — the government is taking formal possession of the land",
  RR_COMPLETE: "complete — rehabilitation, resettlement, and infrastructure are all finished",
};

const NEXT_STEP: Record<string, string> = {
  SIA: "Next, the Social Impact Assessment has to be completed before notification.",
  NOTIFIED: "Next, it needs state and then central government approval.",
  STATE_APPROVED: "Next, it needs central government approval.",
  CENTRAL_APPROVED: "Next, the acquisition will be formally declared.",
  DECLARED: "Next, compensation will be awarded.",
  AWARDED: "Next, rehabilitation and resettlement (R&R) will begin.",
  RR_IN_PROGRESS:
    "Next, once R&R is complete, the government will take possession of the land.",
  POSSESSION:
    "Next, if a resettlement colony is involved, its infrastructure gets built out.",
  RR_COMPLETE: "This project has completed its full acquisition and resettlement process.",
};

/** Canned answers for the general topics the quick-reply chips offer. */
const TOPIC_REPLIES: { match: RegExp; reply: string }[] = [
  {
    match: /compensation|solatium|award|larr|calculat/,
    reply:
      "Compensation follows RFCTLARR Act Sections 26–30: market value × the rural multiplier (up to 4×), plus 100% solatium and 12% per annum interest. The Compensation page has a calculator you can check your own entitlement with.",
  },
  {
    match: /r&r|rehabilitation|resettlement|entitlement|housing/,
    reply:
      "R&R entitlements under the Second Schedule include housing, a subsistence grant, transport allowance and employment support. You can check a household's status on the R&R page.",
  },
  {
    match: /grievance|complaint|object/,
    reply:
      "You can file a grievance from any project page or the Grievances page. You'll get a tracking number immediately, and you can follow it on the Track page.",
  },
  {
    match: /field|verification|geo.?tag|possession marking/,
    reply:
      "Field verification is done on-site by Land Acquisition Officers — geo-tagging each parcel, uploading photographs and updating possession status, and it works offline in remote areas.",
  },
  {
    match: /document|section 11|section 19|notification|declaration/,
    reply:
      "Section 11 notifications, Section 19 declarations, award letters and possession certificates are all published on the Documents page, and each project page lists its own documents.",
  },
];

export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: { [key: number]: { [key: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

/** The browser's SpeechRecognition constructor, or null where unsupported. */
export function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Read `text` aloud. No-op where speechSynthesis is unavailable. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

/**
 * Answer a question about project status.
 *
 * Rule-based, over the real public project list: a project is matched by
 * scoring how many of the query's words appear in its name, district or state,
 * so "what's happening with the Sivaganga canal" resolves to the right record.
 */
export function answerQuery(query: string, projects: PublicProject[]): string {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 'You can ask me things like "what\'s the status of the Sivaganga canal project?"';
  }

  if (/^(hi|hello|hey|vanakkam|வணக்கம்)\b/.test(q)) {
    return "Hello! Ask me about the status of any project — just say or type its name, district, or what it is.";
  }
  if (/help|what can you|how do you work/.test(q)) {
    return "I can look up any project's current stage and what happens next, and explain compensation, R&R entitlements, grievances and documents. Try asking about a project by name or district.";
  }

  // A named project beats a generic topic, so project matching runs first.
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const scored = projects
    .map((p) => {
      const haystack = `${p.name} ${p.district} ${p.state}`.toLowerCase();
      return { p, hits: words.filter((w) => haystack.includes(w)).length };
    })
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  if (scored.length > 0) {
    const { p } = scored[0];
    const stageText = STAGE_LABELS[p.stage] ?? p.stage;
    const nextStep = NEXT_STEP[p.stage] ?? "";
    const also =
      scored.length > 1
        ? ` I also found ${scored.length - 1} other project${
            scored.length > 2 ? "s" : ""
          } matching that.`
        : "";
    return `${p.name} (${p.district}, ${p.state}) is currently ${stageText}. ${nextStep}${also}`;
  }

  for (const topic of TOPIC_REPLIES) {
    if (topic.match.test(q)) return topic.reply;
  }

  return "I couldn't find a project matching that. Try its name or district — or ask me about compensation, R&R, grievances or documents.";
}
