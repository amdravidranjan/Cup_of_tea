import type { Role } from "./workflow";
export type { Role } from "./workflow";

export type RRStage =
  | "SURVEYED"
  | "SCHEME_DRAFTED"
  | "PUBLISHED"
  | "SUBMITTED_TO_COLLECTOR"
  | "COMMITTEE_APPROVED"
  | "RR_AWARDED";

export type RRAction =
  | "COMPLETE_SURVEY"
  | "COMPLETE_SCHEME"
  | "COMPLETE_HEARING"
  | "SUBMIT_TO_COLLECTOR"
  | "APPROVE_RR_SCHEME"
  | "PASS_RR_AWARD";

export const RR_STAGES: RRStage[] = [
  "SURVEYED",
  "SCHEME_DRAFTED",
  "PUBLISHED",
  "SUBMITTED_TO_COLLECTOR",
  "COMMITTEE_APPROVED",
  "RR_AWARDED",
];

interface RRTransitionRule {
  next: RRStage;
  allowedRoles: Role[];
}

const RR_TRANSITIONS: Record<string, RRTransitionRule> = {
  "null:COMPLETE_SURVEY": { next: "SURVEYED", allowedRoles: ["district"] },
  "SURVEYED:COMPLETE_SCHEME": { next: "SCHEME_DRAFTED", allowedRoles: ["district"] },
  "SCHEME_DRAFTED:COMPLETE_HEARING": { next: "PUBLISHED", allowedRoles: ["district"] },
  "PUBLISHED:SUBMIT_TO_COLLECTOR": {
    next: "SUBMITTED_TO_COLLECTOR",
    allowedRoles: ["district"],
  },
  "SUBMITTED_TO_COLLECTOR:APPROVE_RR_SCHEME": {
    next: "COMMITTEE_APPROVED",
    allowedRoles: ["state"],
  },
  "COMMITTEE_APPROVED:PASS_RR_AWARD": { next: "RR_AWARDED", allowedRoles: ["district"] },
};

export function transitionRR(
  current: RRStage | null,
  action: RRAction,
  actorRole: Role
): RRStage {
  const key = `${current ?? "null"}:${action}`;
  const rule = RR_TRANSITIONS[key];
  if (!rule) {
    throw new Error(
      `No R&R transition for action "${action}" from stage "${current ?? "null"}"`
    );
  }
  if (!rule.allowedRoles.includes(actorRole)) {
    throw new Error(
      `Role "${actorRole}" cannot perform "${action}" in the R&R workflow from stage "${current ?? "null"}"`
    );
  }
  return rule.next;
}

export function getAvailableRRActions(stage: RRStage | null, role: Role): RRAction[] {
  const prefix = `${stage ?? "null"}:`;
  return Object.entries(RR_TRANSITIONS)
    .filter(([key, rule]) => key.startsWith(prefix) && rule.allowedRoles.includes(role))
    .map(([key]) => key.slice(prefix.length) as RRAction);
}
