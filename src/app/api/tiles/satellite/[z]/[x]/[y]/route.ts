import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

// 1x1 fully transparent PNG buffer. When returned for missing/out-of-bounds tiles,
// the browser image decoder succeeds with zero errors, and MapLibre never renders
// opaque dark-green or black blocks over the landscape.
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const cleanY = y.replace(/\.(jpg|jpeg|png)$/, "");
  const cleanX = x.replace(/\.(jpg|jpeg|png)$/, "");
  const intZ = parseInt(z, 10);
  const intX = parseInt(cleanX, 10);
  const intY = parseInt(cleanY, 10);

  // 1. FAST PATH: Check local offline pre-cached disk first (0ms latency, works offline)
  const localTilePath = join(/*turbopackIgnore: true*/ process.cwd(), "public", "tiles", z, cleanX, `${cleanY}.jpg`);
  if (existsSync(localTilePath)) {
    try {
      const localBuffer = readFileSync(localTilePath);
      return new NextResponse(localBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
          "X-Tile-Source": "offline-cache",
        },
      });
    } catch {
      // Fall through if file read fails
    }
  }

  // 2. PARENT TILE LOOKUP: If tile is not on disk at zoom z (e.g. client zoomed past z16 or between bboxes),
  // search up the pyramid (z-1 down to z8) to serve the nearest real parent tile from disk.
  if (!Number.isNaN(intZ) && !Number.isNaN(intX) && !Number.isNaN(intY)) {
    let currZ = intZ - 1;
    let currX = Math.floor(intX / 2);
    let currY = Math.floor(intY / 2);

    while (currZ >= 8) {
      const parentPath = join(
        /*turbopackIgnore: true*/ process.cwd(),
        "public",
        "tiles",
        String(currZ),
        String(currX),
        `${currY}.jpg`
      );
      if (existsSync(parentPath)) {
        try {
          const parentBuffer = readFileSync(parentPath);
          return new NextResponse(parentBuffer, {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=86400",
              "X-Tile-Source": `offline-parent-z${currZ}`,
            },
          });
        } catch {
          // Continue searching up
        }
      }
      currZ -= 1;
      currX = Math.floor(currX / 2);
      currY = Math.floor(currY / 2);
    }
  }

  // 3. LIVE ONLINE FETCH: Attempt fast fetch from Esri World Imagery (for areas outside precache)
  // Note: Esri REST API tile format is {z}/{y}/{x}
  const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${cleanY}/${cleanX}`;

  try {
    const onlineRes = await fetch(esriUrl, {
      signal: AbortSignal.timeout(2500),
      headers: { Accept: "image/*" },
    });

    if (onlineRes.ok) {
      const contentType = onlineRes.headers.get("content-type") || "image/jpeg";
      if (contentType.includes("image")) {
        const buffer = await onlineRes.arrayBuffer();
        const nodeBuffer = Buffer.from(buffer);

        // Auto-cache to local disk in background for offline use
        try {
          mkdirSync(dirname(localTilePath), { recursive: true });
          writeFileSync(localTilePath, nodeBuffer);
        } catch {}

        return new NextResponse(nodeBuffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    }
  } catch {
    // Network offline or timeout
  }

  // 4. TRANSPARENT FALLBACK: Return 100% transparent 1x1 PNG.
  // Never return an opaque colored block so the landscape is never covered or hidden.
  return new NextResponse(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
