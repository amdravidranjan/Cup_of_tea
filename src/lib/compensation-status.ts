export const COMPENSATION_STATUSES = ["ASSESSED", "PAID"] as const;
export type CompensationStatus = (typeof COMPENSATION_STATUSES)[number];
