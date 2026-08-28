export type Position = [number, number];

export interface LineGeometry {
  type: "LineString";
  coordinates: Position[];
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}

export type Geometry = LineGeometry | PolygonGeometry;

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(a: Position, b: Position): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

function toLocalMeters(point: Position, origin: Position): { x: number; y: number } {
  const [lng, lat] = point;
  const [lng0, lat0] = origin;
  const x = toRad(lng - lng0) * EARTH_RADIUS_M * Math.cos(toRad(lat0));
  const y = toRad(lat - lat0) * EARTH_RADIUS_M;
  return { x, y };
}

function pointToSegmentDistanceMeters(
  point: Position,
  segA: Position,
  segB: Position
): number {
  const origin = segA;
  const p = toLocalMeters(point, origin);
  const a = { x: 0, y: 0 };
  const b = toLocalMeters(segB, origin);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: a.x + t * abx, y: a.y + t * aby };
  const dx = p.x - closest.x;
  const dy = p.y - closest.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function polygonCentroid(polygon: PolygonGeometry): Position {
  const ring = polygon.coordinates[0];
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const points = closed ? ring.slice(0, -1) : ring;
  const sum = points.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 }
  );
  return [sum.lng / points.length, sum.lat / points.length];
}

export function distancePointToLineMeters(point: Position, line: LineGeometry): number {
  const coords = line.coordinates;
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) return haversineDistanceMeters(point, coords[0]);
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    min = Math.min(min, pointToSegmentDistanceMeters(point, coords[i], coords[i + 1]));
  }
  return min;
}

export function isParcelWithinBuffer(
  parcel: PolygonGeometry,
  alignment: Geometry,
  bufferMeters: number
): boolean {
  const centroid = polygonCentroid(parcel);
  if (alignment.type === "LineString") {
    return distancePointToLineMeters(centroid, alignment) <= bufferMeters;
  }
  const alignmentCentroid = polygonCentroid(alignment);
  return haversineDistanceMeters(centroid, alignmentCentroid) <= bufferMeters;
}

export function parseStoredGeometry(
  geometryType: string | null,
  geometryGeoJson: string | null
): Geometry | null {
  if (!geometryType || !geometryGeoJson) return null;
  const coordinates = JSON.parse(geometryGeoJson);
  if (geometryType === "LineString") return { type: "LineString", coordinates };
  if (geometryType === "Polygon") return { type: "Polygon", coordinates };
  return null;
}

export const IMPACT_BUFFER_METERS = 500;

export function computeParcelsWithImpact<T extends { geometry: PolygonGeometry }>(
  alignment: Geometry | null,
  parcelList: T[]
): (T & { withinImpact: boolean })[] {
  return parcelList.map((p) => ({
    ...p,
    withinImpact: alignment
      ? isParcelWithinBuffer(p.geometry, alignment, IMPACT_BUFFER_METERS)
      : false,
  }));
}
