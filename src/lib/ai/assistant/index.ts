/**
 * The assistant's public surface.
 *
 * One import for the widget and one for `lib/voice-assistant.ts`, so Lane D's
 * integration is a single line and this folder can be restructured without
 * touching their files.
 */

export type {
  AssistantReply,
  AnswerLink,
  BilingualText,
  CategoryId,
  KnowledgeEntry,
  LanguageCode,
  QueryCategory,
  ReplyKind,
  Suggestion,
} from "./types";

export { QUERY_CATEGORIES, categoryById } from "./categories";

export {
  KNOWLEDGE_BASE,
  entriesInCategory,
  entryById,
  knowledgeIntegrityProblems,
  knowledgeStats,
  menuForCategory,
} from "./knowledge";

export {
  answerAssistantQuery,
  answerSuggestion,
  type AnswerOptions,
  type PublicProjectLike,
} from "./match";

export { containsTamilScript, expandTokens, normalise } from "./synonyms";
