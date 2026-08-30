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
}

/**
 * Generates a strip of narrow parcels along a linear alignment, each
 * spanning the full right-of-way width — the shape a real highway/canal
 * land acquisition actually takes (a ribbon of adjoining survey plots
 * along the route), not arbitrary boxes scattered near the line.
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
  let along = 0;

  while (along < totalLength) {
    const step =
      options.minSegmentMeters +
      rng() * (options.maxSegmentMeters - options.minSegmentMeters);
    const endAlong = Math.min(along + step, totalLength);
    const start = positionAt(along);
    const end = positionAt(endAlong);
    const perp = { x: -start.dir.y, y: start.dir.x };
    const half = options.rowWidthMeters / 2;

    // Real adjoining survey plots along a corridor rarely all reach the
    // full right-of-way depth on both sides and rarely meet their
    // neighbor on a clean perpendicular line — each of the 4 corners gets
    // an independent depth (55-100% of the ROW half-width) and a small
    // along-line jitter, so the strip reads as a row of irregular
    // adjoining plots rather than a ruled-off rectangle grid.
    const depth = () => half * (0.55 + rng() * 0.45);
    const alongJitter = () => (rng() - 0.5) * Math.min(step, options.rowWidthMeters) * 0.3;

    const startPt = add(start.point, scale(start.dir, alongJitter()));
    const endPt = add(end.point, scale(start.dir, alongJitter()));

    const corners: LocalPoint[] = [
      add(startPt, scale(perp, depth())),
      add(endPt, scale(perp, depth())),
      add(endPt, scale(perp, -depth())),
      add(startPt, scale(perp, -depth())),
    ];
    const ring = closeRing(corners.map((c) => fromLocalMeters(c, origin)));
    const areaHectares = shoelaceAreaHectares(corners);
    const village = villageForFraction(options.villages, along / totalLength);

    parcels.push({
      village,
      areaHectares,
      geometry: { type: "Polygon", coordinates: [ring] },
    });

    along = endAlong;
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
}

/**
 * Subdivides a polygon footprint into a grid of parcels sized around a
 * realistic average landholding, jittered slightly so it doesn't read as
 * a perfectly uniform grid. Only cells whose centroid falls inside the
 * polygon are kept, so this also works for non-rectangular footprints.
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

  const totalSpanX = maxX - minX;
  for (let y = minY; y < maxY; y += cellSize) {
    for (let x = minX; x < maxX; x += cellSize) {
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      if (!pointInPolygonLocal({ x: cx, y: cy }, ring)) continue;

      // Jitter each corner independently (not just a shared w/h scale) so
      // cells come out as irregular quadrilaterals — real field
      // boundaries, not a drafted grid.
      const jitter = () => (rng() - 0.5) * cellSize * 0.36;
      const corners: LocalPoint[] = [
        { x: x + jitter(), y: y + jitter() },
        { x: x + cellSize + jitter(), y: y + jitter() },
        { x: x + cellSize + jitter(), y: y + cellSize + jitter() },
        { x: x + jitter(), y: y + cellSize + jitter() },
      ];
      const geoRing = closeRing(corners.map((c) => fromLocalMeters(c, origin)));
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
