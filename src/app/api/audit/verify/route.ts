import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { verifyAuditLog } from "@/db/audit";

/**
 * Re-derives every hash in the ledger and reports whether the chain holds.
 *
 * This is the claim made good: the trail is not merely a table someone could
 * quietly UPDATE, it is a chain that says so when they have. Deliberately
 * unfiltered — a slice of the chain cannot be verified, because it has a
 * predecessor it cannot see.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "audit:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await verifyAuditLog());
}
