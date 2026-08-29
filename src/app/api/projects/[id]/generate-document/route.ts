import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProject } from "@/db/projects";
import { listParcels } from "@/db/parcels";
import { listCompensationsForProject } from "@/db/compensation";
import { createDocument } from "@/db/documents";
import { saveFile } from "@/lib/storage";
import { STAGES, type Stage } from "@/lib/workflow";
import {
  GENERATED_DOCUMENT_STAGE,
  GENERATED_DOCUMENT_TYPES,
  GENERATED_DOCUMENT_TITLES,
  renderDocumentPdf,
  type GeneratedDocumentType,
} from "@/lib/generated-documents";

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
  const body = (await request.json()) as { type?: GeneratedDocumentType };
  if (!body.type || !GENERATED_DOCUMENT_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const requiredStage = GENERATED_DOCUMENT_STAGE[body.type];
  if (STAGES.indexOf(project.stage as Stage) < STAGES.indexOf(requiredStage)) {
    return NextResponse.json(
      { error: `Project must reach ${requiredStage} before this document can be generated` },
      { status: 400 }
    );
  }

  const parcels = await listParcels(id);
  const compensations = body.type === "AWARD_LETTER" ? await listCompensationsForProject(id) : [];

  const pdfBytes = await renderDocumentPdf({
    type: body.type,
    project: {
      name: project.name,
      purpose: project.purpose,
      state: project.state,
      district: project.district,
    },
    issuedAt: new Date(),
    issuedBy: session.name,
    parcels: parcels.map((p) => ({ village: p.village, areaHectares: p.areaHectares })),
    compensationTotal:
      compensations.length > 0
        ? compensations.reduce((sum, c) => sum + c.total, 0)
        : undefined,
  });

  const fileName = `${GENERATED_DOCUMENT_TITLES[body.type].replace(/\s+/g, "-")}.pdf`;
  const { storagePath, sizeBytes } = await saveFile(Buffer.from(pdfBytes), {
    projectId: id,
    category: body.type,
    fileName,
  });
  const docId = await createDocument({
    projectId: id,
    category: body.type,
    fileName,
    mimeType: "application/pdf",
    sizeBytes,
    storagePath,
    uploadedBy: session.userId,
  });

  return NextResponse.json({ id: docId }, { status: 201 });
}
