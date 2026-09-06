#!/usr/bin/env node
/**
 * Pre-downloads satellite tiles for all 15 seed project bounding boxes
 * into public/tiles/{z}/{x}/{y}.jpg. Maps then load from these local files
 * for offline capability.
 *
 * Usage:
 *   node scripts/precache-tiles.mjs [--min-zoom 10] [--max-zoom 16]
 *
 * Tiles are downloaded from Esri World Imagery (free, keyless). Each tile
 * is ~15-40 KB so the total cache is roughly 50-150 MB for 15 bboxes at
 * z10-z16.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

// ── Project bounding boxes (from tile-cache.ts) ─────────────────────
const PROJECT_BBOXES = [
  ["koraput-bridge", [82.75, 18.72, 82.78, 18.75]],
  ["chennai-salem", [78.34, 12.26, 78.50, 12.55]],
  ["chennai-metro", [80.05, 13.02, 80.17, 13.06]],
  ["cvg-canal", [78.48, 9.82, 78.50, 9.89]],
  ["ennore-kattupalli", [80.31, 13.22, 80.35, 13.32]],
  ["coimbatore-bypass", [76.95, 10.99, 77.28, 11.56]],
  ["sipcot-perambalur", [78.87, 11.28, 78.94, 11.41]],
  ["bengaluru-prr", [77.38, 13.09, 77.77, 13.22]],
  ["madurai-metro", [78.11, 9.92, 78.13, 9.94]],
  ["trichy-airport", [78.70, 10.75, 78.73, 10.78]],
  ["tuticorin-rail", [78.15, 8.74, 78.19, 8.79]],
  ["salem-steel", [78.10, 11.65, 78.13, 11.68]],
  ["vellore-pipeline", [79.12, 12.90, 79.15, 12.93]],
  ["thanjavur-solar", [79.04, 10.71, 79.08, 10.75]],
  ["kanchipuram-it", [79.71, 12.81, 79.77, 12.86]],
];

const ESRI_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";
const TILES_DIR = join(process.cwd(), "public", "tiles");

// Parse CLI args
const args = process.argv.slice(2);
let MIN_ZOOM = 10;
let MAX_ZOOM = 16;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--min-zoom" && args[i + 1]) MIN_ZOOM = parseInt(args[i + 1]);
  if (args[i] === "--max-zoom" && args[i + 1]) MAX_ZOOM = parseInt(args[i + 1]);
}

// ── Tile math ───────────────────────────────────────────────────────
function lngToTileX(lng, zoom) {
  return Math.floor(((lng + 180) / 360) * (1 << zoom));
}

function latToTileY(lat, zoom) {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      (1 << zoom)
  );
}

function tileCountForBbox(bbox, zoom) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const x1 = lngToTileX(minLng, zoom);
  const x2 = lngToTileX(maxLng, zoom);
  const y1 = latToTileY(maxLat, zoom); // Note: y is inverted
  const y2 = latToTileY(minLat, zoom);
  return { x1, x2, y1, y2, count: (x2 - x1 + 1) * (y2 - y1 + 1) };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🗺️  Precaching satellite tiles for ${PROJECT_BBOXES.length} projects`);
  console.log(`   Zoom range: z${MIN_ZOOM}–z${MAX_ZOOM}`);
  console.log(`   Output dir: ${TILES_DIR}\n`);

  // Count total tiles
  let totalTiles = 0;
  for (const [, bbox] of PROJECT_BBOXES) {
    for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
      totalTiles += tileCountForBbox(bbox, z).count;
    }
  }
  console.log(`   Total tiles to check: ${totalTiles}\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [name, bbox] of PROJECT_BBOXES) {
    console.log(`📍 ${name}`);
    for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
      const { x1, x2, y1, y2 } = tileCountForBbox(bbox, z);
      for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
          const tilePath = join(TILES_DIR, String(z), String(x), `${y}.jpg`);

          // Skip if already cached (resume support)
          if (existsSync(tilePath)) {
            skipped++;
            continue;
          }

          // Ensure directory exists
          const dir = dirname(tilePath);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

          // Download from Esri
          const url = `${ESRI_TILE_URL}/${z}/${y}/${x}`;
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) {
              failed++;
              continue;
            }
            const buffer = Buffer.from(await res.arrayBuffer());
            writeFileSync(tilePath, buffer);
            downloaded++;

            // Rate limiting: 50ms between requests to be respectful
            await new Promise((r) => setTimeout(r, 50));
          } catch {
            failed++;
          }

          // Progress
          const total = downloaded + skipped + failed;
          if (total % 50 === 0) {
            process.stdout.write(
              `\r   z${z}: ${downloaded} downloaded, ${skipped} cached, ${failed} failed (${total}/${totalTiles})`
            );
          }
        }
      }
    }
    console.log();
  }

  console.log(`\n✅ Done!`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Already cached: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total tiles: ${downloaded + skipped}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
