import { NextRequest, NextResponse } from "next/server";
import { getGrievanceByTrackingNumber } from "@/db/grievances";
import { readStoredFile } from "@/lib/storage";

// Same access model as the grievance record itself: the tracking number
// is the access token (no session required), matching real RTI-portal
// patterns — knowledge of the number is what authorizes access, for both
// the original submitter and reviewing officials.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await params;
  const grievance = await getGrievanceByTrackingNumber(trackingNumber);
  if (!grievance || !grievance.attachmentStoragePath || !grievance.attachmentFileName) {
    return NextResponse.json({ error: "No attachment found" }, { status: 404 });
  }
  const buffer = await readStoredFile(grievance.attachmentStoragePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${grievance.attachmentFileName}"`,
    },
  });
}
