import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listNotifications, getLastSeen } from "@/db/notifications";
import { projectScopeFor } from "@/lib/project-scope";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [events, lastSeenAt] = await Promise.all([
    listNotifications(projectScopeFor(session)),
    getLastSeen(session.userId),
  ]);
  return NextResponse.json({ events, lastSeenAt });
}
