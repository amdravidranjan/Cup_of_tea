import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createProject, listProjects } from "@/db/projects";
import { projectScopeFor, scopeProjects } from "@/lib/project-scope";
import { recordAudit, withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

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
  const input = {
    name: body.name,
    purpose: body.purpose,
    state: body.state,
    district: body.district,
    createdBy: session.userId,
    createdByRole: session.role,
  };
  // A create is audited after the insert, not around it: the entity id the
  // history is keyed on does not exist until the row does.
  const id = await createProject(input);
  await recordAudit({
    actor: { userId: session.userId, role: session.role },
    action: "CREATE",
    entityType: "PROJECT",
    entityId: id,
    projectId: id,
    summary: `Created project "${input.name}" in ${input.district}, ${input.state}`,
    ip: clientIp(request),
    after: {
      name: input.name,
      purpose: input.purpose,
      state: input.state,
      district: input.district,
      stage: "DRAFT",
    },
  });
  return NextResponse.json({ id }, { status: 201 });
}
