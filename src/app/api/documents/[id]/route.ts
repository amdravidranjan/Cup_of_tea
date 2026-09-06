import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  getDocument,
  updateDocument,
  listDocumentVersions,
  type UpdateDocumentInput,
} from "@/db/documents";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import { isNoOpChange } from "@/lib/audit";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/document-categories";

/** The document plus every version filed under its category, newest first. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(doc.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const versions = await listDocumentVersions(doc.projectId, doc.category);
  return NextResponse.json({ document: doc, versions });
}

/**
 * Corrects a document's filing details — its category or its display name.
 *
 * The stored bytes are never replaced. A document on a statutory file is
 * evidence, and rewriting its contents in place would defeat the point of
 * keeping it; a superseding version is uploaded as a new version instead
 * (see `createDocumentWith`, which numbers per project + category). What can
 * be corrected here is a clerical mistake: filing an award letter under
 * "Other", or a mangled filename from a scanner.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "record:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(doc.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as UpdateDocumentInput & { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required to refile a document" },
      { status: 400 }
    );
  }
  if (
    body.category !== undefined &&
    !DOCUMENT_CATEGORIES.includes(body.category as DocumentCategory)
  ) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (body.fileName !== undefined && !body.fileName.trim()) {
    return NextResponse.json({ error: "File name cannot be blank" }, { status: 400 });
  }

  const update: UpdateDocumentInput = {
    category: body.category,
    fileName: body.fileName?.trim(),
  };
  const before = { category: doc.category, fileName: doc.fileName };
  const after = { ...before, ...Object.fromEntries(
    Object.entries(update).filter(([, v]) => v !== undefined)
  ) };
  if (isNoOpChange(before, after)) {
    return NextResponse.json({ error: "Nothing was changed" }, { status: 400 });
  }

  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "UPDATE",
      entityType: "DOCUMENT",
      entityId: id,
      projectId: doc.projectId,
      summary: `Refiled ${doc.fileName}`,
      reason,
      ip: clientIp(request),
      loadBefore: async () => before,
      loadAfter: async () => {
        const updated = await getDocument(id);
        return updated ? { category: updated.category, fileName: updated.fileName } : null;
      },
    },
    () => updateDocument(id, update)
  );

  return NextResponse.json({ ok: true });
}
