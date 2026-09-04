import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { dismissConflict } from "@/db/conflict-dismissals";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "conflict:review")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as { conflictKey?: string; note?: string };
  if (!body.conflictKey) {
    return NextResponse.json({ error: "Missing conflictKey" }, { status: 400 });
  }
  await dismissConflict({ conflictKey: body.conflictKey, dismissedBy: session.userId, note: body.note });
  return NextResponse.json({ ok: true });
}
