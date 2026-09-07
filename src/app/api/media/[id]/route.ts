import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listMediaAssets } from "@/db/media";
import { readStoredFile } from "@/lib/storage";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const assets = await listMediaAssets();
  const asset = assets.find((candidate) => candidate.id === id);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const project = await getProject(asset.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await readStoredFile(asset.storagePath);
  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
