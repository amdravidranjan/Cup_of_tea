/**
 * Deciding which answer a question wants.
 *
 * The rules, in the order they apply, and the reason for each:
 *
 *  1. **Empty or junk input is answered, not rejected.** A blank send, a row
 *     of emoji, a stray full stop — the reply is the category menu, because
 *     "please enter a question" is a scolding and a menu is help.
 *  2. **A named project beats a topic.** Someone who types "Sivaganga canal"
 *     wants that project's stage, not a general answer about canals. So the
 *     live project list is consulted first, exactly as the existing VANI does.
 *  3. **Real data beats written answers, but only on a strong match.** A
 *     one-word overlap with a project name is not a project question — "land"
 *     should not resolve to "Land Bank Corridor Project".
 *  4. **Two close answers produce a question, not a guess.** Where the top two
 *     scores are within a whisker, both are offered. A confident wrong answer
 *     costs more trust than an honest choice.
 *  5. **No match still routes somewhere.** The reply names the ten subjects and
 *     offers the closest few entries, rather than apologising.
 *
 * The whole module is synchronous and pure over its inputs, which is what
 * makes it testable and what lets it run with no network — the demo-day
 * requirement in DELEGATION.md that nothing may spin forever.
 */

import type {
  AssistantReply,
  BilingualText,
  CategoryId,
  KnowledgeEntry,
  LanguageCode,
  Suggestion,
} from "./types";
import { pickText } from "./types";
import { QUERY_CATEGORIES, categoryById } from "./categories";
import { KNOWLEDGE_BASE, entryById, menuForCategory } from "./knowledge";
import {
  containsDevanagari,
  containsTamilScript,
  expandTokens,
  normalise,
  tokensMatch,
} from "./synonyms";
import { looksLikeProbe, toSafeText } from "@/lib/ai/input-guard";

export interface PublicProjectLike {
  id: string;
  name: string;
  district: string;
  state: string;
  stage: string;
}

export interface AnswerOptions {
  /** Live project list, when the caller has one. Optional by design. */
  projects?: PublicProjectLike[];
  /** Forces the reply language; otherwise inferred from the question. */
  language?: LanguageCode;
  /** Narrows matching to one category, when the user tapped into it. */
  category?: CategoryId;
}

/* ── Stage vocabulary (shared with the existing VANI answers) ─────────── */

const STAGE_LABELS: Record<string, BilingualText> = {
  DRAFT: { en: "at the draft stage — nothing has been formally notified yet", ta: "வரைவு நிலையில் — இன்னும் அதிகாரப்பூர்வமாக அறிவிக்கப்படவில்லை", hi: "मसौदा चरण में — अभी औपचारिक अधिसूचना जारी नहीं हुई" },
  SCRUTINY: { en: "under scrutiny", ta: "ஆய்வில் உள்ளது", hi: "जाँच के अधीन" },
  SIA: { en: "undergoing its Social Impact Assessment", ta: "சமூக தாக்க மதிப்பீடு நடைபெறுகிறது", hi: "सामाजिक प्रभाव आकलन चल रहा है" },
  NOTIFIED: { en: "notified — the s.11 preliminary notification has been published and land transactions are frozen", ta: "அறிவிக்கப்பட்டது — பிரிவு 11 அறிவிப்பு வெளியிடப்பட்டு, நில பரிவர்த்தனைகள் முடக்கப்பட்டுள்ளன", hi: "अधिसूचित — धारा 11 की प्रारंभिक अधिसूचना प्रकाशित हो चुकी है और भूमि लेनदेन रुक गए हैं" },
  STATE_APPROVED: { en: "approved at the state level", ta: "மாநில அளவில் ஒப்புதல் பெற்றது", hi: "राज्य स्तर पर स्वीकृत" },
  CENTRAL_APPROVED: { en: "approved at the central level", ta: "மத்திய அளவில் ஒப்புதல் பெற்றது", hi: "केंद्र स्तर पर स्वीकृत" },
  DECLARED: { en: "declared under s.19 — the acquisition is now legally settled", ta: "பிரிவு 19-இன் கீழ் அறிவிக்கப்பட்டது — கையகப்படுத்தல் சட்டப்படி உறுதியாகிவிட்டது", hi: "धारा 19 के तहत घोषित — अर्जन अब कानूनी रूप से तय है" },
  AWARDED: { en: "awarded — compensation amounts have been determined", ta: "தீர்ப்பு வழங்கப்பட்டது — இழப்பீட்டுத் தொகை நிர்ணயிக்கப்பட்டுவிட்டது", hi: "अवार्ड घोषित — प्रतिकर की राशि तय हो चुकी है" },
  RR_IN_PROGRESS: { en: "in rehabilitation and resettlement", ta: "மறுவாழ்வு மற்றும் மீள்குடியேற்றக் கட்டத்தில்", hi: "पुनर्वास और पुनर्व्यवस्थापन के चरण में" },
  POSSESSION: { en: "at the possession stage — the land is being formally taken over", ta: "கையகப்படுத்தல் கட்டத்தில் — நிலம் முறையாக எடுத்துக்கொள்ளப்படுகிறது", hi: "कब्ज़े के चरण में — भूमि औपचारिक रूप से ली जा रही है" },
  RR_COMPLETE: { en: "complete — compensation, resettlement and infrastructure are all finished", ta: "முடிந்தது — இழப்பீடு, மீள்குடியேற்றம், உள்கட்டமைப்பு அனைத்தும் நிறைவு", hi: "पूर्ण — प्रतिकर, पुनर्व्यवस्थापन और अवसंरचना सब पूरे" },
};

