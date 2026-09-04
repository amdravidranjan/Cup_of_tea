import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDocument } from "@/db/documents";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { readStoredFile } from "@/lib/storage";

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
    // Same response as "not found" — don't reveal whether the document
    // exists to a viewer outside its project's scope.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = await readStoredFile(doc.storagePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
    },
  });
}
