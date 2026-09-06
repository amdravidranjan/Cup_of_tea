import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getFamilyById, grantEntitlement } from "@/db/families";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; entitlementId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "entitlement:grant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { familyId, entitlementId } = await params;
  const family = await getFamilyById(familyId);
  if (!family) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(family.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { amount?: number; note?: string };
  if (typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  const amount = body.amount;
  try {
    await withAudit(
      {
        actor: { userId: session.userId, role: session.role },
        action: "GRANT",
        entityType: "ENTITLEMENT",
        entityId: entitlementId,
        projectId: family.projectId,
        summary: `Granted entitlement of ${amount} to ${family.headOfHouseholdName}`,
        reason: body.note ?? null,
        ip: clientIp(request),
        loadAfter: async () => ({
          status: "GRANTED",
          amount,
          grantedBy: session.userId,
          note: body.note ?? null,
        }),
      },
      () =>
        grantEntitlement(entitlementId, {
          amount,
          grantedBy: session.userId,
          note: body.note,
        })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
