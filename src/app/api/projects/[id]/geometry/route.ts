import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { setProjectGeometry } from "@/db/projects";
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
  const body = (await request.json()) as Partial<Geometry>;
  if (
    (body.type !== "LineString" && body.type !== "Polygon") ||
    !Array.isArray(body.coordinates)
  ) {
    return NextResponse.json({ error: "Invalid geometry" }, { status: 400 });
  }
  await setProjectGeometry(id, body as Geometry);
  return NextResponse.json({ ok: true });
}
