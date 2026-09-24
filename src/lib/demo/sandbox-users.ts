/**
 * The officers that exist only for one visitor's walkthrough sandbox.
 *
 * A judge signs in as the Collector of the district their demo project sits
 * in, so the officer and the case belong together. Those users cannot be part
 * of the seeded list — the district depends on the language picked — so they
 * are created per sandbox, and recreated on demand: the hosted demo keeps its
 * database per instance, so the instance that handles the sign-in may never
 * have seen the one that created the sandbox.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { DEMO_SANDBOX_PREFIX } from "@/db/projects";
import type { DemoRegion } from "./regions";

export interface SandboxUser {
  id: string;
  name: string;
  role: string;
  state: string | null;
  district: string | null;
}

export function sandboxUsers(projectId: string, region: DemoRegion): {
  district: SandboxUser;
  state: SandboxUser;
} {
  const suffix = projectId.slice(DEMO_SANDBOX_PREFIX.length);
  return {
    district: {
      id: `u-demo-dc-${suffix}`,
      name: `Sub-Collector, ${region.district}`,
      role: "district",
      state: region.state,
      district: region.district,
    },
    state: {
      id: `u-demo-st-${suffix}`,
      name: `${region.state} State Government`,
      role: "state",
      state: region.state,
      district: null,
    },
  };
}

export async function upsertSandboxUsers(projectId: string, region: DemoRegion) {
  const people = sandboxUsers(projectId, region);
  for (const user of [people.district, people.state]) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: { name: user.name, role: user.role, state: user.state, district: user.district },
      });
  }
  return people;
}

/**
 * The sandbox officer with this id, creating it if this instance has not seen
 * it. Returns null when the id does not belong to the given sandbox, which is
 * what keeps one visitor from signing in as another's officer.
 */
export async function ensureSandboxUser(
  userId: string,
  sandboxId: string | undefined,
  region: DemoRegion
): Promise<SandboxUser | null> {
  if (!userId.startsWith("u-demo-")) return null;
  if (!sandboxId?.startsWith(DEMO_SANDBOX_PREFIX)) return null;
  if (!userId.endsWith(sandboxId.slice(DEMO_SANDBOX_PREFIX.length))) return null;

  const row = (await db.select().from(users).where(eq(users.id, userId)))[0];
  if (row) {
    return { id: row.id, name: row.name, role: row.role, state: row.state, district: row.district };
  }

  const people = await upsertSandboxUsers(sandboxId, region);
  return [people.district, people.state].find((u) => u.id === userId) ?? null;
}
