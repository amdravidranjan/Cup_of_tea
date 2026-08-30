import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith, getStageHistoryWith } from "./projects";
import { listParcelsWith } from "./parcels";
import { listCompensationsForProjectWith } from "./compensation";
import { getRRHistoryWith } from "./rr";
import { listInfrastructureChecklistWith } from "./infrastructure";
import { computeSLAMetrics } from "@/lib/sla";

type Db = LibSQLDatabase<typeof schema>;

export interface ProjectReportRow {
  id: string;
  name: string;
  purpose: string;
  state: string;
  district: string;
  stage: string;
  totalAreaHectares: number;
  parcelCount: number;
  compensationPaid: number;
  compensationTotal: number;
  slaDeclaration: string;
  slaCompensation: string;
  slaRRAward: string;
  slaInfrastructure: string;
  createdAt: Date;
}

export async function getProjectReportRowsWith(
  database: Db,
  filter?: { state?: string }
): Promise<ProjectReportRow[]> {
  const allProjects = await listProjectsWith(database);
  const projects = filter?.state
    ? allProjects.filter((p) => p.state === filter.state)
    : allProjects;

  return Promise.all(
    projects.map(async (project) => {
      const [parcels, compensations, stageHistory, rrHistory, infrastructureItems] =
        await Promise.all([
          listParcelsWith(database, project.id),
          listCompensationsForProjectWith(database, project.id),
          getStageHistoryWith(database, project.id),
          getRRHistoryWith(database, project.id),
          listInfrastructureChecklistWith(database, project.id),
        ]);
      const metrics = computeSLAMetrics({
        stageHistory,
        compensations,
        rrHistory,
        infrastructureItems,
      });
      const metricById = (id: string) => metrics.find((m) => m.id === id)?.status ?? "not-applicable";

      return {
        id: project.id,
        name: project.name,
        purpose: project.purpose,
        state: project.state,
        district: project.district,
        stage: project.stage,
        totalAreaHectares: parcels.reduce((sum, p) => sum + p.areaHectares, 0),
        parcelCount: parcels.length,
        compensationPaid: compensations
          .filter((c) => c.status === "PAID")
          .reduce((sum, c) => sum + c.total, 0),
        compensationTotal: compensations.reduce((sum, c) => sum + c.total, 0),
        slaDeclaration: metricById("declaration"),
        slaCompensation: metricById("compensation"),
        slaRRAward: metricById("rr-award"),
        slaInfrastructure: metricById("infrastructure"),
        createdAt: project.createdAt,
      };
    })
  );
}

export const getProjectReportRows = (filter?: { state?: string }) =>
  getProjectReportRowsWith(defaultDb, filter);
