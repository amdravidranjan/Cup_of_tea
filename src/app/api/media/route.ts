import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canViewProject } from "@/lib/project-scope";
import { getProject } from "@/db/projects";
import {
  createMediaAsset,
  listMediaAssets,
  MEDIA_ENTITY_TYPES,
  MEDIA_KINDS,
  type MediaEntityType,
  type MediaKind,
} from "@/db/media";
import { recordAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import { saveFile } from "@/lib/storage";

function isEntityType(value: string): value is MediaEntityType {
  return MEDIA_ENTITY_TYPES.includes(value as MediaEntityType);
}

function isKind(value: string): value is MediaKind {
  return MEDIA_KINDS.includes(value as MediaKind);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const projectId = params.get("projectId") ?? undefined;
  if (projectId) {
    const project = await getProject(projectId);
    if (!project || !canViewProject(session, project)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  const entityTypeParam = params.get("entityType") ?? undefined;
  if (entityTypeParam && !isEntityType(entityTypeParam)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }
  const assets = await listMediaAssets({
    projectId,
    entityType: entityTypeParam as MediaEntityType | undefined,
    entityId: params.get("entityId") ?? undefined,
  });
  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "document:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const projectId = form.get("projectId");
  const entityId = form.get("entityId");
  const entityType = form.get("entityType");
  const kind = form.get("kind");
  if (!(file instanceof File) || typeof projectId !== "string" || typeof entityId !== "string" || typeof entityType !== "string" || typeof kind !== "string") {
    return NextResponse.json({ error: "Missing file, project, entity, or media kind" }, { status: 400 });
  }
  if (!isEntityType(entityType) || !isKind(kind)) {
    return NextResponse.json({ error: "Invalid entity type or media kind" }, { status: 400 });
  }
  const project = await getProject(projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const latitude = Number(form.get("latitude"));
  const longitude = Number(form.get("longitude"));
  const capturedAtRaw = form.get("capturedAt");
  const buffer = Buffer.from(await file.arrayBuffer());
  const { storagePath, sizeBytes } = await saveFile(buffer, {
    projectId,
    category: "MEDIA",
    fileName: file.name,
  });
  const id = await createMediaAsset({
    entityType,
    entityId,
    projectId,
    kind,
    storagePath,
    mimeType: file.type || "application/octet-stream",
    caption: typeof form.get("caption") === "string" ? (form.get("caption") as string) : undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    capturedAt: typeof capturedAtRaw === "string" && capturedAtRaw ? new Date(capturedAtRaw) : undefined,
    uploadedBy: session.userId,
  });
  await recordAudit({
    actor: { userId: session.userId, role: session.role },
    action: "UPLOAD",
    entityType: entityType === "PROJECT" ? "PROJECT" : "DOCUMENT",
    entityId: id,
    projectId,
    summary: `Uploaded ${kind.toLowerCase()} media for ${entityType.toLowerCase()}`,
    ip: clientIp(request),
    after: { entityType, entityId, kind, mimeType: file.type, sizeBytes, storagePath },
  });
  return NextResponse.json({ id }, { status: 201 });
}
