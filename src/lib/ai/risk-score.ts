/**
 * Project risk scoring. This is a transparent, deterministic weighted
 * formula over real project signals (open grievances, SLA health, land
 * secured, vulnerable-family share, active litigation) — not a trained
 * model. It's presented as "AI Risk Assessment" in the UI because that's
 * the framing the product wants, but the scoring logic here is plain
 * arithmetic, reproducible, and auditable — every contributing factor is
 * shown alongside the score, not hidden behind a black box.
 */

export type RiskBand = "Low" | "Moderate" | "High" | "Critical";

export interface RiskFactor {
  label: string;
  detail: string;
  points: number; // contribution to the 0-100 score, can be negative
}

export interface RiskAssessment {
  score: number; // 0-100, higher = riskier
  band: RiskBand;
  factors: RiskFactor[];
  summary: string;
}

export interface RiskAssessmentInput {
  openGrievances: number;
  totalGrievances: number;
  slaBreached: number;
  slaAtRisk: number;
  slaOnTrack: number;
  vulnerableFamilies: number;
  totalFamilies: number;
  parcelsPossessed: number;
  totalParcels: number;
  openLegalDisputes: number;
  stage: string;
}

function bandFor(score: number, openLegalDisputes: number): RiskBand {
  if (score >= 80 || (openLegalDisputes >= 5 && score >= 50)) return "Critical";
  if (score >= 45) return "High";
  if (score >= 10) return "Moderate";
  return "Low";
}

export function assessProjectRisk(input: RiskAssessmentInput): RiskAssessment {
  const factors: RiskFactor[] = [];
  const value = (number: number) =>
    Number.isFinite(number) ? Math.max(0, number) : 0;
  const openGrievances = value(input.openGrievances);
  const totalGrievances = value(input.totalGrievances);
  const slaBreached = value(input.slaBreached);
  const slaAtRisk = value(input.slaAtRisk);
  const vulnerableFamilies = value(input.vulnerableFamilies);
  const totalFamilies = value(input.totalFamilies);
  const parcelsPossessed = value(input.parcelsPossessed);
  const totalParcels = value(input.totalParcels);
  const openLegalDisputes = value(input.openLegalDisputes);
  const hadNegativeInput = [
    input.openGrievances,
    input.totalGrievances,
    input.slaBreached,
    input.slaAtRisk,
    input.vulnerableFamilies,
    input.totalFamilies,
    input.parcelsPossessed,
    input.totalParcels,
    input.openLegalDisputes,
  ].some((number) => Number.isFinite(number) && number < 0);

  if (totalGrievances > 0) {
    const openShare = Math.min(openGrievances, totalGrievances) / totalGrievances;
    const points = Math.round(openShare * 20);
    if (points > 0) {
      factors.push({
        label: "Open grievances",
        detail: `${Math.min(openGrievances, totalGrievances)} of ${totalGrievances} filed grievances still open`,
        points,
      });
    }
  }

  if (slaBreached > 0) {
    const points = Math.min(25, slaBreached * 12);
    factors.push({
      label: "SLA breaches",
      detail: `${slaBreached} statutory-timeline metric(s) already breached`,
      points,
    });
  }
  if (slaAtRisk > 0) {
    const points = Math.min(15, slaAtRisk * 6);
    factors.push({
      label: "SLA at risk",
      detail: `${slaAtRisk} metric(s) approaching their deadline`,
      points,
    });
  }

  if (totalFamilies > 0) {
    const vulnShare = Math.min(vulnerableFamilies, totalFamilies) / totalFamilies;
    const points = Math.round(vulnShare * 15);
    if (points > 0) {
      factors.push({
        label: "Vulnerable-household share",
        detail: `${Math.min(vulnerableFamilies, totalFamilies)} of ${totalFamilies} registered families flagged vulnerable`,
        points,
      });
    }
  }

  if (totalParcels > 0) {
    const possessed = Math.min(parcelsPossessed, totalParcels);
    const unsecuredShare = 1 - possessed / totalParcels;
    const points = Math.round(unsecuredShare * 20);
    if (points > 0) {
      factors.push({
        label: "Land not yet possessed",
        detail: `${totalParcels - possessed} of ${totalParcels} parcels not yet in POSSESSED status`,
        points,
      });
    }
  }

  if (openLegalDisputes > 0) {
    const points = Math.min(30, openLegalDisputes * 15);
    factors.push({
      label: "Active litigation",
      detail: `${openLegalDisputes} legal dispute(s) not yet disposed`,
      points,
    });
  }

  if (factors.length === 0) {
    factors.push({
      label: "No adverse signals",
      detail: "No grievances, SLA breaches, or litigation recorded yet for this project",
      points: hadNegativeInput ? 5 : 0,
    });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const band = bandFor(score, openLegalDisputes);

  const summary =
    band === "Critical"
      ? "Multiple compounding risk signals — recommend priority review."
      : band === "High"
        ? "Several risk signals present — worth a closer look this cycle."
        : band === "Moderate"
          ? "Some risk signals present but within a manageable range."
          : "Few or no adverse signals detected at this time.";

  return { score, band, factors: factors.sort((a, b) => b.points - a.points), summary };
}
