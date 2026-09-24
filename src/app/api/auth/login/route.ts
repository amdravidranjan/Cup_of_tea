import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { DEMO_USERS } from "@/db/seed-data";
import { DEMO_SANDBOX_COOKIE } from "@/db/projects";
import { DEMO_REGION_COOKIE, regionById } from "@/lib/demo/regions";
import { ensureSandboxUser } from "@/lib/demo/sandbox-users";
import { recordAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import type { Role } from "@/lib/workflow";

interface DemoUser {
  id: string;
  name: string;
  role: Role;
  state?: string | null;
  district?: string | null;
}

/**
 * The walkthrough's own Collector for this visitor, created on demand if this
 * instance has not seen it. Accepted only for the sandbox named by the
 * visitor's own cookie, never as a way into anyone else's.
 */
async function sandboxUser(request: NextRequest, userId: string): Promise<DemoUser | null> {
  const sandbox = request.cookies.get(DEMO_SANDBOX_COOKIE)?.value;
  const region = regionById(request.cookies.get(DEMO_REGION_COOKIE)?.value);
  const user = await ensureSandboxUser(userId, sandbox, region);
  return user ? { ...user, role: user.role as Role } : null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { userId?: string };
  const user: DemoUser | null =
    ((DEMO_USERS.find((u) => u.id === body.userId) as DemoUser | undefined) ??
      (body.userId ? await sandboxUser(request, body.userId) : null)) ?? null;
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  }
  await setSession({
    userId: user.id,
    name: user.name,
    role: user.role,
    state: user.state ?? undefined,
    district: user.district ?? undefined,
  });
  await recordAudit({
    actor: { userId: user.id, role: user.role },
    action: "SIGN_IN",
    entityType: "SESSION",
    entityId: user.id,
    summary: `${user.name} signed in as ${user.role}`,
    ip: clientIp(request),
    after: { userId: user.id, role: user.role, district: user.district ?? null, state: user.state ?? null },
  });
  return NextResponse.json({ ok: true });
}
