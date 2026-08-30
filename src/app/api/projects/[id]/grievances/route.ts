import { NextRequest, NextResponse } from "next/server";
import { createGrievance } from "@/db/grievances";
import { getProject } from "@/db/projects";
import { isPublicStage } from "@/db/public";
import type { Stage } from "@/lib/workflow";
import type { GrievanceType } from "@/lib/grievance-workflow";

const GRIEVANCE_TYPES: GrievanceType[] = ["COMPENSATION_DISPUTE", "GENERAL_GRIEVANCE"];

interface FileGrievanceBody {
  type?: GrievanceType;
  submitterName?: string;
  submitterContact?: string;
  description?: string;
}

// Intentionally no session check — this is the public, no-login filing
// endpoint (any citizen affected by a notified project can file, per the
// parent spec's public-portal design; matches how the public detail page
// itself requires no auth).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as FileGrievanceBody;

  if (!body.type || !GRIEVANCE_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Invalid grievance type" }, { status: 400 });
  }
  if (!body.submitterName || !body.description) {
    return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
  }

  const project = await getProject(id);
  if (!project || !isPublicStage(project.stage as Stage)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const trackingNumber = await createGrievance({
    type: body.type,
    projectId: id,
    submitterName: body.submitterName,
    submitterContact: body.submitterContact,
    description: body.description,
  });

  return NextResponse.json({ trackingNumber }, { status: 201 });
}
