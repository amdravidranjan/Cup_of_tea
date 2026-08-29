export type SLAStatus = "on-track" | "at-risk" | "breached" | "not-applicable";

export interface SLAMetric {
  id: "declaration" | "compensation" | "rr-award" | "infrastructure";
  label: string;
  deadlineMonths: number;
  startedAt: Date | null;
  completedAt: Date | null;
  status: SLAStatus;
  daysRemaining: number | null;
}

interface StageHistoryLike {
  toStage: string;
  createdAt: Date;
}

interface CompensationLike {
  paidAt: Date | null;
}

interface InfrastructureItemLike {
  status: string;
  completedAt: Date | null;
}

export interface ComputeSLAInput {
  stageHistory: StageHistoryLike[];
  compensations: CompensationLike[];
  rrHistory: StageHistoryLike[];
  infrastructureItems?: InfrastructureItemLike[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AVG_DAYS_PER_MONTH = 30.44;
const AT_RISK_THRESHOLD = 0.2;

function addMonths(date: Date, months: number): Date {
  return new Date(date.getTime() + months * AVG_DAYS_PER_MONTH * MS_PER_DAY);
}

function findByToStage(history: StageHistoryLike[], toStage: string): Date | null {
  const entry = history.find((h) => h.toStage === toStage);
  return entry ? entry.createdAt : null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function buildMetric(
  id: SLAMetric["id"],
  label: string,
  deadlineMonths: number,
  startedAt: Date | null,
  completedAt: Date | null,
  asOf: Date
): SLAMetric {
  if (!startedAt) {
    return {
      id,
      label,
      deadlineMonths,
      startedAt: null,
      completedAt: null,
      status: "not-applicable",
      daysRemaining: null,
    };
  }

  const deadline = addMonths(startedAt, deadlineMonths);

  if (completedAt) {
    const daysRemaining = daysBetween(completedAt, deadline);
    const status: SLAStatus = daysRemaining < 0 ? "breached" : "on-track";
    return { id, label, deadlineMonths, startedAt, completedAt, status, daysRemaining };
  }

  const daysRemaining = daysBetween(asOf, deadline);
  if (daysRemaining < 0) {
    return { id, label, deadlineMonths, startedAt, completedAt: null, status: "breached", daysRemaining };
  }
  const totalWindowDays = deadlineMonths * AVG_DAYS_PER_MONTH;
  const status: SLAStatus =
    daysRemaining / totalWindowDays < AT_RISK_THRESHOLD ? "at-risk" : "on-track";
  return { id, label, deadlineMonths, startedAt, completedAt: null, status, daysRemaining };
}

export function computeSLAMetrics(
  input: ComputeSLAInput,
  asOf: Date = new Date()
): SLAMetric[] {
  const notifiedAt = findByToStage(input.stageHistory, "NOTIFIED");
  const declaredAt = findByToStage(input.stageHistory, "DECLARED");
  const awardedAt = findByToStage(input.stageHistory, "AWARDED");

  const paidDates = input.compensations.map((c) => c.paidAt);
  const allPaid = input.compensations.length > 0 && paidDates.every((d) => d !== null);
  const compensationCompletedAt = allPaid
    ? new Date(Math.max(...(paidDates as Date[]).map((d) => d.getTime())))
    : null;

  const rrAwardedAt = findByToStage(input.rrHistory, "RR_AWARDED");

  const infrastructureItems = input.infrastructureItems ?? [];
  const infrastructureCompletedDates = infrastructureItems
    .filter((i) => i.status === "COMPLETE")
    .map((i) => i.completedAt)
    .filter((d): d is Date => d !== null);
  const allInfrastructureComplete =
    infrastructureItems.length > 0 &&
    infrastructureItems.every((i) => i.status === "COMPLETE");
  const infrastructureCompletedAt =
    allInfrastructureComplete && infrastructureCompletedDates.length > 0
      ? new Date(Math.max(...infrastructureCompletedDates.map((d) => d.getTime())))
      : null;

  return [
    buildMetric(
      "declaration",
      "Section 11 → Section 19 Declaration",
      12,
      notifiedAt,
      declaredAt,
      asOf
    ),
    buildMetric("compensation", "Compensation Disbursement", 3, awardedAt, compensationCompletedAt, asOf),
    buildMetric("rr-award", "R&R Award", 6, awardedAt, rrAwardedAt, asOf),
    buildMetric(
      "infrastructure",
      "Infrastructural R&R Entitlements (Third Schedule)",
      18,
      awardedAt,
      infrastructureCompletedAt,
      asOf
    ),
  ];
}
