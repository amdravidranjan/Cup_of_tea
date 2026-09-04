import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith, getStageHistoryWith } from "./projects";
import { listParcelsWith, type Parcel } from "./parcels";
import { listCompensationsForProjectWith } from "./compensation";
import { getRRHistoryWith } from "./rr";
import { listInfrastructureChecklistWith } from "./infrastructure";
import { computeSLAMetrics, type SLAMetric } from "@/lib/sla";
import { STAGES, type Stage } from "@/lib/workflow";
import { parseStoredGeometry, computeParcelsWithImpact, type Geometry } from "@/lib/geo";
import { aggregatePortfolioStatsWith, type PortfolioStats } from "./dashboard";

type Db = LibSQLDatabase<typeof schema>;
type ProjectRow = typeof schema.projects.$inferSelect;

export interface PublicProjectSummary {
  id: string;
  name: string;
  purpose: string;
  state: string;
  district: string;
  stage: Stage;
  metrics: SLAMetric[];
  coverPhotoUrl: string | null;
}

export interface PublicNotice {
  id: string;
  projectId: string;
  projectName: string;
  state: string;
  district: string;
  stage: Stage;
  label: string;
  occurredAt: Date;
}

export interface PublicProjectDetail {
  project: PublicProjectSummary;
  totalAreaHectares: number;
  villageCount: number;
  parcelCount: number;
  compensationPaid: number;
  compensationTotal: number;
  alignment: Geometry | null;
  parcels: (Parcel & { withinImpact: boolean })[];
  notices: PublicNotice[];
}

const NOTICE_LABELS: Partial<Record<Stage, string>> = {
  NOTIFIED: "Section 11 Preliminary Notification issued",
  DECLARED: "Section 19 Final Declaration published",
  AWARDED: "Compensation award passed",
  RR_IN_PROGRESS: "R&R Scheme process started",
  POSSESSION: "Possession taken",
  RR_COMPLETE: "R&R entitlements and infrastructure completed",
};

export function isPublicStage(stage: Stage): boolean {
  return STAGES.indexOf(stage) >= STAGES.indexOf("NOTIFIED");
}

async function toSummary(database: Db, project: ProjectRow): Promise<PublicProjectSummary> {
  const [stageHistory, compensations, rrHistory, infrastructureItems] = await Promise.all([
    getStageHistoryWith(database, project.id),
    listCompensationsForProjectWith(database, project.id),
    getRRHistoryWith(database, project.id),
    listInfrastructureChecklistWith(database, project.id),
  ]);
  const metrics = computeSLAMetrics({ stageHistory, compensations, rrHistory, infrastructureItems });
  return {
    id: project.id,
    name: project.name,
    purpose: project.purpose,
    state: project.state,
    district: project.district,
    stage: project.stage as Stage,
    metrics,
    coverPhotoUrl: project.coverPhotoUrl,
  };
}

export async function listPublicProjectsWith(database: Db): Promise<PublicProjectSummary[]> {
  const projects = (await listProjectsWith(database)).filter((p) =>
    isPublicStage(p.stage as Stage)
  );
  return Promise.all(projects.map((p) => toSummary(database, p)));
}

function noticesFor(
  project: ProjectRow,
  stageHistory: { id: string; toStage: string; createdAt: Date }[]
): PublicNotice[] {
  return stageHistory
    .filter((h) => isPublicStage(h.toStage as Stage) && NOTICE_LABELS[h.toStage as Stage])
    .map((h) => ({
      id: h.id,
      projectId: project.id,
      projectName: project.name,
      state: project.state,
      district: project.district,
      stage: h.toStage as Stage,
      label: NOTICE_LABELS[h.toStage as Stage]!,
      occurredAt: h.createdAt,
    }));
}

export async function getPublicProjectDetailWith(
  database: Db,
  id: string
): Promise<PublicProjectDetail | null> {
  const projects = await listProjectsWith(database);
  const project = projects.find((p) => p.id === id);
  if (!project || !isPublicStage(project.stage as Stage)) return null;

  const [stageHistory, parcelList, compensations] = await Promise.all([
    getStageHistoryWith(database, id),
    listParcelsWith(database, id),
    listCompensationsForProjectWith(database, id),
  ]);

  const alignment = parseStoredGeometry(project.geometryType, project.geometryGeoJson);
  const parcelsWithImpact = computeParcelsWithImpact(alignment, parcelList);
  const villageCount = new Set(parcelList.map((p) => p.village)).size;
  const compensationTotal = compensations.reduce((sum, c) => sum + c.total, 0);
  const compensationPaid = compensations
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.total, 0);

  return {
    project: await toSummary(database, project),
    totalAreaHectares: parcelList.reduce((sum, p) => sum + p.areaHectares, 0),
    villageCount,
    parcelCount: parcelList.length,
    compensationPaid,
    compensationTotal,
    alignment,
    parcels: parcelsWithImpact,
    notices: noticesFor(project, stageHistory),
  };
}

export async function getPublicPortfolioStatsWith(database: Db): Promise<PortfolioStats> {
  const projects = (await listProjectsWith(database)).filter((p) =>
    isPublicStage(p.stage as Stage)
  );
  return aggregatePortfolioStatsWith(database, projects);
}

export async function listPublicNoticesWith(
  database: Db,
  limit = 20
): Promise<PublicNotice[]> {
  const projects = (await listProjectsWith(database)).filter((p) =>
    isPublicStage(p.stage as Stage)
  );
  const perProject = await Promise.all(
    projects.map(async (project) => {
      const stageHistory = await getStageHistoryWith(database, project.id);
      return noticesFor(project, stageHistory);
    })
  );
  return perProject
    .flat()
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}

export const listPublicProjects = () => listPublicProjectsWith(defaultDb);
export const getPublicProjectDetail = (id: string) => getPublicProjectDetailWith(defaultDb, id);
export const getPublicPortfolioStats = () => getPublicPortfolioStatsWith(defaultDb);
export const listPublicNotices = (limit?: number) => listPublicNoticesWith(defaultDb, limit);
