/**
 * Centralised tile URL constants — every map component imports from here
 * rather than hardcoding tile provider URLs, so switching between local
 * (offline) and remote tiles is a single-file change.
 *
 * The precache-tiles.mjs script downloads tiles into public/tiles/ which
 * Next.js serves as static files. The OFFLINE_TILE_URL pattern points at
 * those local files. The ONLINE fallbacks exist for areas outside the
 * pre-cached bounding boxes.
 */

// ── Satellite imagery ───────────────────────────────────────────────
// Local tiles served from public/tiles/ (downloaded by scripts/precache-tiles.mjs)
export const OFFLINE_TILE_URL = "/tiles/{z}/{x}/{y}.jpg";

// Esri World Imagery: free, keyless satellite/aerial basemap
export const ONLINE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

// Use offline tiles when available, falling back to online
export const SATELLITE_TILE_URL = OFFLINE_TILE_URL;

// ── Terrain DEM ─────────────────────────────────────────────────────
// AWS Open Data Terrain Tiles: free, keyless, Terrarium-encoded raster-DEM
export const TERRAIN_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
export const TERRAIN_MAX_ZOOM = 15;

// ── Vector basemap ──────────────────────────────────────────────────
export const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// ── Satellite tile source config (shared by all map components) ─────
export const SATELLITE_SOURCE_CONFIG = {
  type: "raster" as const,
  tiles: [SATELLITE_TILE_URL],
  tileSize: 256,
  minzoom: 0,
  maxzoom: 19,
  attribution: "Esri, Maxar, Earthstar Geographics",
};

// ── Terrain DEM source config ───────────────────────────────────────
export const TERRAIN_SOURCE_CONFIG = {
  type: "raster-dem" as const,
  tiles: [TERRAIN_TILE_URL],
  tileSize: 256,
  maxzoom: TERRAIN_MAX_ZOOM,
  encoding: "terrarium" as const,
  attribution: "AWS Open Data Terrain Tiles",
};

/**
 * All 15 seed project bounding boxes — used by the precache script to
 * know which tile regions to download. Each entry is [minLng, minLat,
 * maxLng, maxLat] with a small buffer.
 */
export const PROJECT_BBOXES: [string, [number, number, number, number]][] = [
  // 1. Koraput Bridge
  ["koraput-bridge", [82.60, 18.71, 82.63, 18.73]],
  // 2. Chennai-Salem Expressway (Krishnagiri stretch)
  ["chennai-salem", [78.34, 12.26, 78.50, 12.55]],
  // 3. Chennai Metro Phase 2 (Poonamallee)
  ["chennai-metro", [80.05, 13.02, 80.17, 13.06]],
  // 4. CVG Link Canal (Sivaganga)
  ["cvg-canal", [78.48, 9.82, 78.50, 9.89]],
  // 5. Ennore-Kattupalli Port Corridor
  ["ennore-kattupalli", [80.31, 13.22, 80.35, 13.32]],
  // 6. Coimbatore-Sathyamangalam Bypass
  ["coimbatore-bypass", [76.95, 10.99, 77.28, 11.56]],
  // 7. SIPCOT Perambalur
  ["sipcot-perambalur", [78.87, 11.28, 78.94, 11.41]],
  // 8. Bengaluru PRR
  ["bengaluru-prr", [77.38, 13.09, 77.77, 13.22]],
  // 9. Madurai Metro
  ["madurai-metro", [78.11, 9.92, 78.13, 9.94]],
  // 10. Trichy Airport
  ["trichy-airport", [78.70, 10.75, 78.73, 10.78]],
  // 11. Tuticorin Rail
  ["tuticorin-rail", [78.15, 8.74, 78.19, 8.79]],
  // 12. Salem Steel Plant
  ["salem-steel", [78.10, 11.65, 78.13, 11.68]],
  // 13. Vellore Pipeline
  ["vellore-pipeline", [79.12, 12.90, 79.15, 12.93]],
  // 14. Thanjavur Solar Park
  ["thanjavur-solar", [79.04, 10.71, 79.08, 10.75]],
  // 15. Kanchipuram IT Corridor
  ["kanchipuram-it", [79.71, 12.81, 79.77, 12.86]],
];
