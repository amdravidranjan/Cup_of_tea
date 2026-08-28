export const DOCUMENT_CATEGORIES = [
  "DPR",
  "DESIGN_DRAWING",
  "SITE_INVESTIGATION",
  "ROW_PLAN",
  "SIA_REPORT",
  "OTHER",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
