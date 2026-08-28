import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { DEMO_USERS } from "@/db/seed-data";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { userId?: string };
  const user = DEMO_USERS.find((u) => u.id === body.userId);
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  }
  await setSession({ userId: user.id, name: user.name, role: user.role });
  return NextResponse.json({ ok: true });
}