const NEXT_STEP: Record<string, BilingualText> = {
  DRAFT: { en: "Next: scrutiny, then the Social Impact Assessment.", ta: "அடுத்து: ஆய்வு, பின் சமூக தாக்க மதிப்பீடு.", hi: "आगे: जाँच, फिर सामाजिक प्रभाव आकलन।" },
  SCRUTINY: { en: "Next: the Social Impact Assessment, with a public hearing in the affected villages.", ta: "அடுத்து: சமூக தாக்க மதிப்பீடு, பாதிக்கப்பட்ட கிராமங்களில் பொதுக் கூட்டத்துடன்.", hi: "आगे: सामाजिक प्रभाव आकलन, प्रभावित गाँवों में जनसुनवाई के साथ।" },
  SIA: { en: "Next: the assessment has to be appraised and completed before the s.11 notification.", ta: "அடுத்து: பிரிவு 11 அறிவிப்புக்கு முன் மதிப்பீடு முடிக்கப்பட வேண்டும்.", hi: "आगे: धारा 11 की अधिसूचना से पहले आकलन का मूल्यांकन और समापन ज़रूरी है।" },
  NOTIFIED: { en: "Next: state and central approval, then the s.19 declaration — which must follow within twelve months. Objections under s.15 can be filed within sixty days of the notification.", ta: "அடுத்து: மாநில மற்றும் மத்திய ஒப்புதல், பின் பிரிவு 19 அறிவிப்பு — பன்னிரண்டு மாதங்களுக்குள். அறிவிப்பிலிருந்து அறுபது நாட்களுக்குள் பிரிவு 15 ஆட்சேபணை தாக்கல் செய்யலாம்.", hi: "आगे: राज्य और केंद्र की स्वीकृति, फिर धारा 19 की घोषणा — जो बारह महीनों के भीतर होनी चाहिए। अधिसूचना के साठ दिनों के भीतर धारा 15 के तहत आपत्ति दाखिल की जा सकती है।" },
  STATE_APPROVED: { en: "Next: central approval where required, then the declaration.", ta: "அடுத்து: தேவைப்பட்டால் மத்திய ஒப்புதல், பின் அறிவிப்பு.", hi: "आगे: जहाँ ज़रूरी हो केंद्र की स्वीकृति, फिर घोषणा।" },
  CENTRAL_APPROVED: { en: "Next: the s.19 declaration.", ta: "அடுத்து: பிரிவு 19 அறிவிப்பு.", hi: "आगे: धारा 19 की घोषणा।" },
  DECLARED: { en: "Next: the award, which must be passed within twelve months of the declaration.", ta: "அடுத்து: தீர்ப்பு — அறிவிப்பிலிருந்து பன்னிரண்டு மாதங்களுக்குள் வழங்கப்பட வேண்டும்.", hi: "आगे: अवार्ड, जो घोषणा के बारह महीनों के भीतर पारित होना चाहिए।" },
  AWARDED: { en: "Next: payment, and then rehabilitation and resettlement.", ta: "அடுத்து: பணம் வழங்கல், பின் மறுவாழ்வு மற்றும் மீள்குடியேற்றம்.", hi: "आगे: भुगतान, फिर पुनर्वास और पुनर्व्यवस्थापन।" },
  RR_IN_PROGRESS: { en: "Next: once R&R is provided and compensation paid, possession can be taken.", ta: "அடுத்து: மறுவாழ்வு நிறைவேற்றப்பட்டு பணம் வழங்கப்பட்ட பின் கையகப்படுத்தல்.", hi: "आगे: पुनर्वास पूरा होने और प्रतिकर भुगतान के बाद कब्ज़ा लिया जा सकता है।" },
  POSSESSION: { en: "Next: resettlement infrastructure has to be completed within eighteen months of the award.", ta: "அடுத்து: தீர்ப்பிலிருந்து பதினெட்டு மாதங்களுக்குள் மீள்குடியேற்ற வசதிகள் முடிக்கப்பட வேண்டும்.", hi: "आगे: अवार्ड के अठारह महीनों के भीतर पुनर्व्यवस्थापन की अवसंरचना पूरी होनी चाहिए।" },
  RR_COMPLETE: { en: "This project has completed its full acquisition and resettlement process.", ta: "இந்தத் திட்டம் முழு கையகப்படுத்தல் மற்றும் மீள்குடியேற்ற நடைமுறையை முடித்துவிட்டது.", hi: "यह परियोजना अपनी पूरी अर्जन और पुनर्व्यवस्थापन प्रक्रिया पूरी कर चुकी है।" },
};

