import { NextRequest, NextResponse } from "next/server";
import { getGrievanceByTrackingNumber } from "@/db/grievances";

// Public, no-login lookup — the tracking number itself is the access
// token (matches how real RTI/grievance portals work: no account, just
// the number you were given when you filed).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await params;
  const grievance = await getGrievanceByTrackingNumber(trackingNumber);
  if (!grievance) {
    return NextResponse.json({ error: "No grievance found for that tracking number" }, { status: 404 });
  }
  return NextResponse.json({ grievance });
}
