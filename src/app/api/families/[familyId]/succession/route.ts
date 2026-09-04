import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordSuccession } from "@/db/succession";
import { getFamilyById } from "@/db/families";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "succession:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { familyId } = await params;
  const family = await getFamilyById(familyId);
  if (!family) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(family.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    deceasedAt?: string;
    successionNote?: string;
    heirs?: { name?: string; relationship?: string; sharePercent?: number; contactPhone?: string }[];
  };
  if (!body.deceasedAt || !Array.isArray(body.heirs) || body.heirs.length === 0) {
    return NextResponse.json({ error: "Deceased date and at least one heir are required" }, { status: 400 });
  }
  const heirs = body.heirs.map((h) => ({
    name: h.name ?? "",
    relationship: h.relationship ?? "",
    sharePercent: h.sharePercent ?? 0,
    contactPhone: h.contactPhone,
  }));
  if (heirs.some((h) => !h.name || !h.relationship || h.sharePercent <= 0)) {
    return NextResponse.json({ error: "Each heir needs a name, relationship, and share" }, { status: 400 });
  }
  await recordSuccession({
    familyId,
    deceasedAt: new Date(body.deceasedAt),
    successionNote: body.successionNote,
    heirs,
  });
  return NextResponse.json({ ok: true });
}
