import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { sandboxUsers, upsertSandboxUsers } from "@/lib/demo/sandbox-users";
import { seedFlagship } from "@/db/seed-flagship";
import { getProject, DEMO_SANDBOX_PREFIX, DEMO_SANDBOX_COOKIE } from "@/db/projects";
import {
  DEMO_REGION_COOKIE,
  regionById,
  regionForLang,
  highCourtFor,
  type DemoRegion,
} from "@/lib/demo/regions";
import { kitCounts } from "@/lib/demo/kit";

export const runtime = "nodejs";

/**
 * Gives a visitor their own copy of the demo project, sited in their region.
 *
 * Two things are per-visitor here. One is isolation: on a shared deployment
 * the second judge would otherwise find the first judge's plots already
 * registered, and the upload step would say "already on file" instead of
 * showing what intake does. The other is language: a judge who takes the
 * walkthrough in Marathi gets the Godavari crossing in Paithan, with Marathi
 * titleholders in the records, not a Tamil Nadu case.
 *
 * The sandbox also gets its own Collector and State officer, so the officer
 * the judge logs in as belongs to the district the project is in.
 */


function session(projectId: string, region: DemoRegion, reused: boolean) {
  const counts = kitCounts(region);
  return {
    projectId,
    reused,
    users: sandboxUsers(projectId, region),
    counts,
    region: {
      id: region.id,
      state: region.state,
      stateNative: region.stateNative,
      district: region.district,
      districtNative: region.districtNative,
      taluk: region.taluk,
      town: region.town,
      townNative: region.townNative,
      river: region.river,
      riverNative: region.riverNative,
      projectName: region.projectName,
      projectNameNative: region.projectNameNative,
      village: region.villages[0].name,
      villageNative: region.villages[0].native,
      court: highCourtFor(region),
      uiSecond: region.uiSecond,
    },
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    reset?: boolean;
    lang?: string;
    region?: string;
  };

  const region = body.region
    ? regionById(body.region)
    : body.lang
      ? regionForLang(body.lang)
      : regionById(request.cookies.get(DEMO_REGION_COOKIE)?.value);

  const existing = request.cookies.get(DEMO_SANDBOX_COOKIE)?.value;
  const existingRegion = request.cookies.get(DEMO_REGION_COOKIE)?.value;
  let projectId = existing?.startsWith(DEMO_SANDBOX_PREFIX) ? existing : null;

  // A sandbox already sited in this region can be picked up where it was
  // left. One sited elsewhere is re-seeded: the judge changed language, and
  // the records they are about to upload no longer match the project.
  const sameRegion = existingRegion === region.id;
  if (projectId && sameRegion && !body.reset && (await getProject(projectId))) {
    await upsertSandboxUsers(projectId, region);
    const res = NextResponse.json(session(projectId, region, true));
    res.cookies.set(DEMO_REGION_COOKIE, region.id, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
    return res;
  }

  projectId ??= `${DEMO_SANDBOX_PREFIX}${crypto.randomUUID().slice(0, 8)}`;
  await seedFlagship({ id: projectId, quiet: true, region });
  const users = await upsertSandboxUsers(projectId, region);

  // The project was created by the requiring body; hand the district officer
  // of *this* region the case, so the dashboard the judge lands on is theirs.
  await db
    .update(schema.projects)
    .set({ district: region.district, state: region.state })
    .where(eq(schema.projects.id, projectId));

  const res = NextResponse.json({ ...session(projectId, region, false), users });
  for (const [name, value] of [
    [DEMO_SANDBOX_COOKIE, projectId],
    [DEMO_REGION_COOKIE, region.id],
  ] as const) {
    res.cookies.set(name, value, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
  }
  return res;
}

/** What the login page and the walkthrough read to describe the sandbox. */
export async function GET(request: NextRequest) {
  const projectId = request.cookies.get(DEMO_SANDBOX_COOKIE)?.value ?? null;
  const region = regionById(request.cookies.get(DEMO_REGION_COOKIE)?.value);
  if (!projectId || !projectId.startsWith(DEMO_SANDBOX_PREFIX)) {
    return NextResponse.json({ projectId: null, region: session("p-demo-none", region, false).region });
  }
  // Recreate the officers as well: a fresh instance has the seeded database
  // and none of this visitor's sandbox in it.
  await upsertSandboxUsers(projectId, region);
  return NextResponse.json(session(projectId, region, true));
}
