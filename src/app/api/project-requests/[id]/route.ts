import { NextRequest, NextResponse } from "next/server";
import { getProjectRequestById } from "@/db/project-requests";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const req = await getProjectRequestById(id);
  if (!req) {
    return NextResponse.json({ error: "No request found for that tracking number" }, { status: 404 });
  }
  return NextResponse.json({ request: req });
}
