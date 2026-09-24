import { NextRequest, NextResponse } from "next/server";
import { DEMO_REGION_COOKIE, regionById } from "@/lib/demo/regions";
import { buildKitFile, type KitKind } from "@/lib/demo/kit";

export const runtime = "nodejs";

const KINDS: KitKind[] = ["fmb", "patta", "errors"];

/**
 * Serves the land-record file the walkthrough asks the judge to upload.
 *
 * Built per request rather than shipped, because the records have to match
 * the region the visitor's demo project was sited in — a Kannada walkthrough
 * uploading Tamil village names would give the whole thing away.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  if (!KINDS.includes(kind as KitKind)) {
    return NextResponse.json({ error: `Unknown kit file: ${kind}` }, { status: 404 });
  }

  const region = regionById(request.cookies.get(DEMO_REGION_COOKIE)?.value);
  const file = await buildKitFile(region, kind as KitKind);

  return new NextResponse(file.body as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
