import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompensationsForProject } from "@/db/compensation";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const list = await listCompensationsForProject(id);
  return NextResponse.json({ compensations: list });
}
