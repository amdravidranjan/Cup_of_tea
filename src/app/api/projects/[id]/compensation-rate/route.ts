import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProject } from "@/db/projects";
import { getCurrentCompensationRate, setCompensationRate } from "@/db/compensation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rate = await getCurrentCompensationRate(project.state, project.district);
  return NextResponse.json({ rate });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "compensation:manage-rate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { ratePerHectare?: number; multiplier?: number };
  if (typeof body.ratePerHectare !== "number" || typeof body.multiplier !== "number") {
    return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
  }
  const rateId = await setCompensationRate({
    state: project.state,
    district: project.district,
    ratePerHectare: body.ratePerHectare,
    multiplier: body.multiplier,
    setBy: session.userId,
  });
  return NextResponse.json({ id: rateId }, { status: 201 });
}
