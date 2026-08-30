import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { transitionGrievanceStatus } from "@/db/grievances";
import type { GrievanceAction, GrievanceResolution } from "@/lib/grievance-workflow";

interface TransitionBody {
  action?: GrievanceAction;
  resolution?: GrievanceResolution;
  resolutionNote?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "grievance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as TransitionBody;
  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  if (body.action === "RESOLVE" && !body.resolution) {
    return NextResponse.json({ error: "Resolution is required to resolve a grievance" }, { status: 400 });
  }

  try {
    const status = await transitionGrievanceStatus(
      id,
      body.action,
      session.role,
      session.userId,
      body.resolution ? { resolution: body.resolution, resolutionNote: body.resolutionNote } : undefined
    );
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
