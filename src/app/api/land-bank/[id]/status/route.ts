import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getLandBankEntryById, updateLandBankStatus, LAND_BANK_STATUSES } from "@/db/land-bank";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "land-bank:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const entry = await getLandBankEntryById(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(entry.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { status?: string };
  if (!body.status || !LAND_BANK_STATUSES.includes(body.status as (typeof LAND_BANK_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await updateLandBankStatus(id, body.status as (typeof LAND_BANK_STATUSES)[number]);
  return NextResponse.json({ ok: true });
}
