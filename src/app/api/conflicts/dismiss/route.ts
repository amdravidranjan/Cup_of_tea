import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { dismissConflict } from "@/db/conflict-dismissals";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

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
  const conflictKey = body.conflictKey;
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "DISMISS",
      entityType: "CONFLICT_DISMISSAL",
      entityId: conflictKey,
      summary: `Dismissed title-conflict flag ${conflictKey} as a false positive`,
      reason: body.note ?? null,
      ip: clientIp(request),
      loadAfter: async () => ({ conflictKey, dismissedBy: session.userId, note: body.note ?? null }),
    },
    () => dismissConflict({ conflictKey, dismissedBy: session.userId, note: body.note })
  );
  return NextResponse.json({ ok: true });
}
