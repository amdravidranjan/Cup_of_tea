import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProject, DEMO_SANDBOX_PREFIX, DEMO_SANDBOX_COOKIE } from "@/db/projects";
import { createFamily, listFamiliesForProject } from "@/db/families";
import { recordAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import { DEMO_REGION_COOKIE, regionById } from "@/lib/demo/regions";
import { demoProject } from "@/db/demo-project";

export const runtime = "nodejs";

/**
 * Runs the social impact census on the visitor's sandbox project.
 *
 * The land records the judge just uploaded produce titleholders only. Tenant
 * cultivators, labourers and families living on land they do not own are
 * affected families under s.3(c) too, and no record of rights can find them —
 * only a physical survey can. The walkthrough needs those households on
 * screen to make that point, so this writes the region's surveyed families in
 * one call, marked `SIA_SURVEY` exactly as the survey route would.
 *
 * Restricted to the caller's own sandbox: it is a demo convenience, not a way
 * to bulk-insert families into a real project.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = request.cookies.get(DEMO_SANDBOX_COOKIE)?.value;
  if (!projectId?.startsWith(DEMO_SANDBOX_PREFIX)) {
    return NextResponse.json({ error: "No demo sandbox for this visitor" }, { status: 400 });
  }
  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const region = regionById(request.cookies.get(DEMO_REGION_COOKIE)?.value);
  const surveyed = demoProject(region).families;

  // Re-running the walkthrough must not double the census.
  const existing = await listFamiliesForProject(projectId);
  const already = new Set(existing.map((f) => `${f.headOfHouseholdName}|${f.village}`));

  let created = 0;
  for (const family of surveyed) {
    if (already.has(`${family.name}|${family.village}`)) continue;
    await createFamily({
      projectId,
      headOfHouseholdName: family.name,
      village: family.village,
      category: family.category,
      memberCount: family.memberCount,
      vulnerableGroup: family.vulnerable,
      contactPhone: family.phone,
      surveyedBy: session.userId,
      source: "SIA_SURVEY",
      entitlementBasis: family.entitlementBasis,
    });
    created++;
  }

  if (created > 0) {
    await recordAudit({
      actor: { userId: session.userId, role: session.role },
      action: "CREATE",
      entityType: "FAMILY",
      entityId: projectId,
      projectId,
      summary: `Social impact census recorded ${created} non-titleholder affected families in ${region.district}`,
      ip: clientIp(request),
      after: { created, source: "SIA_SURVEY" },
    });
  }

  return NextResponse.json({ created, total: existing.length + created });
}
