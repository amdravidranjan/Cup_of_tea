import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompensationsForProject } from "@/db/compensation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const list = await listCompensationsForProject(id);
  return NextResponse.json({ compensations: list });
}
