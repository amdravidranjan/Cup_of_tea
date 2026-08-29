import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { advanceParcelStatus } from "@/db/parcels";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ parcelId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "parcel:update-status")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { parcelId } = await params;
  try {
    const status = await advanceParcelStatus(parcelId);
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
