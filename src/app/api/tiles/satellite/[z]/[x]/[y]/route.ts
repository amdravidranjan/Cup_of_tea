import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// 1x1 solid satellite terrain earth tone PNG buffer (#253428) returned instead of transparent/404
// so browser image decoder never fails and terrain never renders as a white blank hole
const TERRAIN_FALLBACK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWNQNdH4DwAChAGBXuefPwAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const cleanY = y.replace(/\.(jpg|jpeg|png)$/, "");
  const cleanX = x.replace(/\.(jpg|jpeg|png)$/, "");

  // 1. Always attempt live online load first from Esri World Imagery
  // Note: Esri REST API tile format is {z}/{y}/{x}
  const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${cleanY}/${cleanX}`;

  try {
    const onlineRes = await fetch(esriUrl, {
      signal: AbortSignal.timeout(3000), // 3-second fast timeout
      headers: { Accept: "image/*" },
    });

    if (onlineRes.ok) {
      const contentType = onlineRes.headers.get("content-type") || "image/jpeg";
      if (contentType.includes("image")) {
        const buffer = await onlineRes.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    }
  } catch {
    // Network offline or live request timed out — fall through to local resources
  }

  // 2. Fallback to downloaded offline resources in public/tiles/{z}/{x}/{y}.jpg
  const localTilePath = join(process.cwd(), "public", "tiles", z, cleanX, `${cleanY}.jpg`);
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

  // 3. If tile is not on disk at zoom z (e.g. client zoomed past z16), traverse up
  // the tile tree to serve the nearest real parent tile from disk. This ensures
  // the map displays real imagery rather than empty blank squares.
  const intZ = parseInt(z, 10);
  const intX = parseInt(cleanX, 10);
  const intY = parseInt(cleanY, 10);

  if (!Number.isNaN(intZ) && !Number.isNaN(intX) && !Number.isNaN(intY)) {
    let currZ = intZ - 1;
    let currX = Math.floor(intX / 2);
    let currY = Math.floor(intY / 2);

    while (currZ >= 10) {
      const parentPath = join(
        process.cwd(),
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

  // 4. Neither online, local, nor parent tile exists (e.g. outside all bounding boxes)
  // Return earth-tone PNG so image decoder never crashes
  return new NextResponse(TERRAIN_FALLBACK_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
