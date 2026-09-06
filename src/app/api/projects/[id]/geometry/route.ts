import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProject, setProjectGeometry } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { recordAudit, withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import type { Geometry } from "@/lib/geo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:geometry:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as Partial<Geometry>;
  if (
    (body.type !== "LineString" && body.type !== "Polygon") ||
    !Array.isArray(body.coordinates)
  ) {
    return NextResponse.json({ error: "Invalid geometry" }, { status: 400 });
  }
  const geometry = body as Geometry;
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "UPDATE",
      entityType: "PROJECT",
      entityId: id,
      projectId: id,
      summary: `Redrew the project alignment (${geometry.type}, ${geometry.coordinates.length} vertices)`,
      reason: "Alignment edited on the map",
      ip: clientIp(request),
      loadBefore: async () => ({
        geometryType: project.geometryType ?? null,
        geometryGeoJson: project.geometryGeoJson ?? null,
      }),
      loadAfter: async () => {
        const updated = await getProject(id);
        return {
          geometryType: updated?.geometryType ?? null,
          geometryGeoJson: updated?.geometryGeoJson ?? null,
        };
      },
    },
    () => setProjectGeometry(id, geometry)
  );
  return NextResponse.json({ ok: true });
}
