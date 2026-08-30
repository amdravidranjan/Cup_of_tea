import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import * as schema from "./schema";
import { listProjectsWith } from "./projects";
import { listParcelsWith } from "./parcels";
import { listFamiliesForProjectWith } from "./families";
import { scopeProjects, type ProjectScopeFilter } from "@/lib/project-scope";

type Db = LibSQLDatabase<typeof schema>;

export interface SearchResults {
  projects: { id: string; name: string; state: string; district: string; stage: string }[];
  parcels: { id: string; projectId: string; projectName: string; village: string }[];
  families: {
    id: string;
    projectId: string;
    projectName: string;
    headOfHouseholdName: string;
  }[];
}

function matches(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export async function searchWith(
  database: Db,
  query: string,
  scope?: ProjectScopeFilter
): Promise<SearchResults> {
  const q = query.trim();
  if (q.length === 0) {
    return { projects: [], parcels: [], families: [] };
  }

  const allProjects = scopeProjects(await listProjectsWith(database), scope);
  const matchedProjects = allProjects.filter(
    (p) =>
      matches(p.name, q) ||
      matches(p.id, q) ||
      matches(p.state, q) ||
      matches(p.district, q)
  );

  const parcels: SearchResults["parcels"] = [];
  const families: SearchResults["families"] = [];

  for (const project of allProjects) {
    const [parcelList, familyList] = await Promise.all([
      listParcelsWith(database, project.id),
      listFamiliesForProjectWith(database, project.id),
    ]);
    for (const parcel of parcelList) {
      if (matches(parcel.village, q)) {
        parcels.push({
          id: parcel.id,
          projectId: project.id,
          projectName: project.name,
          village: parcel.village,
        });
      }
    }
    for (const family of familyList) {
      if (matches(family.headOfHouseholdName, q)) {
        families.push({
          id: family.id,
          projectId: project.id,
          projectName: project.name,
          headOfHouseholdName: family.headOfHouseholdName,
        });
      }
    }
  }

  return {
    projects: matchedProjects.map((p) => ({
      id: p.id,
      name: p.name,
      state: p.state,
      district: p.district,
      stage: p.stage,
    })),
    parcels,
    families,
  };
}

export const search = (query: string, scope?: ProjectScopeFilter) =>
  searchWith(defaultDb, query, scope);
