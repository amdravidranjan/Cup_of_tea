import type { Role } from "./workflow";

export type GrievanceType = "COMPENSATION_DISPUTE" | "GENERAL_GRIEVANCE";
export type GrievanceStatus = "FILED" | "UNDER_REVIEW" | "RESOLVED";
export type GrievanceAction = "START_REVIEW" | "RESOLVE";
export type GrievanceResolution = "UPHELD" | "REVISED" | "REJECTED";

export const GRIEVANCE_STATUSES: GrievanceStatus[] = ["FILED", "UNDER_REVIEW", "RESOLVED"];

interface TransitionRule {
  next: GrievanceStatus;
  allowedRoles: Role[];
}

const TRANSITIONS: Record<string, TransitionRule> = {
  "FILED:START_REVIEW": { next: "UNDER_REVIEW", allowedRoles: ["district", "state"] },
  "UNDER_REVIEW:RESOLVE": { next: "RESOLVED", allowedRoles: ["district", "state"] },
};

export function transitionGrievance(
  current: GrievanceStatus,
  action: GrievanceAction,
  actorRole: Role
): GrievanceStatus {
  const key = `${current}:${action}`;
  const rule = TRANSITIONS[key];
  if (!rule) {
    throw new Error(`No grievance transition for action "${action}" from status "${current}"`);
  }
  if (!rule.allowedRoles.includes(actorRole)) {
    throw new Error(`Role "${actorRole}" cannot perform "${action}" on a grievance at "${current}"`);
  }
  return rule.next;
}

export function getAvailableGrievanceActions(
  current: GrievanceStatus,
  role: Role
): GrievanceAction[] {
  const prefix = `${current}:`;
  return Object.entries(TRANSITIONS)
    .filter(([key, rule]) => key.startsWith(prefix) && rule.allowedRoles.includes(role))
    .map(([key]) => key.slice(prefix.length) as GrievanceAction);
}

const TRACKING_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

export function generateTrackingNumber(): string {
  const year = new Date().getFullYear();
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += TRACKING_CHARS[Math.floor(Math.random() * TRACKING_CHARS.length)];
  }
  return `GRV-${year}-${code}`;
}
