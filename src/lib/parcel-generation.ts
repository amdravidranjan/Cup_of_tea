import type { LineGeometry, PolygonGeometry, Position } from "./geo";

export interface GeneratedParcel {
  village: string;
  areaHectares: number;
  geometry: PolygonGeometry;
}

// Deterministic PRNG (mulberry32) so seed data is reproducible across
// `npm run db:seed` runs — no reliance on Math.random().
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EARTH_RADIUS_M = 6371000;
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

interface LocalPoint {
  x: number;
  y: number;
}

function toLocalMeters(point: Position, origin: Position): LocalPoint {
  const [lng, lat] = point;
  const [lng0, lat0] = origin;
  return {
    x: toRad(lng - lng0) * EARTH_RADIUS_M * Math.cos(toRad(lat0)),
    y: toRad(lat - lat0) * EARTH_RADIUS_M,
  };
}

function fromLocalMeters(p: LocalPoint, origin: Position): Position {
  const [lng0, lat0] = origin;
  const lng = lng0 + toDeg(p.x / (EARTH_RADIUS_M * Math.cos(toRad(lat0))));
  const lat = lat0 + toDeg(p.y / EARTH_RADIUS_M);
  return [lng, lat];
}

function dist(a: LocalPoint, b: LocalPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function sub(a: LocalPoint, b: LocalPoint): LocalPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}
function add(a: LocalPoint, b: LocalPoint): LocalPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}
function scale(a: LocalPoint, s: number): LocalPoint {
  return { x: a.x * s, y: a.y * s };
}
function normalize(a: LocalPoint): LocalPoint {
  const len = Math.hypot(a.x, a.y);
  return len === 0 ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
}

function villageForFraction(villages: string[], fraction: number): string {
  const index = Math.min(villages.length - 1, Math.floor(fraction * villages.length));
  return villages[index];
}

function closeRing(ring: Position[]): Position[] {
  return [...ring, ring[0]];
}

export interface CorridorOptions {
  rowWidthMeters: number;
  minSegmentMeters: number;
  maxSegmentMeters: number;
  villages: string[];
  seed?: number;
  /**
   * Positions along the corridor (in meters from start) where real-world
   * features (roads, waterways) cross — provided by osm-features.ts at
   * seed time. When present, these replace the random segment lengths
   * so parcel boundaries align with actual land features.
   */
  osmCrossings?: number[];
}

/**
 * Generates a strip of narrow parcels along a linear alignment, each
 * spanning the full right-of-way width — the shape a real highway/canal
 * land acquisition actually takes (a ribbon of adjoining survey plots
 * along the route), not arbitrary boxes scattered near the line.
 *
 * When OSM crossings are provided, parcel edges are placed at real-world
 * feature locations (roads, canals, field boundaries) so the shapes look
 * authentic on the satellite map.
 */
