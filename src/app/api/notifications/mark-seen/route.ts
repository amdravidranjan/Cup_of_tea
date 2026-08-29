import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markSeen } from "@/db/notifications";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await markSeen(session.userId);
  return NextResponse.json({ ok: true });
}
