import { db } from "./client";
import * as schema from "./schema";

export interface TitleConflict {
  key: string;
  headOfHouseholdName: string;
  village: string;
  occurrences: {
    familyId: string;
    projectId: string;
    projectName: string;
    category: string;
    entitlementTotal: number;
  }[];
}

/**
 * Cross-references every registered family, across every project, for
 * duplicate name+village combinations — the documented fraud pattern
 * where the same landholding gets compensated twice under two different
 * project codes. This is a real computation over real data, not a
 * heuristic score: a name+village pair appearing on more than one
 * project's family register is flagged, full stop.
 */
export async function findTitleConflicts(): Promise<TitleConflict[]> {
  const [families, projects, entitlementRows] = await Promise.all([
    db.select().from(schema.families),
    db.select().from(schema.projects),
    db.select().from(schema.entitlements),
  ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const entitlementTotalByFamily = new Map<string, number>();
  for (const e of entitlementRows) {
    if (e.status !== "GRANTED") continue;
    entitlementTotalByFamily.set(
      e.familyId,
      (entitlementTotalByFamily.get(e.familyId) ?? 0) + (e.amount ?? 0)
    );
  }

  const groups = new Map<string, typeof families>();
  for (const f of families) {
    const key = `${f.headOfHouseholdName.trim().toLowerCase()}::${f.village.trim().toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(f);
    groups.set(key, list);
  }

  const conflicts: TitleConflict[] = [];
  for (const [key, group] of groups) {
    const distinctProjects = new Set(group.map((f) => f.projectId));
    if (distinctProjects.size < 2) continue; // same family, same project = not a conflict
    conflicts.push({
      key,
      headOfHouseholdName: group[0].headOfHouseholdName,
      village: group[0].village,
      occurrences: group.map((f) => ({
        familyId: f.id,
        projectId: f.projectId,
        projectName: projectsById.get(f.projectId)?.name ?? "Unknown project",
        category: f.category,
        entitlementTotal: entitlementTotalByFamily.get(f.id) ?? 0,
      })),
    });
  }
  return conflicts;
}
