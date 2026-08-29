export const DOCUMENT_CATEGORIES = [
  "DPR",
  "DESIGN_DRAWING",
  "SITE_INVESTIGATION",
  "ROW_PLAN",
  "SIA_REPORT",
  "OTHER",
  "NOTIFICATION",
  "DECLARATION",
  "AWARD_LETTER",
  "POSSESSION_CERTIFICATE",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
