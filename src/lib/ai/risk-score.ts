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

function bandFor(score: number): RiskBand {
  if (score >= 70) return "Critical";
  if (score >= 45) return "High";
  if (score >= 20) return "Moderate";
  return "Low";
}

export function assessProjectRisk(input: RiskAssessmentInput): RiskAssessment {
  const factors: RiskFactor[] = [];

  if (input.totalGrievances > 0) {
    const openShare = input.openGrievances / input.totalGrievances;
    const points = Math.round(openShare * 20);
    factors.push({
      label: "Open grievances",
      detail: `${input.openGrievances} of ${input.totalGrievances} filed grievances still open`,
      points,
    });
  }

  if (input.slaBreached > 0) {
    const points = Math.min(25, input.slaBreached * 12);
    factors.push({
      label: "SLA breaches",
      detail: `${input.slaBreached} statutory-timeline metric(s) already breached`,
      points,
    });
  }
  if (input.slaAtRisk > 0) {
    const points = Math.min(15, input.slaAtRisk * 6);
    factors.push({
      label: "SLA at risk",
      detail: `${input.slaAtRisk} metric(s) approaching their deadline`,
      points,
    });
  }

  if (input.totalFamilies > 0) {
    const vulnShare = input.vulnerableFamilies / input.totalFamilies;
    const points = Math.round(vulnShare * 15);
    factors.push({
      label: "Vulnerable-household share",
      detail: `${input.vulnerableFamilies} of ${input.totalFamilies} registered families flagged vulnerable`,
      points,
    });
  }

  if (input.totalParcels > 0) {
    const unsecuredShare = 1 - input.parcelsPossessed / input.totalParcels;
    const points = Math.round(unsecuredShare * 20);
    factors.push({
      label: "Land not yet possessed",
      detail: `${input.totalParcels - input.parcelsPossessed} of ${input.totalParcels} parcels not yet in POSSESSED status`,
      points,
    });
  }

  if (input.openLegalDisputes > 0) {
    const points = Math.min(30, input.openLegalDisputes * 15);
    factors.push({
      label: "Active litigation",
      detail: `${input.openLegalDisputes} legal dispute(s) not yet disposed`,
      points,
    });
  }

  if (factors.length === 0) {
    factors.push({
      label: "No adverse signals",
      detail: "No grievances, SLA breaches, or litigation recorded yet for this project",
      points: 5,
    });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const band = bandFor(score);

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
