import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listContractors } from "@/db/tenders";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contractors = await listContractors();
  return NextResponse.json({ contractors });
}
