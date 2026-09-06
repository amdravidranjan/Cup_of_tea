import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { approveNoticeDraft, getNoticeDraftById } from "@/db/notice-drafts";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

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
  const draft = await getNoticeDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(draft.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { editedText?: string };
  if (!body.editedText) {
    return NextResponse.json({ error: "Missing editedText" }, { status: 400 });
  }
  const editedText = body.editedText;
  // The point of the human-in-the-loop step is that a person is accountable
  // for the wording that goes out, so the text as approved is recorded
  // against the text that was drafted.
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "APPROVE",
      entityType: "NOTICE_DRAFT",
      entityId: id,
      projectId: draft.projectId,
      summary: "Approved the citizen notice draft",
      ip: clientIp(request),
      loadBefore: async () => ({ status: draft.status, draftText: draft.draftText }),
      loadAfter: async () => ({ status: "APPROVED", draftText: editedText, approvedBy: session.userId }),
    },
    () => approveNoticeDraft(id, { editedText, approvedBy: session.userId })
  );
  return NextResponse.json({ ok: true });
}
