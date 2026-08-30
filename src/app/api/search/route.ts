import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { search } from "@/db/search";
import { projectScopeFor } from "@/lib/project-scope";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = await search(query, projectScopeFor(session));
  return NextResponse.json(results);
}