/* ── Small talk ──────────────────────────────────────────────────────── */

/**
 * Small talk, matched against the whole message.
 *
 * Written without `\b` after the Tamil alternatives on purpose: JavaScript's
 * word boundary is defined over ASCII word characters, so Tamil script is
 * never a `\w` and `வணக்கம்\b` can never fire. Anchoring on the end of the
 * greeting phrase instead is what makes a Tamil greeting reach this branch at
 * all — the same trap as an underscore in a file name.
 */
const GREETING = /^(hi|hello|hey|hai|good (morning|afternoon|evening)|vanakkam|வணக்கம்|நமஸ்காரம்)\s*[!.,?]*$/i;
const THANKS = /^(thanks|thank you|thankyou|nandri|நன்றி|ok thanks|super)\s*[!.,?]*$/i;
const FAREWELL = /^(bye|goodbye|see you|poitu varen|போய்ட்டு வரேன்)\s*[!.,?]*$/i;

/**
 * Questions that are clearly not about land acquisition.
 *
 * Answered with a redirect rather than a bad match, because the alternative is
 * matching "what is the weather" against the guideline-value entry on the word
 * "value" and looking broken.
 */
const OUT_OF_SCOPE = [
  { pattern: /\b(weather|rain|temperature|monsoon forecast)\b/i, topic: "the weather" },
  { pattern: /\b(cricket|score|match|ipl|football)\b/i, topic: "sport" },
  { pattern: /\b(recipe|cook|food|biriyani)\b/i, topic: "cooking" },
  { pattern: /\b(movie|film|song|actor)\b/i, topic: "films" },
  { pattern: /\b(ration card|pension|scholarship|driving licence|passport|voter id)\b.*\b(apply|how|get)\b/i, topic: "other government services" },
  { pattern: /\b(joke|poem|story|sing)\b/i, topic: "entertainment" },
  { pattern: /\b(who|what) (is|are) (you|your) (creator|maker|model|version)\b/i, topic: "how I was built" },
];

/* ── Scoring ─────────────────────────────────────────────────────────── */

interface ScoredEntry {
  entry: KnowledgeEntry;
  score: number;
  matchedOn: string[];
}

/**
 * How well one entry answers one question.
 *
 * Keyword hits are weighted well above question-text overlap, because keywords
 * are curated for this purpose while question text contains incidental words.
 * Exact-phrase containment is weighted highest of all: if someone typed a
 * keyword phrase verbatim, that is not a coincidence.
 */
