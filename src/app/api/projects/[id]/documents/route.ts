import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createDocument, listDocuments } from "@/db/documents";
import { saveFile } from "@/lib/storage";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/document-categories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const docs = await listDocuments(id);
  return NextResponse.json({ documents: docs });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "document:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  const category = form.get("category");
  if (!(file instanceof File) || typeof category !== "string") {
    return NextResponse.json({ error: "Missing file or category" }, { status: 400 });
  }
  if (!DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const { storagePath, sizeBytes } = await saveFile(buffer, {
    projectId: id,
    category,
    fileName: file.name,
  });
  const docId = await createDocument({
    projectId: id,
    category: category as DocumentCategory,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes,
    storagePath,
    uploadedBy: session.userId,
  });
  return NextResponse.json({ id: docId }, { status: 201 });
}
