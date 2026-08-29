export const PARCEL_STATUSES = ["NOTIFIED", "ACQUIRED", "POSSESSED"] as const;
export type ParcelStatus = (typeof PARCEL_STATUSES)[number];

export function nextParcelStatus(status: ParcelStatus): ParcelStatus | null {
  const index = PARCEL_STATUSES.indexOf(status);
  const next = PARCEL_STATUSES[index + 1];
  return next ?? null;
}
