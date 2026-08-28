export type Role = "district" | "state" | "central" | "agency" | "field";

export type Stage =
  | "DRAFT"
  | "SCRUTINY"
  | "SIA"
  | "NOTIFIED"
  | "STATE_APPROVED"
  | "CENTRAL_APPROVED"
  | "DECLARED"
  | "AWARDED"
  | "RR_IN_PROGRESS"
  | "POSSESSION"
  | "RR_COMPLETE";

export type Action =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "COMPLETE"
  | "STATE_APPROVE"
  | "STATE_REJECT"
  | "CENTRAL_APPROVE"
  | "CENTRAL_REJECT"
  | "PUBLISH_DECLARATION"
  | "PASS_AWARD"
  | "START_RR"
  | "COMPLETE_RR"
  | "COMPLETE_INFRASTRUCTURE";

export const STAGES: Stage[] = [
  "DRAFT",
  "SCRUTINY",
  "SIA",
  "NOTIFIED",
  "STATE_APPROVED",
  "CENTRAL_APPROVED",
  "DECLARED",
  "AWARDED",
  "RR_IN_PROGRESS",
  "POSSESSION",
  "RR_COMPLETE",
];

interface TransitionRule {
  next: Stage;
  allowedRoles: Role[];
}

const TRANSITIONS: Record<string, TransitionRule> = {
  "DRAFT:SUBMIT": { next: "SCRUTINY", allowedRoles: ["agency", "district"] },
  "SCRUTINY:APPROVE": { next: "SIA", allowedRoles: ["district"] },
  "SCRUTINY:REJECT": { next: "DRAFT", allowedRoles: ["district"] },
  "SIA:COMPLETE": { next: "NOTIFIED", allowedRoles: ["district"] },
  "SIA:REJECT": { next: "DRAFT", allowedRoles: ["district"] },
  "NOTIFIED:STATE_APPROVE": { next: "STATE_APPROVED", allowedRoles: ["state"] },
  "NOTIFIED:STATE_REJECT": { next: "SCRUTINY", allowedRoles: ["state"] },
  "STATE_APPROVED:CENTRAL_APPROVE": {
    next: "CENTRAL_APPROVED",
    allowedRoles: ["central"],
  },
  "STATE_APPROVED:CENTRAL_REJECT": { next: "SCRUTINY", allowedRoles: ["central"] },
  "CENTRAL_APPROVED:PUBLISH_DECLARATION": {
    next: "DECLARED",
    allowedRoles: ["district"],
  },
  "DECLARED:PASS_AWARD": { next: "AWARDED", allowedRoles: ["district"] },
  "AWARDED:START_RR": { next: "RR_IN_PROGRESS", allowedRoles: ["district"] },
  "RR_IN_PROGRESS:COMPLETE_RR": { next: "POSSESSION", allowedRoles: ["district"] },
  "POSSESSION:COMPLETE_INFRASTRUCTURE": {
    next: "RR_COMPLETE",
    allowedRoles: ["district"],
  },
};

export function transitionProject(
  current: Stage,
  action: Action,
  actorRole: Role
): Stage {
  const key = `${current}:${action}`;
  const rule = TRANSITIONS[key];
  if (!rule) {
    throw new Error(`No transition for action "${action}" from stage "${current}"`);
  }
  if (!rule.allowedRoles.includes(actorRole)) {
    throw new Error(
      `Role "${actorRole}" cannot perform "${action}" from stage "${current}"`
    );
  }
  return rule.next;
}

export function getAvailableActions(stage: Stage, role: Role): Action[] {
  const prefix = `${stage}:`;
  return Object.entries(TRANSITIONS)
    .filter(([key, rule]) => key.startsWith(prefix) && rule.allowedRoles.includes(role))
    .map(([key]) => key.slice(prefix.length) as Action);
}