function scoreEntry(entry: KnowledgeEntry, raw: string, tokens: string[]): ScoredEntry {
  const normalised = normalise(raw);
  let score = 0;
  const matchedOn: string[] = [];

  for (const keyword of entry.keywords) {
    const key = normalise(keyword);
    if (!key) continue;

    if (key.includes(" ")) {
      if (normalised.includes(key)) {
        score += 6;
        matchedOn.push(keyword);
        continue;
      }
      // "I lost my patta" should reach the "lost patta" keyword. Requiring a
      // contiguous substring misses every phrase a possessive splits, which
      // in practice is most of them.
      const parts = key.split(" ").filter((w) => w.length > 2);
      if (parts.length > 1 && parts.every((w) => tokens.some((t) => t === w))) {
        score += 4;
        matchedOn.push(`${keyword} (split)`);
      }
      continue;
    }
    if (tokens.some((t) => t === key)) {
      score += 3;
      matchedOn.push(keyword);
    } else if (tokens.some((t) => tokensMatch(t, key))) {
      score += 1.5;
      matchedOn.push(`${keyword}~`);
    }
  }

  // A typo of a word that only ever appears inside a multi-word keyword —
  // "compensaton" against "my compensation" — would otherwise score zero and
  // fall through to the no-match reply.
  if (score === 0) {
    const keywordWords = new Set(
      entry.keywords.flatMap((k) => normalise(k).split(" ")).filter((w) => w.length > 4)
    );
    for (const word of keywordWords) {
      if (tokens.some((t) => tokensMatch(t, word))) {
        score += 1.5;
        matchedOn.push(`${word}~`);
      }
    }
  }

  for (const questionText of [entry.question.en, entry.question.ta, entry.question.hi ?? ""]) {
    const questionTokens = expandTokens(questionText);
    const overlap = questionTokens.filter((qt) => tokens.some((t) => t === qt)).length;
    score += overlap * 0.8;
  }

  // A question typed almost verbatim from the menu should win outright.
  if (normalised && normalise(entry.question.en).includes(normalised) && normalised.length > 12) {
    score += 10;
    matchedOn.push("question text");
  }

  return { entry, score, matchedOn };
}

/**
 * The bare topic word, which people type far more often than any specific
 * phrasing. "Compensation" in a question is strong evidence for the
 * compensation category even when it matches no individual entry's keywords,
 * and without this the generic single-word question scores almost nothing.
 */
const CATEGORY_ANCHORS: Record<CategoryId, string[]> = {
  compensation: ["compensation", "solatium", "award", "amount", "money", "payment", "paid", "interest", "multiplier"],
  rr: ["rehabilitation", "resettlement", "entitlement", "housing", "subsistence", "annuity", "displaced"],
  status: ["stage", "status", "notified", "declared", "sia", "timeline", "delayed"],
  grievance: ["grievance", "complaint", "complain", "objection", "object", "escalate", "authority"],
  documents: ["document", "certificate", "patta", "chitta", "encumbrance", "upload"],
  "land-records": ["survey", "parcel", "boundary", "extent", "hectare", "cent", "classification"],
  rights: ["right", "consent", "refuse", "lapse", "urgency", "act"],
  possession: ["possession", "encroachment", "vacate", "harvest", "crop"],
  system: ["audit", "privacy", "portal", "offline", "tamil"],
  help: ["help", "office", "contact", "voice"],
};

function anchorBonus(category: CategoryId, tokens: string[]): number {
  const anchors = CATEGORY_ANCHORS[category] ?? [];
  return tokens.some((t) => anchors.includes(t)) ? 2.5 : 0;
}

