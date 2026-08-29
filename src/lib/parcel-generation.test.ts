import { describe, it, expect } from "vitest";
import { generateCorridorParcels, generateGridParcels } from "./parcel-generation";
import { haversineDistanceMeters, type LineGeometry, type PolygonGeometry } from "./geo";

describe("generateCorridorParcels", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [78.2, 12.52],
      [78.24, 12.56],
    ],
  };
  const options = {
    rowWidthMeters: 45,
    minSegmentMeters: 20,
    maxSegmentMeters: 80,
    villages: ["Bargur", "Uthangarai"],
    seed: 42,
  };

  it("covers the full corridor length with adjoining segments, no gaps or overlap", () => {
    const parcels = generateCorridorParcels(line, options);
    const lineLength = haversineDistanceMeters(line.coordinates[0], line.coordinates[1]);

    expect(parcels.length).toBeGreaterThan(50);
    // Total area should equal corridor length * ROW width, within a small
    // tolerance for the flat-earth approximation.
    const totalAreaHectares = parcels.reduce((sum, p) => sum + p.areaHectares, 0);
    const expectedAreaHectares = (lineLength * options.rowWidthMeters) / 10000;
    expect(totalAreaHectares).toBeCloseTo(expectedAreaHectares, 0);
  });

  it("produces valid closed-ring rectangular parcels", () => {
    const parcels = generateCorridorParcels(line, options);
    for (const p of parcels) {
      const ring = p.geometry.coordinates[0];
      expect(ring.length).toBe(5); // 4 corners + closing point
      expect(ring[0]).toEqual(ring[ring.length - 1]);
      expect(p.areaHectares).toBeGreaterThan(0);
    }
  });

  it("assigns villages by position along the corridor (first half vs second half)", () => {
    const parcels = generateCorridorParcels(line, options);
    expect(parcels[0].village).toBe("Bargur");
    expect(parcels[parcels.length - 1].village).toBe("Uthangarai");
  });

  it("is deterministic for a given seed", () => {
    const a = generateCorridorParcels(line, options);
    const b = generateCorridorParcels(line, options);
    expect(a.length).toBe(b.length);
    expect(a[5].geometry).toEqual(b[5].geometry);
  });

  it("returns nothing for a zero-length line", () => {
    const degenerate: LineGeometry = { type: "LineString", coordinates: [[78.2, 12.52], [78.2, 12.52]] };
    expect(generateCorridorParcels(degenerate, options)).toEqual([]);
  });
});

describe("generateGridParcels", () => {
  const polygon: PolygonGeometry = {
    type: "Polygon",
    coordinates: [
      [
        [78.47, 9.84],
        [78.47, 9.86],
        [78.5, 9.86],
        [78.5, 9.84],
        [78.47, 9.84],
      ],
    ],
  };
  const options = {
    targetParcelHectares: 1.2,
    villages: ["Manamadurai", "Ilayangudi"],
    seed: 7,
  };

  it("generates several hundred parcels for a multi-hundred-hectare footprint", () => {
    const parcels = generateGridParcels(polygon, options);
    expect(parcels.length).toBeGreaterThan(400);
    for (const p of parcels) {
      expect(p.areaHectares).toBeGreaterThan(0);
      expect(p.areaHectares).toBeLessThan(options.targetParcelHectares * 2);
    }
  });

  it("keeps every generated parcel's centroid within the source polygon's bounding box", () => {
    const parcels = generateGridParcels(polygon, options);
    for (const p of parcels) {
      for (const [lng, lat] of p.geometry.coordinates[0]) {
        expect(lng).toBeGreaterThanOrEqual(78.46);
        expect(lng).toBeLessThanOrEqual(78.51);
        expect(lat).toBeGreaterThanOrEqual(9.83);
        expect(lat).toBeLessThanOrEqual(9.87);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generateGridParcels(polygon, options);
    const b = generateGridParcels(polygon, options);
    expect(a).toEqual(b);
  });
});
