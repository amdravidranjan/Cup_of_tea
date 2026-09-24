/**
 * Shapes for the assistant's answer bank.
 *
 * VANI already answers project-status questions from the live project list
 * (`lib/voice-assistant.ts`) and five topic regexes. Five regexes is roughly
 * one percent of what a person actually asks a land-acquisition help desk, so
 * everything a citizen might ask lives here instead as a structured bank of
 * pre-written bilingual answers, grouped so the widget can *offer* the
 * questions rather than making someone guess what it understands.
 *
 * Two design commitments that the types enforce:
 *
 *  - **Every answer is bilingual, and Tamil is not an afterthought.** `answer`
 *    is a required pair, not an optional Tamil override, so an entry cannot be
 *    merged English-only. NOVELTY.md's claim is that a Tamil-only speaker can
 *    use the system start to finish; the assistant is the first thing they
 *    touch, so it is the first thing that has to hold.
 *  - **Every answer carries its statutory basis.** A help desk that says "you
 *    get 100% solatium" without saying s.30(1) is asking to be trusted. One
 *    that names the section can be checked, which is the whole posture of this
 *    project.
 */

export type LanguageCode = "en" | "ta" | "hi";

/**
 * A string in the portal's languages.
 *
 * English and Tamil are both required, for the reason in the header: an entry
 * must not be mergeable English-only. Hindi is optional while the bank is
 * being translated — a missing Hindi answer falls back to English through
 * `pickText` rather than showing an empty bubble, and the widget says so.
 * Once the bank is fully translated `hi` becomes required like the others.
 */
export interface BilingualText {
  en: string;
  ta: string;
  hi?: string;
}

/** The text in the asked-for language, falling back to English. */
export function pickText(text: BilingualText, language: LanguageCode): string {
  return text[language] ?? text.en;
}

export type CategoryId =
  | "compensation"
  | "rr"
  | "status"
  | "grievance"
  | "documents"
  | "land-records"
  | "rights"
  | "possession"
  | "system"
  | "help";

export interface QueryCategory {
  id: CategoryId;
  label: BilingualText;
  /** One line under the category button, so the grouping explains itself. */
  blurb: BilingualText;
  /** Iconify name — the widget already depends on @iconify/react. */
  icon: string;
  /** Entry ids surfaced as buttons when this category is opened, in order. */
  featured: string[];
}

export interface AnswerLink {
  label: BilingualText;
  href: string;
}

export interface KnowledgeEntry {
  id: string;
  category: CategoryId;
  /** The canonical phrasing, shown in the suggested-question lists. */
  question: BilingualText;
  /**
   * Extra phrasings to match on: synonyms, transliterations, Tamil terms,
   * common misspellings, and the words someone uses when they do not know the
   * official term ("how much money will I get" for an award enquiry).
   */
  keywords: string[];
  answer: BilingualText;
  /** RFCTLARR section or rule the answer rests on. Rendered under the answer. */
  basis?: string;
  links?: AnswerLink[];
  /** Ids offered as "you might also ask" after this answer. */
  followUps?: string[];
}

export type ReplyKind =
  /** A matched knowledge-base answer. */
  | "answer"
  /** A live project was recognised and its status reported. */
  | "project"
  /** Several answers fit; the user is asked which they meant. */
  | "disambiguate"
  /** Nothing was typed, or only punctuation/emoji was. */
  | "empty"
  /** Greeting or thanks — answered, then steered somewhere useful. */
  | "smalltalk"
  /** The question was understood as off-topic for this portal. */
  | "out-of-scope"
  /** Input looked like an injection probe; answered as literal text. */
  | "probe"
  /** No match. The category menu is offered instead of an apology. */
  | "fallback";

export interface Suggestion {
  /** Entry id, or a category id prefixed `category:`. */
  ref: string;
  label: BilingualText;
}

export interface AssistantReply {
  kind: ReplyKind;
  /** The answer text in the requested language. */
  text: string;
  language: LanguageCode;
  /** 0–1. Below 0.45 the widget shows the answer *and* the suggestions. */
  confidence: number;
  entry?: KnowledgeEntry;
  category?: CategoryId;
  basis?: string;
  links?: { label: string; href: string }[];
  /** What to offer next. Never empty — a dead end is a failed answer. */
  suggestions: Suggestion[];
  /** Diagnostic, for the test suite and the console. Not shown to users. */
  matchedOn?: string;
}
