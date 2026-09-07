import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import sharp from "sharp";

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
  const localTilePath = join(process.cwd(), "public", "tiles", z, cleanX, `${cleanY}.jpg`);

  if (existsSync(localTilePath)) {
    try {
      return new NextResponse(readFileSync(localTilePath), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
          "X-Tile-Source": "offline-cache",
        },
      });
    } catch {
      // Fall through to parent and online lookup.
    }
  }

  if (!Number.isNaN(intZ) && !Number.isNaN(intX) && !Number.isNaN(intY)) {
    let currZ = intZ - 1;
    let currX = Math.floor(intX / 2);
    let currY = Math.floor(intY / 2);
    let levels = 1;

    while (currZ >= Math.max(8, intZ - 6)) {
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
          const scale = 2 ** levels;
          const cropSize = Math.max(1, Math.floor(256 / scale));
          const offsetX = Math.min(256 - cropSize, (intX - currX * scale) * cropSize);
          const offsetY = Math.min(256 - cropSize, (intY - currY * scale) * cropSize);
          const cropped = await sharp(parentBuffer)
            .extract({ left: offsetX, top: offsetY, width: cropSize, height: cropSize })
            .resize(256, 256, { kernel: "cubic" })
            .jpeg({ quality: 80 })
            .toBuffer();
          return new NextResponse(new Uint8Array(cropped), {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=86400",
              "X-Tile-Source": `offline-parent-z${currZ}-cropped`,
            },
          });
        } catch {
          // Continue searching up.
        }
      }
      currZ -= 1;
      currX = Math.floor(currX / 2);
      currY = Math.floor(currY / 2);
      levels += 1;
    }
  }

  const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${cleanY}/${cleanX}`;
  try {
    const onlineRes = await fetch(esriUrl, {
      signal: AbortSignal.timeout(2500),
      headers: { Accept: "image/*" },
    });
    if (onlineRes.ok) {
      const contentType = onlineRes.headers.get("content-type") || "image/jpeg";
      if (contentType.includes("image")) {
        const nodeBuffer = Buffer.from(await onlineRes.arrayBuffer());
        try {
          mkdirSync(dirname(localTilePath), { recursive: true });
          writeFileSync(localTilePath, nodeBuffer);
        } catch {
          // Caching is best effort.
        }
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
    // Network offline or timeout.
  }

  return new NextResponse(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
