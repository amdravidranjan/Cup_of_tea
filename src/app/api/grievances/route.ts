import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listGrievances } from "@/db/grievances";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "grievance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Mirrors the scoping in /app/grievances/page.tsx — keep both in sync.
  const filter =
    session.role === "state"
      ? { state: session.state }
      : session.role === "district"
        ? { district: session.district }
        : undefined;
  const grievances = await listGrievances(filter);
  return NextResponse.json({ grievances });
}
