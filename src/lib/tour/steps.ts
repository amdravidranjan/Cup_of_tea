/**
 * The walkthrough, as a list of steps the guide can perform on the judge's
 * behalf.
 *
 * Every step names the thing on screen it is talking about (`target`, matched
 * against `data-tour`), the page that thing lives on (`route`), and what
 * pressing Next actually does (`action`). The judge can always do it
 * themselves instead — the spotlight is a live element, not a picture.
 *
 * The whole run happens inside the visitor's own sandbox project, sited in
 * their language's region, so nothing here touches another judge's data.
 */

import type { KitKind } from "@/lib/demo/kit";

export type TourAction =
  | { kind: "none" }
  /** Click the step's target (or another element, if given). */
  | { kind: "click"; target?: string }
  | { kind: "goto"; to: string }
  /** Sign in as one of the sandbox's own officers. */
  | { kind: "login"; as: "district" | "state" | "central" }
  /** Hand the bulk-intake panel a kit file and let it preview. */
  | { kind: "intake"; category: string; kit: KitKind }
  /** Run the SIA census: the families no land record can find. */
  | { kind: "census" }
  /** Fill and submit the stay-order form. */
  | { kind: "stayForm" };

export interface TourStep {
  id: string;
  /** `data-tour` value of the element to spotlight. */
  target?: string;
  /** Page this step belongs on. `{project}` is the sandbox project id. */
  route?: string;
  action: TourAction;
  /** Window event that means the action finished. */
  awaitEvent?: string;
  /** Extra settle time after the action, in milliseconds. */
  settle?: number;
  /** Offer this kit file as a download button inside the bubble. */
  download?: KitKind;
  /** Advance on its own when the judge clicks the target themselves. */
  selfClick?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome", route: "/", action: { kind: "none" } },
  { id: "lang", route: "/", target: "lang-switch", action: { kind: "none" } },
  { id: "services", route: "/", target: "citizen-services", action: { kind: "none" } },
  { id: "chatbot", route: "/", target: "chatbot-launch", action: { kind: "click" }, selfClick: true, settle: 600 },

  { id: "login", route: "/login", target: "login-demo", action: { kind: "login", as: "district" }, settle: 900 },
  { id: "dashboard", route: "/app", target: "sla-alerts", action: { kind: "none" } },
  {
    id: "project",
    route: "/app",
    target: "demo-project",
    action: { kind: "goto", to: "/app/projects/{project}" },
    selfClick: true,
    settle: 900,
  },

  // ── Intake: the part that replaces weeks of manual entry ──────────────
  {
    id: "docs",
    route: "/app/projects/{project}",
    target: "tab-documents",
    action: { kind: "click" },
    selfClick: true,
    settle: 500,
  },
  { id: "dl-fmb", route: "/app/projects/{project}", target: "tour-download", action: { kind: "none" }, download: "fmb" },
  {
    id: "up-fmb",
    route: "/app/projects/{project}",
    target: "intake-drop",
    action: { kind: "intake", category: "FMB_SKETCH", kit: "fmb" },
    awaitEvent: "nilams-tour:previewed",
  },
  {
    id: "commit-fmb",
    route: "/app/projects/{project}",
    target: "intake-commit",
    action: { kind: "click" },
    awaitEvent: "nilams-tour:committed",
    selfClick: true,
    settle: 900,
  },
  { id: "dl-patta", route: "/app/projects/{project}", target: "tour-download", action: { kind: "none" }, download: "patta" },
  {
    id: "up-patta",
    route: "/app/projects/{project}",
    target: "intake-drop",
    action: { kind: "intake", category: "PATTA_CHITTA", kit: "patta" },
    awaitEvent: "nilams-tour:previewed",
  },
  {
    id: "commit-patta",
    route: "/app/projects/{project}",
    target: "intake-commit",
    action: { kind: "click" },
    awaitEvent: "nilams-tour:committed",
    selfClick: true,
    settle: 900,
  },

  // ── What the records became ───────────────────────────────────────────
  {
    id: "map",
    route: "/app/projects/{project}",
    target: "tab-overview",
    action: { kind: "click" },
    selfClick: true,
    settle: 700,
  },
  {
    id: "open3d",
    route: "/app/projects/{project}",
    target: "open-3d",
    action: { kind: "click" },
    selfClick: true,
    settle: 2500,
  },
  { id: "fly3d", route: "/app/projects/{project}/3d", target: "fly-3d", action: { kind: "click" }, selfClick: true, settle: 800 },

  // ── The law, enforced by the software ─────────────────────────────────
  {
    id: "legal",
    route: "/app/projects/{project}",
    target: "tab-legal",
    action: { kind: "click" },
    selfClick: true,
    settle: 600,
  },
  {
    id: "stay",
    route: "/app/projects/{project}",
    target: "add-dispute",
    // The action waits for the stay banner itself, so there is nothing left
    // to wait for here — an `awaitEvent` would only race its own dispatch.
    action: { kind: "stayForm" },
    settle: 1200,
  },
  { id: "stay-banner", route: "/app/projects/{project}", target: "stay-banner", action: { kind: "none" } },
  {
    id: "blocked",
    route: "/app/projects/{project}",
    target: "tab-compensation",
    action: { kind: "click" },
    selfClick: true,
    settle: 800,
  },

  // ── Families, not just plots ──────────────────────────────────────────
  {
    id: "census",
    route: "/app/projects/{project}",
    target: "tab-rr",
    action: { kind: "census" },
    settle: 1200,
  },
  { id: "families", route: "/app/projects/{project}", target: "family-card", action: { kind: "none" } },

  // ── The ledger nobody can edit ────────────────────────────────────────
  { id: "audit-login", route: "/app", target: "role-switch", action: { kind: "login", as: "central" }, settle: 900 },
  {
    id: "audit",
    route: "/app/audit",
    target: "audit-verify",
    action: { kind: "click" },
    selfClick: true,
    settle: 1200,
  },

  { id: "finish", action: { kind: "none" } },
];

export const TOTAL_STEPS = TOUR_STEPS.length;

/**
 * Resolve `{project}` in a step's route.
 *
 * Null when the step needs a sandbox and there isn't one yet — the caller must
 * not navigate rather than send the judge to a URL with a placeholder in it.
 */
export function stepRoute(step: TourStep, projectId: string | null): string | null {
  if (!step.route) return null;
  if (!step.route.includes("{project}")) return step.route;
  return projectId ? step.route.replace("{project}", projectId) : null;
}
