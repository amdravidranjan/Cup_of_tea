import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createNoticeDraft, listNoticeDraftsForProject } from "@/db/notice-drafts";
import { getFamilyById } from "@/db/families";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { draftCitizenNotice } from "@/lib/notice-template";

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
  const drafts = await listNoticeDraftsForProject(id);
  return NextResponse.json({ drafts });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "notice-draft:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { familyId?: string };
  let familyName: string | undefined;
  let village: string | undefined;
  if (body.familyId) {
    const family = await getFamilyById(body.familyId);
    if (!family || family.projectId !== id) {
      return NextResponse.json({ error: "Family not found on this project" }, { status: 404 });
    }
    familyName = family.headOfHouseholdName;
    village = family.village;
  }
  const draftText = draftCitizenNotice({
    projectName: project.name,
    purpose: project.purpose,
    district: project.district,
    state: project.state,
    stage: project.stage,
    familyName,
    village,
  });
  const draftId = await createNoticeDraft({ projectId: id, familyId: body.familyId, draftText });
  return NextResponse.json({ id: draftId, draftText }, { status: 201 });
}
