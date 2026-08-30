import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listGrievances } from "@/db/grievances";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filter = session.role === "state" ? { state: session.state } : undefined;
  const grievances = await listGrievances(filter);
  return NextResponse.json({ grievances });
}
