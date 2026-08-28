export type StatusTone = "pending" | "success" | "danger" | "info";

const TONE_CLASSES: Record<StatusTone, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-green-200 bg-green-50 text-green-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export function toneBadgeClass(tone: StatusTone): string {
  return TONE_CLASSES[tone];
}

const STAGE_TONES: Record<string, StatusTone> = {
  DRAFT: "pending",
  SCRUTINY: "pending",
  SIA: "pending",
  NOTIFIED: "info",
  STATE_APPROVED: "info",
  CENTRAL_APPROVED: "info",
  DECLARED: "info",
  AWARDED: "success",
  RR_IN_PROGRESS: "info",
  POSSESSION: "success",
  RR_COMPLETE: "success",
};

export function stageTone(stage: string): StatusTone {
  return STAGE_TONES[stage] ?? "pending";
}

const COMPENSATION_TONES: Record<string, StatusTone> = {
  ASSESSED: "pending",
  PAID: "success",
};

export function compensationTone(status: string): StatusTone {
  return COMPENSATION_TONES[status] ?? "pending";
}