export function generateCorridorParcels(
  line: LineGeometry,
  options: CorridorOptions
): GeneratedParcel[] {
  const coords = line.coordinates;
  if (coords.length < 2) return [];

  const origin = coords[0];
  const localPoints = coords.map((p) => toLocalMeters(p, origin));
  const segLengths: number[] = [];
  for (let i = 0; i < localPoints.length - 1; i++) {
    segLengths.push(dist(localPoints[i], localPoints[i + 1]));
  }
  const totalLength = segLengths.reduce((a, b) => a + b, 0);
  if (totalLength === 0) return [];

  function positionAt(along: number): { point: LocalPoint; dir: LocalPoint } {
    let remaining = along;
    for (let i = 0; i < segLengths.length; i++) {
      if (remaining <= segLengths[i] || i === segLengths.length - 1) {
        const t = segLengths[i] === 0 ? 0 : Math.min(1, remaining / segLengths[i]);
        const a = localPoints[i];
        const b = localPoints[i + 1];
        return {
          point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
          dir: normalize(sub(b, a)),
        };
      }
      remaining -= segLengths[i];
    }
    const last = localPoints[localPoints.length - 1];
    return { point: last, dir: { x: 1, y: 0 } };
  }

  const rng = mulberry32(options.seed ?? 1);
  const parcels: GeneratedParcel[] = [];

  // Build the list of cut positions along the corridor
  const cutPositions: number[] = [0]; // always start at 0

  if (options.osmCrossings && options.osmCrossings.length > 0) {
    // Use real-world crossings as primary cut positions
    for (const crossing of options.osmCrossings) {
      if (crossing > 10 && crossing < totalLength - 10) {
        cutPositions.push(crossing);
      }
    }
    // Fill in any gaps that are too large (> maxSegmentMeters)
    // with additional cuts so parcels don't become absurdly long
    const sorted = [...cutPositions].sort((a, b) => a - b);
    const filled: number[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > options.maxSegmentMeters * 1.5) {
        // Subdivide this gap
        const numCuts = Math.ceil(gap / options.maxSegmentMeters);
        const subStep = gap / numCuts;
        for (let j = 1; j < numCuts; j++) {
          filled.push(sorted[i - 1] + subStep * j);
        }
      }
      filled.push(sorted[i]);
    }
    // Add final position and fill gap to end
    const lastCut = filled[filled.length - 1];
    const endGap = totalLength - lastCut;
    if (endGap > options.maxSegmentMeters * 1.5) {
      const numCuts = Math.ceil(endGap / options.maxSegmentMeters);
      const subStep = endGap / numCuts;
      for (let j = 1; j < numCuts; j++) {
        filled.push(lastCut + subStep * j);
      }
    }
    filled.push(totalLength);

    // Rebuild cutPositions from filled
    cutPositions.length = 0;
    for (const pos of filled) cutPositions.push(pos);
  } else {
    // No OSM data — use random segment lengths (original behavior)
    let along = 0;
    while (along < totalLength) {
      const step =
        options.minSegmentMeters +
        rng() * (options.maxSegmentMeters - options.minSegmentMeters);
      along = Math.min(along + step, totalLength);
      cutPositions.push(along);
    }
    if (cutPositions[cutPositions.length - 1] < totalLength) {
      cutPositions.push(totalLength);
    }
  }

  // Remove duplicates and sort
  const uniqueCuts = [...new Set(cutPositions)].sort((a, b) => a - b);

  // Precompute shared cut vertices at each cut position along the corridor.
  // Adjacent parcels share the exact same boundary cut, guaranteeing ZERO OVERLAPS and ZERO GAPS.
  const cutVertices: { left: LocalPoint; right: LocalPoint }[] = [];
  const half = options.rowWidthMeters / 2;

  for (let i = 0; i < uniqueCuts.length; i++) {
    const pos = positionAt(uniqueCuts[i]);
    const perp = { x: -pos.dir.y, y: pos.dir.x };
    const leftDepth = half * (0.65 + rng() * 0.35);
    const rightDepth = half * (0.65 + rng() * 0.35);
    const angle = (rng() - 0.5) * 0.12; // ±~3.5° natural deviation
    const rotPerp = {
      x: perp.x * Math.cos(angle) - perp.y * Math.sin(angle),
      y: perp.x * Math.sin(angle) + perp.y * Math.cos(angle),
    };

    cutVertices.push({
      left: add(pos.point, scale(rotPerp, leftDepth)),
      right: add(pos.point, scale(rotPerp, -rightDepth)),
    });
  }

  // Generate parcels between consecutive cut positions
  for (let i = 0; i < uniqueCuts.length - 1; i++) {
    const along = uniqueCuts[i];
    const endAlong = uniqueCuts[i + 1];
    if (endAlong - along < 5) continue; // skip tiny slivers

    const startCut = cutVertices[i];
    const endCut = cutVertices[i + 1];

    // Shared corners: start left -> end left -> end right -> start right
    const corners: LocalPoint[] = [
      startCut.left,
      endCut.left,
      endCut.right,
      startCut.right,
    ];
    const ring = closeRing(corners.map((c) => fromLocalMeters(c, origin)));
    const areaHectares = shoelaceAreaHectares(corners);
    const village = villageForFraction(options.villages, along / totalLength);

    parcels.push({
      village,
      areaHectares,
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }

  return parcels;
}

function shoelaceAreaHectares(corners: LocalPoint[]): number {
  let twice = 0;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice / 2) / 10000;
}

