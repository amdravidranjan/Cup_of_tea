/**
 * The assembled answer bank.
 *
 * Split by category into one file each rather than kept as one array, because
 * the categories are owned as content — someone correcting a compensation
 * answer should not be reading past sixty entries about possession to find it,
 * and two people editing different categories should not conflict.
 *
 * `knowledgeIntegrityProblems` is here rather than only in the test file on
 * purpose: a broken follow-up reference is a dead end in front of a judge, and
 * the sandbox page renders these problems so they cannot sit unnoticed between
 * test runs.
 */

import type { CategoryId, KnowledgeEntry } from "../types";
import { QUERY_CATEGORIES } from "../categories";
import { COMPENSATION_ENTRIES } from "./compensation";
import { RR_ENTRIES } from "./rr";
import { STATUS_ENTRIES } from "./status";
import { GRIEVANCE_ENTRIES } from "./grievance";
import { DOCUMENT_ENTRIES } from "./documents";
import { LAND_RECORD_ENTRIES } from "./land-records";
import { RIGHTS_ENTRIES } from "./rights";
import { POSSESSION_ENTRIES } from "./possession";
import { SYSTEM_ENTRIES } from "./system";
import { HELP_ENTRIES } from "./help";

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  ...COMPENSATION_ENTRIES,
  ...RR_ENTRIES,
  ...STATUS_ENTRIES,
  ...GRIEVANCE_ENTRIES,
  ...DOCUMENT_ENTRIES,
  ...LAND_RECORD_ENTRIES,
  ...RIGHTS_ENTRIES,
  ...POSSESSION_ENTRIES,
  ...SYSTEM_ENTRIES,
  ...HELP_ENTRIES,
];

const BY_ID = new Map(KNOWLEDGE_BASE.map((e) => [e.id, e]));

export function entryById(id: string): KnowledgeEntry | null {
  return BY_ID.get(id) ?? null;
}

export function entriesInCategory(category: CategoryId): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter((e) => e.category === category);
}

/**
 * Featured entries for a category, in the order the category declares, with
 * anything not featured appended. So the ordering is editorial where it has
 * been decided and complete where it has not — a new entry shows up in the
 * menu the day it is written rather than waiting for someone to remember to
 * list it.
 */
export function menuForCategory(category: CategoryId): KnowledgeEntry[] {
  const meta = QUERY_CATEGORIES.find((c) => c.id === category);
  if (!meta) return entriesInCategory(category);
  const featured = meta.featured
    .map((id) => BY_ID.get(id))
    .filter((e): e is KnowledgeEntry => e !== undefined);
  const featuredIds = new Set(featured.map((e) => e.id));
  const rest = entriesInCategory(category).filter((e) => !featuredIds.has(e.id));
  return [...featured, ...rest];
}

export interface IntegrityProblem {
  kind: "duplicate-id" | "missing-followup" | "missing-featured" | "empty-tamil" | "no-keywords";
  entryId: string;
  detail: string;
}

/**
 * Everything structurally wrong with the bank, as a list.
 *
 * Checked rather than assumed because all five of these failures are silent:
 * a missing Tamil answer renders as a blank bubble, a bad follow-up id renders
 * as a button that does nothing, and neither shows up until someone taps it.
 */
export function knowledgeIntegrityProblems(): IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];
  const seen = new Set<string>();

  for (const entry of KNOWLEDGE_BASE) {
    if (seen.has(entry.id)) {
      problems.push({
        kind: "duplicate-id",
        entryId: entry.id,
        detail: `Two entries share the id "${entry.id}"; the second is unreachable.`,
      });
    }
    seen.add(entry.id);

    if (!entry.answer.ta.trim() || !entry.question.ta.trim()) {
      problems.push({
        kind: "empty-tamil",
        entryId: entry.id,
        detail: "Tamil question or answer is empty — it would render as a blank bubble.",
      });
    }
    if (entry.keywords.length === 0) {
      problems.push({
        kind: "no-keywords",
        entryId: entry.id,
        detail: "No keywords, so this entry can only be reached from the menu.",
      });
    }
    for (const followUp of entry.followUps ?? []) {
      if (!BY_ID.has(followUp)) {
        problems.push({
          kind: "missing-followup",
          entryId: entry.id,
          detail: `Follow-up "${followUp}" does not exist — the button would do nothing.`,
        });
      }
    }
  }

  for (const category of QUERY_CATEGORIES) {
    for (const id of category.featured) {
      if (!BY_ID.has(id)) {
        problems.push({
          kind: "missing-featured",
          entryId: id,
          detail: `Category "${category.id}" features "${id}", which does not exist.`,
        });
      }
    }
  }

  return problems;
}

/** Counts for the sandbox header and the acceptance row. */
export function knowledgeStats(): {
  total: number;
  byCategory: { category: CategoryId; count: number }[];
  keywordCount: number;
  withBasis: number;
} {
  return {
    total: KNOWLEDGE_BASE.length,
    byCategory: QUERY_CATEGORIES.map((c) => ({
      category: c.id,
      count: entriesInCategory(c.id).length,
    })),
    keywordCount: KNOWLEDGE_BASE.reduce((sum, e) => sum + e.keywords.length, 0),
    withBasis: KNOWLEDGE_BASE.filter((e) => e.basis).length,
  };
}
