/**
 * Fetches real-world geographic features (roads, waterways, field
 * boundaries) from OpenStreetMap via the Overpass API. Used **only at
 * seed time** (`npm run db:seed`) to shape parcel boundaries along real
 * land features — the runtime app never contacts OSM.
 *
 * Results are cached on disk under `scripts/.osm-cache/` so repeated
 * seed runs don't re-download the same data.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const CACHE_DIR = resolve(process.cwd(), "scripts", ".osm-cache");

export interface OSMWay {
  id: number;
  /** Ordered [lng, lat] coordinates */
  coordinates: [number, number][];
  tags: Record<string, string>;
}

export interface OSMFeatures {
  roads: OSMWay[];
  waterways: OSMWay[];
  boundaries: OSMWay[];
}

function cacheKey(bbox: [number, number, number, number]): string {
  return bbox.map((n) => n.toFixed(5)).join("_");
}

/**
 * Fetches roads, waterways, and barriers within a bounding box from OSM.
 * Returns the features grouped by type. Gracefully returns empty results
 * on network failure so the seed can continue with fallback parcel shapes.
 */
export async function fetchOSMFeatures(
  bbox: [number, number, number, number]
): Promise<OSMFeatures> {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  const key = cacheKey(bbox);
  const cachePath = join(CACHE_DIR, `${key}.json`);

  // Return cached data if available
  if (existsSync(cachePath)) {
    try {
      return JSON.parse(readFileSync(cachePath, "utf-8")) as OSMFeatures;
    } catch {
      // Corrupt cache — re-fetch
    }
  }

  // Overpass bbox format: south,west,north,east (lat/lon)
  const [west, south, east, north] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;
  const query = `
    [out:json][timeout:25];
    (
      way["highway"](${bboxStr});
      way["waterway"](${bboxStr});
      way["barrier"](${bboxStr});
      way["natural"="water"](${bboxStr});
      way["landuse"="farmland"](${bboxStr});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const res = await fetch(OVERPASS_API, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`  Overpass returned ${res.status} for bbox ${bboxStr} — using fallback parcel shapes`);
      return { roads: [], waterways: [], boundaries: [] };
    }

    const data = (await res.json()) as {
      elements: Array<{
        type: string;
        id: number;
        nodes?: number[];
        lat?: number;
        lon?: number;
        tags?: Record<string, string>;
      }>;
    };

    // Build node lookup
    const nodes = new Map<number, [number, number]>();
    for (const el of data.elements) {
      if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
        nodes.set(el.id, [el.lon, el.lat]);
      }
    }

    // Extract ways
    const roads: OSMWay[] = [];
    const waterways: OSMWay[] = [];
    const boundaries: OSMWay[] = [];

    for (const el of data.elements) {
      if (el.type !== "way" || !el.nodes || !el.tags) continue;
      const coords = el.nodes
        .map((nid) => nodes.get(nid))
        .filter((c): c is [number, number] => c !== undefined);
      if (coords.length < 2) continue;

      const way: OSMWay = { id: el.id, coordinates: coords, tags: el.tags };

      if (el.tags.highway) roads.push(way);
      else if (el.tags.waterway || el.tags.natural === "water") waterways.push(way);
      else boundaries.push(way);
    }

    const result: OSMFeatures = { roads, waterways, boundaries };

    // Cache to disk
    try {
      writeFileSync(cachePath, JSON.stringify(result), "utf-8");
    } catch {
      // Non-critical — just means next run will re-fetch
    }

    console.log(
      `  OSM features fetched: ${roads.length} roads, ${waterways.length} waterways, ${boundaries.length} boundaries`
    );
    return result;
  } catch (err) {
    console.warn(
      `  OSM fetch failed for bbox ${bboxStr}: ${(err as Error).message} — using fallback parcel shapes`
    );
    return { roads: [], waterways: [], boundaries: [] };
  }
}

/**
 * Given a corridor (line) and its buffer width, finds OSM features that
 * cross the corridor and returns their intersection points as candidate
 * parcel boundary edges. These are positions along the corridor's length
 * where real-world features (roads, canals, field edges) naturally divide
 * the land into parcels.
 */
export function findCorridorCrossings(
  corridorCoords: [number, number][],
  bufferMeters: number,
  features: OSMFeatures
): number[] {
  const allWays = [...features.roads, ...features.waterways, ...features.boundaries];
  if (allWays.length === 0 || corridorCoords.length < 2) return [];

  // Simplified approach: find where OSM ways cross roughly perpendicular
  // to the corridor. We measure the fraction along the corridor's total
  // length where each crossing occurs.
  const crossings: number[] = [];

  // Compute cumulative distances along the corridor
  const cumDist: number[] = [0];
  for (let i = 1; i < corridorCoords.length; i++) {
    const [x1, y1] = corridorCoords[i - 1];
    const [x2, y2] = corridorCoords[i];
    const d = Math.sqrt(
      ((x2 - x1) * Math.cos(((y1 + y2) / 2 * Math.PI) / 180)) ** 2 +
      (y2 - y1) ** 2
    ) * 111320; // approximate meters
    cumDist.push(cumDist[i - 1] + d);
  }
  const totalDist = cumDist[cumDist.length - 1];
  if (totalDist === 0) return [];

  for (const way of allWays) {
    for (let w = 0; w < way.coordinates.length - 1; w++) {
      const [wx1, wy1] = way.coordinates[w];
      const [wx2, wy2] = way.coordinates[w + 1];

      for (let c = 0; c < corridorCoords.length - 1; c++) {
        const [cx1, cy1] = corridorCoords[c];
        const [cx2, cy2] = corridorCoords[c + 1];

        // Line-segment intersection
        const det =
          (cx2 - cx1) * (wy2 - wy1) - (cy2 - cy1) * (wx2 - wx1);
        if (Math.abs(det) < 1e-12) continue;

        const t =
          ((wx1 - cx1) * (wy2 - wy1) - (wy1 - cy1) * (wx2 - wx1)) / det;
        const u =
          ((wx1 - cx1) * (cy2 - cy1) - (wy1 - cy1) * (cx2 - cx1)) / det;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          // Crossing found — record its position along the corridor
          const alongMeters = cumDist[c] + t * (cumDist[c + 1] - cumDist[c]);
          crossings.push(alongMeters);
        }
      }
    }
  }

  // Deduplicate crossings that are very close together (< 15m)
  crossings.sort((a, b) => a - b);
  const deduped: number[] = [];
  for (const c of crossings) {
    if (deduped.length === 0 || c - deduped[deduped.length - 1] > 15) {
      deduped.push(c);
    }
  }

  return deduped;
}

/**
 * For grid (polygon) parcels: finds OSM road segments within the polygon
 * and returns them as line segments that can be used as natural parcel
 * edges instead of a regular grid.
 */
export function findGridEdges(
  features: OSMFeatures
): [number, number][][] {
  const allWays = [...features.roads, ...features.waterways, ...features.boundaries];
  return allWays.map((w) => w.coordinates);
}
