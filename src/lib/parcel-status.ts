export const PARCEL_STATUSES = ["NOTIFIED", "ACQUIRED", "POSSESSED"] as const;
export type ParcelStatus = (typeof PARCEL_STATUSES)[number];
