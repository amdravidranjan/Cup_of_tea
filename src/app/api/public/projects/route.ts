import { NextResponse } from "next/server";
import { listPublicProjects } from "@/db/public";

/**
 * Open, unauthenticated data API — for the public, researchers, students,
 * or anyone building on top of this system's public transparency data.
 * Mirrors exactly what the public portal itself shows: no family/grievance
 * PII, aggregate figures only. Documented at /developers.
 */
export async function GET() {
  const projects = await listPublicProjects();
  return NextResponse.json({ projects });
}
