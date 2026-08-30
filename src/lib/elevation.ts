import type { LineGeometry, Position } from "./geo";
import { haversineDistanceMeters } from "./geo";

export interface ElevationSample {
  distanceMeters: number;
  lng: number;
  lat: number;
  elevationMeters: number;
}

/**
 * Evenly-spaced sample points along a (possibly multi-vertex) line,
 * including both endpoints, by cumulative arc length. Pure geometry —
 * elevation values are attached separately once fetched.
 */
export function sampleLinePoints(line: LineGeometry, count: number): Position[] {
  const coords = line.coordinates;
  if (coords.length < 2 || count < 2) return coords.length > 0 ? [coords[0]] : [];

  const segLengths: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    segLengths.push(haversineDistanceMeters(coords[i], coords[i + 1]));
  }
  const totalLength = segLengths.reduce((a, b) => a + b, 0);
  if (totalLength === 0) return [coords[0]];

  const points: Position[] = [];
  for (let i = 0; i < count; i++) {
    const along = (totalLength * i) / (count - 1);
    points.push(positionAtArcLength(coords, segLengths, along));
  }
  return points;
}

function positionAtArcLength(coords: Position[], segLengths: number[], along: number): Position {
  let remaining = along;
  for (let i = 0; i < segLengths.length; i++) {
    if (remaining <= segLengths[i] || i === segLengths.length - 1) {
      const t = segLengths[i] === 0 ? 0 : Math.min(1, remaining / segLengths[i]);
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      return [lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t];
    }
    remaining -= segLengths[i];
  }
  return coords[coords.length - 1];
}

export interface ElevationSummary {
  totalClimbMeters: number;
  totalDescentMeters: number;
  minElevationMeters: number;
  maxElevationMeters: number;
}

export function summarizeElevation(samples: ElevationSample[]): ElevationSummary {
  let climb = 0;
  let descent = 0;
  for (let i = 1; i < samples.length; i++) {
    const delta = samples[i].elevationMeters - samples[i - 1].elevationMeters;
    if (delta > 0) climb += delta;
    else descent += -delta;
  }
  const elevations = samples.map((s) => s.elevationMeters);
  return {
    totalClimbMeters: Math.round(climb),
    totalDescentMeters: Math.round(descent),
    minElevationMeters: elevations.length ? Math.min(...elevations) : 0,
    maxElevationMeters: elevations.length ? Math.max(...elevations) : 0,
  };
}
