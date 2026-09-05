/**
 * db-check.ts — Post-seed referential integrity checker.
 *
 * Verifies that every FK in the database points to a real parent row,
 * counts all tables, and reports totals vs targets. Exits with code 1
 * if any orphan is found.
 *
 * Usage: tsx scripts/db-check.ts
 */
import { db } from "../src/db/client";
import * as schema from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

interface CheckResult {
  table: string;
  count: number;
  target: string;
  orphans: number;
}

async function countTable(table: any): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(table);
  return rows[0]?.count ?? 0;
}

async function checkFKOrphans(
  childTable: any,
  childFK: any,
  parentTable: any,
  parentPK: any,
  label: string,
): Promise<number> {
  // Select distinct FK values from child, check if they exist in parent
  const childRows = await db.selectDistinct({ fk: childFK }).from(childTable);
  let orphans = 0;
  for (const row of childRows) {
    if (row.fk === null) continue;
    const parent = await db.select({ id: parentPK }).from(parentTable).where(eq(parentPK, row.fk));
    if (parent.length === 0) {
      console.error(`  ❌ ORPHAN: ${label} FK="${row.fk}" has no parent`);
      orphans++;
    }
  }
  return orphans;
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Database Integrity Check");
  console.log("═══════════════════════════════════════\n");

  const results: CheckResult[] = [];
  let totalOrphans = 0;

  // Count all tables
  const counts: Record<string, number> = {};
  const tables = [
    { name: "users", table: schema.users, target: "20+" },
    { name: "projects", table: schema.projects, target: "15" },
    { name: "parcels", table: schema.parcels, target: "300+" },
    { name: "families", table: schema.families, target: "150+" },
    { name: "entitlements", table: schema.entitlements, target: "900+" },
    { name: "heirs", table: schema.heirs, target: "10+" },
    { name: "compensations", table: schema.compensations, target: "150+" },
    { name: "grievances", table: schema.grievances, target: "50+" },
    { name: "documents", table: schema.documents, target: "100+" },
    { name: "infrastructureItems", table: schema.infrastructureItems, target: "50+" },
    { name: "gramSabhaConsultations", table: schema.gramSabhaConsultations, target: "30+" },
    { name: "legalDisputes", table: schema.legalDisputes, target: "15+" },
    { name: "contractors", table: schema.contractors, target: "10+" },
    { name: "tenders", table: schema.tenders, target: "20+" },
    { name: "landBankEntries", table: schema.landBankEntries, target: "20+" },
    { name: "rehabilitationServices", table: schema.rehabilitationServices, target: "100+" },
    { name: "notificationLog", table: schema.notificationLog, target: "200+" },
    { name: "noticeDrafts", table: schema.noticeDrafts, target: "20+" },
    { name: "projectRequests", table: schema.projectRequests, target: "3+" },
    { name: "stageHistory", table: schema.stageHistory, target: "50+" },
    { name: "rrStageHistory", table: schema.rrStageHistory, target: "10+" },
    { name: "compensationRates", table: schema.compensationRates, target: "10+" },
  ];

  console.log("Table Counts:");
  console.log("─────────────────────────────────────");
  for (const t of tables) {
    const count = await countTable(t.table);
    counts[t.name] = count;
    const status = count > 0 ? "✓" : "⚠";
    console.log(`  ${status} ${t.name.padEnd(30)} ${String(count).padStart(6)}  (target: ${t.target})`);
    results.push({ table: t.name, count, target: t.target, orphans: 0 });
  }

  // FK integrity checks
  console.log("\nFK Integrity Checks:");
  console.log("─────────────────────────────────────");

  const fkChecks = [
    { child: schema.parcels, childFK: schema.parcels.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "parcels.projectId → projects" },
    { child: schema.families, childFK: schema.families.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "families.projectId → projects" },
    { child: schema.families, childFK: schema.families.parcelId, parent: schema.parcels, parentPK: schema.parcels.id, label: "families.parcelId → parcels" },
    { child: schema.compensations, childFK: schema.compensations.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "compensations.projectId → projects" },
    { child: schema.compensations, childFK: schema.compensations.parcelId, parent: schema.parcels, parentPK: schema.parcels.id, label: "compensations.parcelId → parcels" },
    { child: schema.grievances, childFK: schema.grievances.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "grievances.projectId → projects" },
    { child: schema.entitlements, childFK: schema.entitlements.familyId, parent: schema.families, parentPK: schema.families.id, label: "entitlements.familyId → families" },
    { child: schema.heirs, childFK: schema.heirs.familyId, parent: schema.families, parentPK: schema.families.id, label: "heirs.familyId → families" },
    { child: schema.tenders, childFK: schema.tenders.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "tenders.projectId → projects" },
    { child: schema.tenders, childFK: schema.tenders.contractorId, parent: schema.contractors, parentPK: schema.contractors.id, label: "tenders.contractorId → contractors" },
    { child: schema.legalDisputes, childFK: schema.legalDisputes.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "legalDisputes.projectId → projects" },
    { child: schema.rehabilitationServices, childFK: schema.rehabilitationServices.familyId, parent: schema.families, parentPK: schema.families.id, label: "rehabServices.familyId → families" },
    { child: schema.rehabilitationServices, childFK: schema.rehabilitationServices.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "rehabServices.projectId → projects" },
    { child: schema.notificationLog, childFK: schema.notificationLog.familyId, parent: schema.families, parentPK: schema.families.id, label: "notificationLog.familyId → families" },
    { child: schema.notificationLog, childFK: schema.notificationLog.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "notificationLog.projectId → projects" },
    { child: schema.landBankEntries, childFK: schema.landBankEntries.parcelId, parent: schema.parcels, parentPK: schema.parcels.id, label: "landBankEntries.parcelId → parcels" },
    { child: schema.landBankEntries, childFK: schema.landBankEntries.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "landBankEntries.projectId → projects" },
    { child: schema.noticeDrafts, childFK: schema.noticeDrafts.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "noticeDrafts.projectId → projects" },
    { child: schema.infrastructureItems, childFK: schema.infrastructureItems.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "infrastructureItems.projectId → projects" },
    { child: schema.gramSabhaConsultations, childFK: schema.gramSabhaConsultations.projectId, parent: schema.projects, parentPK: schema.projects.id, label: "gramSabha.projectId → projects" },
  ];

  for (const check of fkChecks) {
    const orphans = await checkFKOrphans(check.child, check.childFK, check.parent, check.parentPK, check.label);
    totalOrphans += orphans;
    const status = orphans === 0 ? "✓" : "❌";
    console.log(`  ${status} ${check.label}${orphans > 0 ? ` (${orphans} orphans)` : ""}`);
  }

  console.log("\n═══════════════════════════════════════");
  if (totalOrphans > 0) {
    console.error(`❌ FAILED: ${totalOrphans} orphan rows found.`);
    process.exit(1);
  } else {
    console.log("✓ All FK integrity checks passed.");
    console.log("═══════════════════════════════════════");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
