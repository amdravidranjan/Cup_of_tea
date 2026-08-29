export type EntitlementType =
  | "HOUSING_OR_LAND"
  | "SUBSISTENCE_GRANT"
  | "TRANSPORT_ALLOWANCE"
  | "ARTISAN_TRADER_GRANT"
  | "RESETTLEMENT_ALLOWANCE"
  | "STAMP_DUTY_WAIVER";

export const ENTITLEMENT_TYPES: EntitlementType[] = [
  "HOUSING_OR_LAND",
  "SUBSISTENCE_GRANT",
  "TRANSPORT_ALLOWANCE",
  "ARTISAN_TRADER_GRANT",
  "RESETTLEMENT_ALLOWANCE",
  "STAMP_DUTY_WAIVER",
];

export const ENTITLEMENT_LABELS: Record<EntitlementType, string> = {
  HOUSING_OR_LAND: "Housing unit or land-for-land (lump sum or annuity/employment)",
  SUBSISTENCE_GRANT: "Subsistence grant (1 year)",
  TRANSPORT_ALLOWANCE: "Transport allowance",
  ARTISAN_TRADER_GRANT: "One-time grant (artisan/trader/cattle-shed/petty-shop loss)",
  RESETTLEMENT_ALLOWANCE: "Resettlement allowance",
  STAMP_DUTY_WAIVER: "Stamp duty/registration fee waiver on replacement land",
};

export type FamilyCategory = "landowner" | "livelihood-loser" | "tenant";

export const FAMILY_CATEGORIES: FamilyCategory[] = ["landowner", "livelihood-loser", "tenant"];

export const FAMILY_CATEGORY_LABELS: Record<FamilyCategory, string> = {
  landowner: "Landowner",
  "livelihood-loser": "Livelihood loser",
  tenant: "Tenant",
};
