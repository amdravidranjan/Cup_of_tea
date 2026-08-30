import { NextRequest, NextResponse } from "next/server";
import { createGrievance } from "@/db/grievances";
import { getProject } from "@/db/projects";
import { isPublicStage } from "@/db/public";
import { saveFile } from "@/lib/storage";
import type { Stage } from "@/lib/workflow";
import type { GrievanceType } from "@/lib/grievance-workflow";

const GRIEVANCE_TYPES: GrievanceType[] = ["COMPENSATION_DISPUTE", "GENERAL_GRIEVANCE"];

// Intentionally no session check — this is the public, no-login filing
// endpoint (any citizen affected by a notified project can file, per the
// parent spec's public-portal design; matches how the public detail page
// itself requires no auth). Accepts multipart form data so a supporting
// document (sale deed, photo, etc.) can be attached alongside the text
// fields.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const form = await request.formData();

  const type = form.get("type");
  const submitterName = form.get("submitterName");
  const submitterContact = form.get("submitterContact");
  const description = form.get("description");
  const attachment = form.get("attachment");

  if (typeof type !== "string" || !GRIEVANCE_TYPES.includes(type as GrievanceType)) {
    return NextResponse.json({ error: "Invalid grievance type" }, { status: 400 });
  }
  if (typeof submitterName !== "string" || typeof description !== "string" || !submitterName || !description) {
    return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
  }

  const project = await getProject(id);
  if (!project || !isPublicStage(project.stage as Stage)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let attachmentFileName: string | undefined;
  let attachmentStoragePath: string | undefined;
  if (attachment instanceof File && attachment.size > 0) {
    const buffer = Buffer.from(await attachment.arrayBuffer());
    const saved = await saveFile(buffer, {
      projectId: id,
      category: "GRIEVANCE",
      fileName: attachment.name,
    });
    attachmentFileName = attachment.name;
    attachmentStoragePath = saved.storagePath;
  }

  const trackingNumber = await createGrievance({
    type: type as GrievanceType,
    projectId: id,
    submitterName,
    submitterContact: typeof submitterContact === "string" ? submitterContact : undefined,
    description,
    attachmentFileName,
    attachmentStoragePath,
  });

  return NextResponse.json({ trackingNumber }, { status: 201 });
}
