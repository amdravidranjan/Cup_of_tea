import { describe, it, expect } from "vitest";
import { sampleLinePoints, summarizeElevation } from "./elevation";
import type { LineGeometry } from "./geo";

describe("sampleLinePoints", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [78.0, 12.0],
      [78.1, 12.1],
    ],
  };

  it("returns exactly `count` points, including both endpoints", () => {
    const points = sampleLinePoints(line, 5);
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual(line.coordinates[0]);
    expect(points[4]).toEqual(line.coordinates[1]);
  });

  it("spaces points evenly by arc length", () => {
    const points = sampleLinePoints(line, 3);
    // midpoint of a straight 2-point line is the linear midpoint
    expect(points[1][0]).toBeCloseTo(78.05, 3);
    expect(points[1][1]).toBeCloseTo(12.05, 3);
  });

  it("handles a multi-vertex line by walking cumulative arc length", () => {
    const bent: LineGeometry = {
      type: "LineString",
      coordinates: [
        [78.0, 12.0],
        [78.05, 12.0],
        [78.05, 12.05],
      ],
    };
    const points = sampleLinePoints(bent, 3);
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual(bent.coordinates[0]);
    expect(points[2]).toEqual(bent.coordinates[2]);
  });

  it("returns a single point for a degenerate (zero-length) line", () => {
    const degenerate: LineGeometry = {
      type: "LineString",
      coordinates: [
        [78.0, 12.0],
        [78.0, 12.0],
      ],
    };
    expect(sampleLinePoints(degenerate, 5)).toEqual([[78.0, 12.0]]);
  });
});

describe("summarizeElevation", () => {
  it("sums positive deltas as climb and negative deltas as descent", () => {
    const samples = [100, 150, 120, 180, 160].map((elevationMeters, i) => ({
      distanceMeters: i * 1000,
      lng: 78,
      lat: 12,
      elevationMeters,
    }));
    const summary = summarizeElevation(samples);
    // 100->150 (+50), 150->120 (-30), 120->180 (+60), 180->160 (-20)
    expect(summary.totalClimbMeters).toBe(110);
    expect(summary.totalDescentMeters).toBe(50);
    expect(summary.minElevationMeters).toBe(100);
    expect(summary.maxElevationMeters).toBe(180);
  });

  it("returns zeros for an empty sample list", () => {
    expect(summarizeElevation([])).toEqual({
      totalClimbMeters: 0,
      totalDescentMeters: 0,
      minElevationMeters: 0,
      maxElevationMeters: 0,
    });
  });
});
