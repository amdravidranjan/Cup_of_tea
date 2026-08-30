import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createProject, listProjects } from "@/db/projects";
import { projectScopeFor, scopeProjects } from "@/lib/project-scope";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = scopeProjects(await listProjects(), projectScopeFor(session));
  return NextResponse.json({ projects: all });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as {
    name?: string;
    purpose?: string;
    state?: string;
    district?: string;
  };
  if (!body.name || !body.purpose || !body.state || !body.district) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const id = await createProject({
    name: body.name,
    purpose: body.purpose,
    state: body.state,
    district: body.district,
    createdBy: session.userId,
  });
  return NextResponse.json({ id }, { status: 201 });
}