function rank(raw: string, tokens: string[], within?: CategoryId): ScoredEntry[] {
  const pool = within ? KNOWLEDGE_BASE.filter((e) => e.category === within) : KNOWLEDGE_BASE;
  return pool
    .map((entry) => {
      const scored = scoreEntry(entry, raw, tokens);
      return { ...scored, score: scored.score + anchorBonus(entry.category, tokens) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/* ── Project matching ────────────────────────────────────────────────── */

interface ScoredProject {
  project: PublicProjectLike;
  hits: number;
  /** Hits on something other than the district or state name. */
  distinctiveHits: number;
}

/**
 * Project matching, stricter than the existing VANI lookup.
 *
 * The original scores any word over three characters against the project's
 * name, district and state, which means "what is the status of my land" can
 * match a project because "land" is in its name. Here a match needs either a
 * distinctive word of five characters or more, or two shorter hits — and
 * generic words that appear in half the project names are excluded outright.
 */
const GENERIC_PROJECT_WORDS = new Set([
  "project", "corridor", "phase", "land", "road", "state", "national", "new",
  "extension", "expansion", "development", "scheme", "tamil", "nadu", "india",
]);

function matchProjects(raw: string, projects: PublicProjectLike[]): ScoredProject[] {
  const normalised = normalise(raw);
  const words = normalised.split(" ").filter((w) => w.length > 3 && !GENERIC_PROJECT_WORDS.has(w));
  if (words.length === 0) return [];

  return projects
    .map((project) => {
      const district = normalise(project.district);
      const state = normalise(project.state);
      const haystack = normalise(`${project.name} ${district} ${state}`);
      let hits = 0;
      let distinctiveHits = 0;
      for (const word of words) {
        if (!haystack.includes(word)) continue;
        hits += word.length >= 5 ? 2 : 1;
        // A place name on its own is not a project reference. "Compensation in
        // Coimbatore" is a compensation question that mentions a district, and
        // the district name usually appears in the project's title too — so a
        // match resting only on the place resolves the wrong way. Something
        // beyond the district and state has to hit as well.
        if (!district.includes(word) && !state.includes(word)) distinctiveHits += 1;
      }
      return { project, hits, distinctiveHits };
    })
    .filter((r) => r.hits >= 2 && r.distinctiveHits >= 1)
    .sort((a, b) => b.hits - a.hits);
}

/* ── Suggestions ─────────────────────────────────────────────────────── */

function categoryMenuSuggestions(): Suggestion[] {
  return QUERY_CATEGORIES.map((c) => ({
    ref: `category:${c.id}`,
    label: c.label,
  }));
}

function suggestionsFor(entry: KnowledgeEntry): Suggestion[] {
  const followUps = (entry.followUps ?? [])
    .map((id) => entryById(id))
    .filter((e): e is KnowledgeEntry => e !== null)
    .map((e) => ({ ref: e.id, label: e.question }));

  if (followUps.length > 0) return followUps;

  // No declared follow-ups: offer the rest of its own category instead of
  // nothing, so an answer is never a dead end.
  return menuForCategory(entry.category)
    .filter((e) => e.id !== entry.id)
    .slice(0, 3)
    .map((e) => ({ ref: e.id, label: e.question }));
}

/* ── Public entry point ──────────────────────────────────────────────── */

/**
 * Answer a question. Takes `unknown` and cannot throw.
 *
 * `unknown` rather than `string` because this is called with whatever an input
 * element, a speech-recognition result or a test happened to produce, and an
 * assistant that throws on `undefined` takes the page down with it.
 */
export function answerAssistantQuery(rawInput: unknown, options: AnswerOptions = {}): AssistantReply {
  const safe = toSafeText(rawInput, 40_000);
  // A long paste usually ends with the actual question — someone pastes their
  // notice or a paragraph of context and then asks. Truncating from the front
  // throws the question away, so both ends are kept and the middle dropped.
  const raw =
    safe.value.length > 3000
      ? `${safe.value.slice(0, 1500)} … ${safe.value.slice(-1500)}`
      : safe.value;
  const language: LanguageCode =
    options.language ??
    (containsTamilScript(raw) ? "ta" : containsDevanagari(raw) ? "hi" : "en");
  const pick = (text: BilingualText) => pickText(text, language);

  // 1. Nothing usable typed.
  if (!raw || normalise(raw).replace(/[\s.]/g, "") === "") {
    return {
      kind: "empty",
      language,
      confidence: 1,
      text: pick({
        en: "Ask me anything about land acquisition — or tap one of these subjects and pick a question.",
        ta: "நில கையகப்படுத்தல் பற்றி எதையும் கேளுங்கள் — அல்லது கீழே ஒரு தலைப்பைத் தட்டி ஒரு கேள்வியைத் தேர்ந்தெடுங்கள்.",
        hi: "भूमि अर्जन के बारे में कुछ भी पूछिए — या नीचे किसी विषय पर टैप करके कोई सवाल चुनिए।",
      }),
      suggestions: categoryMenuSuggestions(),
    };
  }

  // A direct reference from a tapped button, rather than typed text.
  if (raw.startsWith("category:")) {
    return categoryReply(raw.slice("category:".length), language);
  }
  const direct = entryById(raw.trim());
  if (direct) return entryReply(direct, language, 1, "direct reference");

  const tokens = expandTokens(raw);

  // 2. Small talk. Answered warmly, then steered somewhere useful.
  if (GREETING.test(raw.trim())) {
    return {
      kind: "smalltalk",
      language,
      confidence: 1,
      text: pick({
        en: "வணக்கம். I can look up any project's status, or answer questions on compensation, R&R, your rights, documents and grievances. What would you like to know?",
        ta: "வணக்கம். எந்தத் திட்டத்தின் நிலையையும் பார்க்க முடியும்; இழப்பீடு, மறுவாழ்வு, உங்கள் உரிமைகள், ஆவணங்கள், குறைகள் பற்றியும் பதிலளிக்க முடியும். என்ன தெரிய வேண்டும்?",
        hi: "नमस्ते। मैं किसी भी परियोजना की स्थिति देख सकती हूँ, और प्रतिकर, पुनर्वास, आपके अधिकारों, दस्तावेज़ों तथा शिकायतों के सवालों के जवाब दे सकती हूँ। क्या जानना चाहेंगे?",
      }),
      suggestions: categoryMenuSuggestions(),
    };
  }
  if (THANKS.test(raw.trim())) {
    return {
      kind: "smalltalk",
      language,
      confidence: 1,
      text: pick({
        en: "Glad it helped. If any of it concerns your own land, filing a grievance puts your question on the record with a date and a response deadline.",
        ta: "உதவியாக இருந்ததில் மகிழ்ச்சி. உங்கள் சொந்த நிலம் தொடர்பானதாக இருந்தால், குறை மனு தாக்கல் செய்வது உங்கள் கேள்வியைத் தேதி மற்றும் பதில் காலக்கெடுவுடன் பதிவில் சேர்க்கும்.",
        hi: "मदद हुई, यह जानकर अच्छा लगा। यदि बात आपकी अपनी ज़मीन की है, तो शिकायत दर्ज करने से आपका सवाल तारीख और जवाब की समय-सीमा के साथ रिकॉर्ड पर आ जाता है।",
      }),
      suggestions: [
        { ref: "grv-how-to-file", label: { en: "How do I file a complaint?", ta: "குறை மனுவை எவ்வாறு தாக்கல் செய்வது?" } },
        ...categoryMenuSuggestions().slice(0, 3),
      ],
    };
  }
  if (FAREWELL.test(raw.trim())) {
    return {
      kind: "smalltalk",
      language,
      confidence: 1,
      text: pick({
        en: "Take care. Keep your survey number and any tracking number handy — they make every office visit shorter.",
        ta: "நல்லது. உங்கள் நில அளவை எண் மற்றும் கண்காணிப்பு எண்ணை கையில் வைத்திருங்கள் — ஒவ்வொரு அலுவலக வருகையையும் அவை குறைக்கும்.",
        hi: "ठीक है। अपना खसरा नंबर और कोई भी ट्रैकिंग नंबर पास रखिए — हर दफ़्तर का चक्कर इनसे छोटा हो जाता है।",
      }),
      suggestions: [],
    };
  }

  // 3. An injection probe is answered as literal text, and named as such —
  //    silently returning "no match" reads like a crash to whoever typed it.
  if (looksLikeProbe(raw)) {
    const ranked = rank(raw, tokens, options.category);
    return {
      kind: "probe",
      language,
      confidence: 0.3,
      text: pick({
        en: "That was read as plain text, not as a command — nothing here interprets what you type as code. If it was a real question, try it in words, or pick a subject below.",
        ta: "அது கட்டளையாக அல்ல, எளிய உரையாகவே படிக்கப்பட்டது — நீங்கள் தட்டச்சு செய்வது எதுவும் நிரலாகச் செயல்படுத்தப்படுவதில்லை. உண்மையான கேள்வியாக இருந்தால், வார்த்தைகளில் கேளுங்கள்.",
        hi: "उसे आदेश नहीं, सादा पाठ मानकर पढ़ा गया — आप जो लिखते हैं उसे यहाँ कोड की तरह नहीं चलाया जाता। यदि वह सचमुच सवाल था, तो उसे शब्दों में पूछिए, या नीचे कोई विषय चुनिए।",
      }),
      suggestions:
        ranked.length > 0
          ? ranked.slice(0, 3).map((s) => ({ ref: s.entry.id, label: s.entry.question }))
          : categoryMenuSuggestions(),
    };
  }

  // 4. A named project beats a topic — real data first.
  const projectMatches = options.projects?.length ? matchProjects(raw, options.projects) : [];
  const topicRanked = rank(raw, tokens, options.category);

  if (projectMatches.length > 0) {
    // Unless the question is plainly a topic question that happens to mention a
    // place: "compensation in Madurai" wants the compensation answer.
    const topTopic = topicRanked[0];
    // Two solid keyword hits is enough to conclude the question is a topic
    // question that happens to name a place — "how is compensation calculated
    // in Coimbatore" wants the compensation answer, not the Coimbatore bypass.
    const strongTopic = topTopic && topTopic.score >= 6;
    if (!strongTopic) return projectReply(projectMatches, language);
  }

  // 5. No topic match at all. Inside an open category, stay in it — dropping
  //    someone back to the top-level menu loses the place they navigated to.
  if (topicRanked.length === 0 && options.category) {
    return categoryReply(options.category, language);
  }
  if (topicRanked.length === 0) {
    const outOfScope = OUT_OF_SCOPE.find((o) => o.pattern.test(raw));
    if (outOfScope) {
      return {
        kind: "out-of-scope",
        language,
        confidence: 0.9,
        text: pick({
          en: `I only handle land acquisition, compensation and resettlement — I cannot help with ${outOfScope.topic}. For other government services, an e-Sevai centre is the right place.`,
          ta: `நான் நில கையகப்படுத்தல், இழப்பீடு, மீள்குடியேற்றம் பற்றி மட்டுமே கையாள்கிறேன். மற்ற அரசு சேவைகளுக்கு இ-சேவை மையம் சரியான இடம்.`,
          hi: `मैं केवल भूमि अर्जन, प्रतिकर और पुनर्व्यवस्थापन देखती हूँ — ${outOfScope.topic} में मदद नहीं कर सकती। अन्य सरकारी सेवाओं के लिए सामान्य सेवा केंद्र सही जगह है।`,
        }),
        suggestions: categoryMenuSuggestions(),
      };
    }
    return {
      kind: "fallback",
      language,
      confidence: 0,
      text: pick({
        en: "I could not match that to anything I know. Try naming a project, a district, or a survey number — or tap a subject below and pick a question that is already written out.",
        ta: "அதை எனக்குத் தெரிந்த எதனுடனும் பொருத்த முடியவில்லை. ஒரு திட்டம், மாவட்டம் அல்லது நில அளவை எண்ணைக் குறிப்பிடுங்கள் — அல்லது கீழே ஒரு தலைப்பைத் தட்டி, ஏற்கனவே எழுதப்பட்ட கேள்வியைத் தேர்ந்தெடுங்கள்.",
        hi: "इसे मैं अपनी जानी हुई किसी बात से नहीं मिला पाई। कोई परियोजना, ज़िला या खसरा नंबर बताइए — या नीचे कोई विषय चुनकर पहले से लिखा हुआ सवाल उठाइए।",
      }),
      suggestions: categoryMenuSuggestions(),
    };
  }

  // 6. Two answers too close to choose between: ask rather than guess.
  const top = topicRanked[0];
  const second = topicRanked[1];
  if (second && top.score - second.score < 1.5 && top.score < 9) {
    return {
      kind: "disambiguate",
      language,
      confidence: 0.4,
      text: pick({
        en: "That could mean a couple of things. Which did you mean?",
        ta: "அது இரண்டு பொருள்களில் இருக்கலாம். எதைக் கருதினீர்கள்?",
        hi: "इसके दो मतलब हो सकते हैं। आपका मतलब कौन सा था?",
      }),
      suggestions: topicRanked.slice(0, 3).map((s) => ({ ref: s.entry.id, label: s.entry.question })),
      matchedOn: top.matchedOn.join(", "),
    };
  }

  // Confidence is the top score scaled against the point at which a match is
  // unambiguous. Capped, because arithmetic on keyword hits is not probability.
  const confidence = Math.max(0.2, Math.min(0.98, top.score / 14));
  return entryReply(top.entry, language, confidence, top.matchedOn.join(", "));
}

function entryReply(
  entry: KnowledgeEntry,
  language: LanguageCode,
  confidence: number,
  matchedOn: string
): AssistantReply {
  return {
    kind: "answer",
    language,
    confidence,
    text: pickText(entry.answer, language),
    entry,
    category: entry.category,
    basis: entry.basis,
    links: entry.links?.map((l) => ({ label: pickText(l.label, language), href: l.href })),
    suggestions: suggestionsFor(entry),
    matchedOn,
  };
}

function categoryReply(categoryId: string, language: LanguageCode): AssistantReply {
  const category = categoryById(categoryId);
  if (!category) {
    return {
      kind: "fallback",
      language,
      confidence: 0,
      text: pickText(
        {
          en: "That subject is not one I have. Pick one of these instead.",
          ta: "அந்தத் தலைப்பு கிடைக்கவில்லை. கீழே உள்ளவற்றில் ஒன்றைத் தேர்ந்தெடுங்கள்.",
          hi: "वह विषय मेरे पास नहीं है। नीचे दिए गए में से कोई एक चुनिए।",
        },
        language
      ),
      suggestions: categoryMenuSuggestions(),
    };
  }
  return {
    kind: "answer",
    language,
    confidence: 1,
    category: category.id,
    text: `${pickText(category.label, language)} — ${pickText(category.blurb, language)}`,
    suggestions: menuForCategory(category.id)
      .slice(0, 8)
      .map((e) => ({ ref: e.id, label: e.question })),
  };
}

function projectReply(matches: ScoredProject[], language: LanguageCode): AssistantReply {
  const { project } = matches[0];
  const stage = STAGE_LABELS[project.stage] ?? { en: project.stage, ta: project.stage, hi: project.stage };
  const next = NEXT_STEP[project.stage] ?? { en: "", ta: "", hi: "" };
  const others = matches.length - 1;

  const alsoFound =
    others > 0
      ? pickText(
          {
            en: ` I also found ${others} other project${others > 1 ? "s" : ""} matching that.`,
            ta: ` அதே தேடலுக்கு வேறு ${others} திட்டமும் பொருந்தியது.`,
            hi: ` इसी खोज से ${others} और परियोजनाएँ भी मिलीं।`,
          },
          language
        )
      : "";

  const where = `${project.name} (${project.district}, ${project.state})`;
  const text = pickText(
    {
      en: `${where} is currently ${stage.en}. ${next.en}${alsoFound}`,
      ta: `${where} தற்போது ${stage.ta}. ${next.ta}${alsoFound}`,
      hi: `${where} इस समय ${stage.hi ?? stage.en} है। ${next.hi ?? next.en}${alsoFound}`,
    },
    language
  );

  return {
    kind: "project",
    language,
    confidence: 0.9,
    text,
    suggestions: [
      { ref: "land-find-my-parcel", label: { en: "Is my land in this project?", ta: "எனது நிலம் இந்தத் திட்டத்தில் உள்ளதா?" } },
      { ref: "comp-how-much", label: { en: "How much compensation would I get?", ta: "எவ்வளவு இழப்பீடு கிடைக்கும்?" } },
      { ref: "status-why-delayed", label: { en: "Why has it not moved?", ta: "ஏன் முன்னேறவில்லை?" } },
    ],
    matchedOn: `project:${project.id}`,
  };
}

/** Resolves a tapped suggestion to a reply. Used by the widget. */
export function answerSuggestion(ref: string, options: AnswerOptions = {}): AssistantReply {
  return answerAssistantQuery(ref, options);
}
