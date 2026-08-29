import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listNotifications, getLastSeen } from "@/db/notifications";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filter = session.role === "state" ? { state: session.state } : undefined;
  const [events, lastSeenAt] = await Promise.all([
    listNotifications(filter),
    getLastSeen(session.userId),
  ]);
  return NextResponse.json({ events, lastSeenAt });
}