function pointInPolygonLocal(point: LocalPoint, ring: LocalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export interface GridOptions {
  targetParcelHectares: number;
  villages: string[];
  seed?: number;
  /**
   * Real-world geographic edges (roads, waterways, field bunds) from
   * osm-features.ts at seed time. When present, these are used to shift
   * grid edges toward real land features so parcels look like actual
   * agricultural plots bounded by roads, paths, and field bunds.
   */
  osmEdges?: [number, number][][];
}

/**
 * Subdivides a polygon footprint into a grid of parcels sized around a
 * realistic average landholding, shaped by real-world edges when available.
 * Only cells whose centroid falls inside the polygon are kept, so this
 * also works for non-rectangular footprints.
 */
export function generateGridParcels(
  polygon: PolygonGeometry,
  options: GridOptions
): GeneratedParcel[] {
  const origin = polygon.coordinates[0][0];
  const ring = polygon.coordinates[0].map((p) => toLocalMeters(p, origin));
  const xs = ring.map((p) => p.x);
  const ys = ring.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cellSize = Math.sqrt(options.targetParcelHectares * 10000);
  const rng = mulberry32(options.seed ?? 1);
  const parcels: GeneratedParcel[] = [];

  // Convert OSM edges to local coordinates for snapping
  const localEdges: LocalPoint[][] = [];
  if (options.osmEdges) {
    for (const edge of options.osmEdges) {
      if (edge.length >= 2) {
        localEdges.push(edge.map((p) => toLocalMeters(p, origin)));
      }
    }
  }

  // Find the nearest OSM edge point to snap a grid vertex toward
  function snapToEdge(pt: LocalPoint, maxSnap: number): LocalPoint {
    if (localEdges.length === 0) return pt;
    let bestDist = Infinity;
    let bestPoint = pt;

    for (const edge of localEdges) {
      for (let i = 0; i < edge.length - 1; i++) {
        // Project pt onto the segment edge[i]→edge[i+1]
        const ax = edge[i].x, ay = edge[i].y;
        const bx = edge[i + 1].x, by = edge[i + 1].y;
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        let t = ((pt.x - ax) * dx + (pt.y - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const closest = { x: ax + t * dx, y: ay + t * dy };
        const d = dist(pt, closest);
        if (d < bestDist && d < maxSnap) {
          bestDist = d;
          bestPoint = closest;
        }
      }
    }

    // Blend: snap partway toward the edge (70%) to keep some grid structure
    if (bestDist < maxSnap) {
      return {
        x: pt.x + (bestPoint.x - pt.x) * 0.7,
        y: pt.y + (bestPoint.y - pt.y) * 0.7,
      };
    }
    return pt;
  }

  const totalSpanX = maxX - minX;
  const maxSnap = cellSize * 0.35;

  const cols = Math.ceil((maxX - minX) / cellSize) + 2;
  const rows = Math.ceil((maxY - minY) / cellSize) + 2;

  // Build shared vertex grid so adjacent cells share identical border vertices with ZERO overlaps
  const vertexGrid: LocalPoint[][] = [];
  for (let r = 0; r <= rows; r++) {
    const rowPts: LocalPoint[] = [];
    const y = minY + r * cellSize;
    for (let c = 0; c <= cols; c++) {
      const x = minX + c * cellSize;
      const jx = (rng() - 0.5) * cellSize * 0.22;
      const jy = (rng() - 0.5) * cellSize * 0.22;
      let pt = { x: x + jx, y: y + jy };
      if (localEdges.length > 0) {
        pt = snapToEdge(pt, maxSnap);
      }
      rowPts.push(pt);
    }
    vertexGrid.push(rowPts);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + c * cellSize;
      const y = minY + r * cellSize;
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      if (!pointInPolygonLocal({ x: cx, y: cy }, ring)) continue;

      // Shared corners from lattice: bottom-left -> bottom-right -> top-right -> top-left
      const corners: LocalPoint[] = [
        vertexGrid[r][c],
        vertexGrid[r][c + 1],
        vertexGrid[r + 1][c + 1],
        vertexGrid[r + 1][c],
      ];

      const geoRing = closeRing(corners.map((pt) => fromLocalMeters(pt, origin)));
      const areaHectares = shoelaceAreaHectares(corners);
      const village = villageForFraction(
        options.villages,
        totalSpanX === 0 ? 0 : (cx - minX) / totalSpanX
      );

      parcels.push({
        village,
        areaHectares,
        geometry: { type: "Polygon", coordinates: [geoRing] },
      });
    }
  }

  return parcels;
}
