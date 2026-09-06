import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { DEMO_USERS } from "@/db/seed-data";
import { recordAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { userId?: string };
  const user = DEMO_USERS.find((u) => u.id === body.userId);
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  }
  await setSession({
    userId: user.id,
    name: user.name,
    role: user.role,
    state: user.state,
    district: user.district,
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
