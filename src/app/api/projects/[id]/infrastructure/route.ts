import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureInfrastructureChecklist, listInfrastructureChecklist } from "@/db/infrastructure";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await ensureInfrastructureChecklist(id);
  const items = await listInfrastructureChecklist(id);
  return NextResponse.json({ items });
}
