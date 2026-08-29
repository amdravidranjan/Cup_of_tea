import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith, getStageHistoryWith } from "./projects";
import { listCompensationsForProjectWith } from "./compensation";
import { getRRHistoryWith } from "./rr";
import { listParcelsWith } from "./parcels";
import { listInfrastructureChecklistWith } from "./infrastructure";
import { computeSLAMetrics, type SLAMetric } from "@/lib/sla";
import { STAGES, type Stage } from "@/lib/workflow";

type Db = LibSQLDatabase<typeof schema>;
type ProjectRow = typeof schema.projects.$inferSelect;

export interface ProjectSLASummary {
  project: ProjectRow;
  metrics: SLAMetric[];
}

export interface PortfolioStats {
  projectCount: number;
  stageCounts: Record<Stage, number>;
  totalAreaHectares: number;
  compensationPaid: number;
  compensationTotal: number;
  slaCounts: { onTrack: number; atRisk: number; breached: number };
}

export interface StateBreakdownRow extends PortfolioStats {
  state: string;
}

async function summarizeProject(database: Db, project: ProjectRow): Promise<ProjectSLASummary> {
  const [stageHistory, compensations, rrHistory, infrastructureItems] = await Promise.all([
    getStageHistoryWith(database, project.id),
    listCompensationsForProjectWith(database, project.id),
    getRRHistoryWith(database, project.id),
    listInfrastructureChecklistWith(database, project.id),
  ]);
  const metrics = computeSLAMetrics({ stageHistory, compensations, rrHistory, infrastructureItems });
  return { project, metrics };
}

function scopeProjects(projects: ProjectRow[], filter?: { state?: string }): ProjectRow[] {
  return filter?.state ? projects.filter((p) => p.state === filter.state) : projects;
}

export async function getProjectsWithSLAWith(
  database: Db,
  filter?: { state?: string }
): Promise<ProjectSLASummary[]> {
  const projects = scopeProjects(await listProjectsWith(database), filter);
  return Promise.all(projects.map((p) => summarizeProject(database, p)));
}

function emptyStats(): PortfolioStats {
  const stageCounts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  return {
    projectCount: 0,
    stageCounts,
    totalAreaHectares: 0,
    compensationPaid: 0,
    compensationTotal: 0,
    slaCounts: { onTrack: 0, atRisk: 0, breached: 0 },
  };
}

export async function aggregatePortfolioStatsWith(database: Db, projects: ProjectRow[]): Promise<PortfolioStats> {
  const stats = emptyStats();
  stats.projectCount = projects.length;
  for (const project of projects) {
    stats.stageCounts[project.stage as Stage] += 1;
    const [parcels, compensations, rrHistory, stageHistory, infrastructureItems] =
      await Promise.all([
        listParcelsWith(database, project.id),
        listCompensationsForProjectWith(database, project.id),
        getRRHistoryWith(database, project.id),
        getStageHistoryWith(database, project.id),
        listInfrastructureChecklistWith(database, project.id),
      ]);
    stats.totalAreaHectares += parcels.reduce((sum, p) => sum + p.areaHectares, 0);
    for (const c of compensations) {
      stats.compensationTotal += c.total;
      if (c.status === "PAID") stats.compensationPaid += c.total;
    }
    const metrics = computeSLAMetrics({ stageHistory, compensations, rrHistory, infrastructureItems });
    for (const m of metrics) {
      if (m.status === "on-track") stats.slaCounts.onTrack += 1;
      else if (m.status === "at-risk") stats.slaCounts.atRisk += 1;
      else if (m.status === "breached") stats.slaCounts.breached += 1;
    }
  }
  return stats;
}

export async function getPortfolioStatsWith(
  database: Db,
  filter?: { state?: string }
): Promise<PortfolioStats> {
  const projects = scopeProjects(await listProjectsWith(database), filter);
  return aggregatePortfolioStatsWith(database, projects);
}

export async function getStateBreakdownWith(database: Db): Promise<StateBreakdownRow[]> {
  const projects = await listProjectsWith(database);
  const states = Array.from(new Set(projects.map((p) => p.state))).sort();
  const rows: StateBreakdownRow[] = [];
  for (const state of states) {
    const stats = await aggregatePortfolioStatsWith(
      database,
      projects.filter((p) => p.state === state)
    );
    rows.push({ state, ...stats });
  }
  return rows;
}

export const getProjectsWithSLA = (filter?: { state?: string }) =>
  getProjectsWithSLAWith(defaultDb, filter);
export const getPortfolioStats = (filter?: { state?: string }) =>
  getPortfolioStatsWith(defaultDb, filter);
export const getStateBreakdown = () => getStateBreakdownWith(defaultDb);
