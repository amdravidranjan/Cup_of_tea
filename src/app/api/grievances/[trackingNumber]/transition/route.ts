import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getGrievanceByTrackingNumber, transitionGrievanceStatus } from "@/db/grievances";
import type { GrievanceAction, GrievanceResolution } from "@/lib/grievance-workflow";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

interface TransitionBody {
  action?: GrievanceAction;
  resolution?: GrievanceResolution;
  resolutionNote?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "grievance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { trackingNumber } = await params;
  const body = (await request.json()) as TransitionBody;
  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  if (body.action === "RESOLVE" && !body.resolution) {
    return NextResponse.json({ error: "Resolution is required to resolve a grievance" }, { status: 400 });
  }

  const grievance = await getGrievanceByTrackingNumber(trackingNumber);
  if (!grievance) {
    return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
  }

  try {
    const action = body.action;
    const status = await withAudit(
      {
        actor: { userId: session.userId, role: session.role },
        action: action === "RESOLVE" ? "APPROVE" : "STATUS_CHANGE",
        entityType: "GRIEVANCE",
        entityId: grievance.id,
        projectId: grievance.projectId,
        summary: `${action} on grievance ${grievance.trackingNumber}`,
        reason: body.resolutionNote ?? null,
        ip: clientIp(request),
        loadBefore: async () => ({ status: grievance.status, resolution: grievance.resolution ?? null }),
        loadAfter: async () => {
          const updated = await getGrievanceByTrackingNumber(trackingNumber);
          return { status: updated?.status ?? null, resolution: updated?.resolution ?? null };
        },
      },
      () =>
        transitionGrievanceStatus(
          grievance.id,
          action,
          session.role,
          session.userId,
          body.resolution ? { resolution: body.resolution, resolutionNote: body.resolutionNote } : undefined
        )
    );
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
