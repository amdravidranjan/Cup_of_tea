// Real Indian revenue-village cadastral notation: a survey number is
// often subdivided ("142/3B") when the original plot was split across
// multiple holdings over time — so numbers group in small clusters
// sharing a base, not one clean sequence per parcel. Patta numbers
// (the ownership record of rights) reset per district.

export function surveyNumberFor(indexWithinVillage: number): string {
  const base = 100 + Math.floor(indexWithinVillage / 3);
  const sub = (indexWithinVillage % 3) + 1;
  return `${base}/${sub}`;
}

export function pattaNumberFor(district: string, globalIndex: number): string {
  const code = district.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "GEN";
  return `${code}-PTA-${String(globalIndex + 1).padStart(5, "0")}`;
}
