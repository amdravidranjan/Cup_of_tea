import { describe, it, expect } from "vitest";
import {
  haversineDistanceMeters,
  polygonCentroid,
  distancePointToLineMeters,
  isParcelWithinBuffer,
  parseStoredGeometry,
  computeParcelsWithImpact,
  type LineGeometry,
  type PolygonGeometry,
} from "./geo";

describe("haversineDistanceMeters", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineDistanceMeters([82.71, 18.81], [82.71, 18.81])).toBeCloseTo(0, 3);
  });

  it("returns a plausible distance for two points ~1km apart", () => {
    const d = haversineDistanceMeters([82.71, 18.81], [82.71, 18.819]);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });
});

describe("polygonCentroid", () => {
  it("computes the centroid of a square", () => {
    const square: PolygonGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 2],
          [2, 2],
          [2, 0],
          [0, 0],
        ],
      ],
    };
    const [lng, lat] = polygonCentroid(square);
    expect(lng).toBeCloseTo(1, 5);
    expect(lat).toBeCloseTo(1, 5);
  });
});

describe("distancePointToLineMeters", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.71, 18.818],
    ],
  };

  it("is near zero for a point on the line", () => {
    expect(distancePointToLineMeters([82.71, 18.814], line)).toBeLessThan(1);
  });

  it("is large for a point far from the line", () => {
    expect(distancePointToLineMeters([82.76, 18.814], line)).toBeGreaterThan(4000);
  });

  it("clamps to the nearest endpoint for a point beyond the segment", () => {
    const beyondNorth = distancePointToLineMeters([82.71, 18.83], line);
    const toEndpoint = haversineDistanceMeters([82.71, 18.83], [82.71, 18.818]);
    expect(Math.abs(beyondNorth - toEndpoint) / toEndpoint).toBeLessThan(0.05);
  });
});

describe("isParcelWithinBuffer", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.71, 18.818],
    ],
  };

  it("flags a parcel centered on the line as within a small buffer", () => {
    const parcel: PolygonGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [82.7095, 18.8135],
          [82.7095, 18.8145],
          [82.7105, 18.8145],
          [82.7105, 18.8135],
          [82.7095, 18.8135],
        ],
      ],
    };
    expect(isParcelWithinBuffer(parcel, line, 200)).toBe(true);
  });

  it("does not flag a distant parcel within a small buffer", () => {
    const parcel: PolygonGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [82.76, 18.83],
          [82.76, 18.831],
          [82.761, 18.831],
          [82.761, 18.83],
          [82.76, 18.83],
        ],
      ],
    };
    expect(isParcelWithinBuffer(parcel, line, 200)).toBe(false);
  });
});

describe("parseStoredGeometry", () => {
  it("returns null when either column is null", () => {
    expect(parseStoredGeometry(null, null)).toBeNull();
    expect(parseStoredGeometry("LineString", null)).toBeNull();
  });

  it("reconstructs a LineString", () => {
    const parsed = parseStoredGeometry(
      "LineString",
      JSON.stringify([
        [82.71, 18.81],
        [82.716, 18.816],
      ])
    );
    expect(parsed).toEqual({
      type: "LineString",
      coordinates: [
        [82.71, 18.81],
        [82.716, 18.816],
      ],
    });
  });
});

describe("computeParcelsWithImpact", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.71, 18.818],
    ],
  };
  const near: PolygonGeometry = {
    type: "Polygon",
    coordinates: [
      [
        [82.7095, 18.8135],
        [82.7095, 18.8145],
        [82.7105, 18.8145],
        [82.7105, 18.8135],
        [82.7095, 18.8135],
      ],
    ],
  };

  it("marks parcels within the default buffer as withinImpact", () => {
    const result = computeParcelsWithImpact(line, [{ id: "p1", geometry: near }]);
    expect(result[0].withinImpact).toBe(true);
  });

  it("marks every parcel as not-within-impact when there is no alignment", () => {
    const result = computeParcelsWithImpact(null, [{ id: "p1", geometry: near }]);
    expect(result[0].withinImpact).toBe(false);
  });
});
