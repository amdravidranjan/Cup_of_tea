import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getFamilyById, grantEntitlement } from "@/db/families";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

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
  try {
    await grantEntitlement(entitlementId, {
      amount: body.amount,
      grantedBy: session.userId,
      note: body.note,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
