import { getProjectsWithSLA } from "./dashboard";
import { listGrievances } from "./grievances";

export interface DistrictWorkload {
  district: string;
  state: string;
  activeProjects: number;
  openGrievances: number;
  slaBreaches: number;
  slaAtRisk: number;
  breachRate: number; // breaches / total tracked SLA metrics, 0-1
}

/**
 * Active-case load per district — the unit of comparison here, since the
 * demo data models one login per role rather than one login per named
 * officer (Koraput has a district-role user; Sivaganga, Chennai, etc. do
 * not). Grouping by district still answers the real question — "where
 * does staff attention need to go" — without pretending a per-officer
 * directory exists that this system doesn't actually have.
 */
export async function computeDistrictWorkload(): Promise<DistrictWorkload[]> {
  const [summaries, grievances] = await Promise.all([getProjectsWithSLA(), listGrievances()]);

  const byDistrict = new Map<string, DistrictWorkload>();
  for (const { project, metrics } of summaries) {
    const key = `${project.district}::${project.state}`;
    const entry = byDistrict.get(key) ?? {
      district: project.district,
      state: project.state,
      activeProjects: 0,
      openGrievances: 0,
      slaBreaches: 0,
      slaAtRisk: 0,
      breachRate: 0,
    };
    entry.activeProjects += 1;
    for (const m of metrics) {
      if (m.status === "breached") entry.slaBreaches += 1;
      if (m.status === "at-risk") entry.slaAtRisk += 1;
    }
    byDistrict.set(key, entry);
  }

  for (const g of grievances) {
    if (g.status === "RESOLVED") continue;
    const key = `${g.district}::${g.state}`;
    const entry = byDistrict.get(key);
    if (entry) entry.openGrievances += 1;
  }

  for (const entry of byDistrict.values()) {
    const tracked = entry.slaBreaches + entry.slaAtRisk;
    entry.breachRate = tracked > 0 ? entry.slaBreaches / Math.max(1, entry.slaBreaches + entry.slaAtRisk) : 0;
  }

  return Array.from(byDistrict.values()).sort((a, b) => b.slaBreaches - a.slaBreaches || b.openGrievances - a.openGrievances);
}
