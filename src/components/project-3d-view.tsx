"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapLibreMap,
  NavigationControl,
  FullscreenControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geometry, PolygonGeometry, Position } from "@/lib/geo";
import { computeBbox, polygonCentroid } from "@/lib/geo";
import { parcelStatusTone, toneHex } from "@/lib/status-colors";
import {
  SATELLITE_SOURCE_CONFIG,
  TERRAIN_SOURCE_CONFIG,
} from "@/lib/tile-cache";
import { RecenterControl } from "@/lib/map-controls";

let workerUrlConfigured = false;
function ensureWorkerUrlConfigured() {
  if (workerUrlConfigured) return;
  setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");
  workerUrlConfigured = true;
}

interface ParcelFeature {
  id: string;
  village: string;
  status: string;
  areaHectares: number;
  geometry: PolygonGeometry;
}

// ── Asset type classification ────────────────────────────────────────
type AssetKind =
  | "bridge"
  | "expressway"
  | "metro"
  | "canal"
  | "port-corridor"
  | "rail"
  | "airport"
  | "industrial"
  | "solar"
  | "pipeline";

function classifyProject(name: string, purpose: string): AssetKind {
  const text = `${name} ${purpose}`.toLowerCase();
  if (text.includes("bridge")) return "bridge";
  if (text.includes("metro")) return "metro";
  if (text.includes("expressway") || text.includes("bypass") || text.includes("highway") || text.includes("ring road"))
    return "expressway";
  if (text.includes("canal") || text.includes("link canal")) return "canal";
  if (text.includes("port") || text.includes("freight")) return "port-corridor";
  if (text.includes("rail")) return "rail";
  if (text.includes("airport") || text.includes("runway")) return "airport";
  if (text.includes("solar")) return "solar";
  if (text.includes("pipeline") || text.includes("water") && text.includes("pipe")) return "pipeline";
  if (text.includes("industrial") || text.includes("sipcot") || text.includes("steel") || text.includes("it corridor"))
    return "industrial";
  return "expressway"; // default
}

const ASSET_CONFIG: Record<
  AssetKind,
  {
    alignmentColor: string;
    alignmentHeight: number;
    parcelHeight: number;
    parcelColor: string | null; // null = use status color
    label: string;
  }
> = {
  bridge: {
    alignmentColor: "#64748b",
    alignmentHeight: 15,
    parcelHeight: 3,
    parcelColor: null,
    label: "Bridge deck + approach",
  },
  expressway: {
    alignmentColor: "#374151",
    alignmentHeight: 3,
    parcelHeight: 2,
    parcelColor: null,
    label: "Road surface + embankment",
  },
  metro: {
    alignmentColor: "#7c3aed",
    alignmentHeight: 12,
    parcelHeight: 5,
    parcelColor: null,
    label: "Elevated viaduct + platforms",
  },
  canal: {
    alignmentColor: "#0ea5e9",
    alignmentHeight: 2,
    parcelHeight: 1,
    parcelColor: "#0ea5e940",
    label: "Water channel + embankment",
  },
  "port-corridor": {
    alignmentColor: "#6b7280",
    alignmentHeight: 5,
    parcelHeight: 8,
    parcelColor: null,
    label: "Road/rail + container yards",
  },
  rail: {
    alignmentColor: "#78716c",
    alignmentHeight: 3,
    parcelHeight: 1,
    parcelColor: null,
    label: "Track bed + buffer",
  },
  airport: {
    alignmentColor: "#9ca3af",
    alignmentHeight: 1,
    parcelHeight: 20,
    parcelColor: null,
    label: "Runway + terminal",
  },
  industrial: {
    alignmentColor: "#d97706",
    alignmentHeight: 12,
    parcelHeight: 15,
    parcelColor: null,
    label: "Factory/warehouse blocks",
  },
  solar: {
    alignmentColor: "#2563eb",
    alignmentHeight: 3,
    parcelHeight: 3,
    parcelColor: "#3b82f640",
    label: "Panel arrays",
  },
  pipeline: {
    alignmentColor: "#a3a3a3",
    alignmentHeight: 2,
    parcelHeight: 2,
    parcelColor: null,
    label: "Surface markers",
  },
};

const ALIGNMENT_LINE_COLOR = "#facc15";

function statusHex(status: string): string {
  return toneHex(parcelStatusTone(status));
}

// Great-circle initial bearing from a to b, in degrees
function bearingBetween(a: Position, b: Position): number {
  const [lng1, lat1] = a.map((d) => (d * Math.PI) / 180);
  const [lng2, lat2] = b.map((d) => (d * Math.PI) / 180);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function flyToAsync(map: MapLibreMap, options: Parameters<MapLibreMap["flyTo"]>[0]): Promise<void> {
  return new Promise((resolve) => {
    map.once("moveend", () => resolve());
    map.flyTo(options);
  });
}

/**
 * Buffers a LineString into a polygon by offsetting each vertex
 * perpendicular to the line direction. Creates a "ribbon" polygon
 * that can be extruded as a 3D volume (bridge deck, road surface, etc.)
 */
function bufferLineToPolygon(
  coords: [number, number][],
  halfWidthMeters: number
): [number, number][] {
  if (coords.length < 2) return [];

  // Approximate meters per degree at the line's latitude
  const avgLat = coords.reduce((sum, [, lat]) => sum + lat, 0) / coords.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);

  const left: [number, number][] = [];
  const right: [number, number][] = [];

  for (let i = 0; i < coords.length; i++) {
    // Direction vector
    let dx: number, dy: number;
    if (i < coords.length - 1) {
      dx = (coords[i + 1][0] - coords[i][0]) * mPerDegLng;
      dy = (coords[i + 1][1] - coords[i][1]) * mPerDegLat;
    } else {
      dx = (coords[i][0] - coords[i - 1][0]) * mPerDegLng;
      dy = (coords[i][1] - coords[i - 1][1]) * mPerDegLat;
    }
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular (normalized)
    const px = -dy / len;
    const py = dx / len;

    // Offset in degrees
    const offLng = (px * halfWidthMeters) / mPerDegLng;
    const offLat = (py * halfWidthMeters) / mPerDegLat;

    left.push([coords[i][0] + offLng, coords[i][1] + offLat]);
    right.push([coords[i][0] - offLng, coords[i][1] - offLat]);
  }

  // Close the polygon: left side forward, right side reversed, then close ring
  return [...left, ...right.reverse(), left[0]];
}

function resampleLineString(coords: Position[], targetCount: number = 24): Position[] {
  if (coords.length <= 2 && targetCount <= 2) return coords;
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const [x1, y1] = coords[i - 1];
    const [x2, y2] = coords[i];
    const d = Math.hypot(x2 - x1, y2 - y1);
    cumDist.push(cumDist[i - 1] + d);
  }
  const total = cumDist[cumDist.length - 1];
  if (total === 0) return coords;

  const count = Math.max(coords.length, targetCount);
  const waypoints: Position[] = [];
  for (let s = 0; s <= count; s++) {
    const targetDist = (s / count) * total;
    let seg = 0;
    for (let i = 1; i < cumDist.length; i++) {
      if (cumDist[i] >= targetDist) {
        seg = i - 1;
        break;
      }
    }
    const segLen = cumDist[seg + 1] - cumDist[seg];
    const t = segLen === 0 ? 0 : (targetDist - cumDist[seg]) / segLen;
    const [x1, y1] = coords[seg];
    const [x2, y2] = coords[seg + 1];
    waypoints.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
  }
  return waypoints;
}

function computeCumulativeDistances(coords: Position[]): { cumDist: number[]; totalDist: number } {
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const [x1, y1] = coords[i - 1];
    const [x2, y2] = coords[i];
    const meanLat = (((y1 + y2) / 2) * Math.PI) / 180;
    const dx = (x2 - x1) * Math.cos(meanLat) * 111320;
    const dy = (y2 - y1) * 110540;
    cumDist.push(cumDist[i - 1] + Math.hypot(dx, dy));
  }
  return { cumDist, totalDist: cumDist[cumDist.length - 1] };
}

function interpolateAlongPath(coords: Position[], cumDist: number[], distMeters: number): Position {
  const total = cumDist[cumDist.length - 1];
  const target = Math.max(0, Math.min(total, distMeters));
  let seg = 0;
  for (let i = 1; i < cumDist.length; i++) {
    if (cumDist[i] >= target) {
      seg = i - 1;
      break;
    }
  }
  const segLen = cumDist[seg + 1] - cumDist[seg];
  const t = segLen === 0 ? 0 : (target - cumDist[seg]) / segLen;
  const [x1, y1] = coords[seg];
  const [x2, y2] = coords[seg + 1];
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}

function computeLookaheadBearing(
  coords: Position[],
  cumDist: number[],
  distMeters: number,
  lookaheadMeters: number = 45
): number {
  const total = cumDist[cumDist.length - 1];
  const currentPt = interpolateAlongPath(coords, cumDist, distMeters);
  const targetDist = Math.min(total, distMeters + lookaheadMeters);
  const targetPt = interpolateAlongPath(coords, cumDist, targetDist);
  if (Math.hypot(targetPt[0] - currentPt[0], targetPt[1] - currentPt[1]) < 1e-7) {
    const prevDist = Math.max(0, distMeters - lookaheadMeters);
    const prevPt = interpolateAlongPath(coords, cumDist, prevDist);
    return bearingBetween(prevPt, currentPt);
  }
  return bearingBetween(currentPt, targetPt);
}

// ── Speed presets ────────────────────────────────────────────────────
const SPEED_PRESETS = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
  { label: "3×", value: 3 },
] as const;

export function Project3DView({
  alignment,
  parcels,
  projectName = "",
  projectPurpose = "",
}: {
  alignment: Geometry | null;
  parcels: ParcelFeature[];
  projectName?: string;
  projectPurpose?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [exaggeration, setExaggeration] = useState(1.5);
  const [isFlying, setIsFlying] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(speed);
  const animFrameRef = useRef<number | null>(null);
  const [flyProgress, setFlyProgress] = useState("");
  const flyAbortRef = useRef(false);
  const recenterFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const assetKind = classifyProject(projectName, projectPurpose);
  const config = ASSET_CONFIG[assetKind];

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const geoms: Geometry[] = [];
    if (alignment) geoms.push(alignment);
    for (const p of parcels) geoms.push(p.geometry);
    if (geoms.length === 0) return;
    const bounds = computeBbox(geoms);
    map.fitBounds(bounds, { padding: 50, duration: 800 });
  }, [alignment, parcels]);

  useEffect(() => {
    recenterFnRef.current = handleRecenter;
  }, [handleRecenter]);

  // ── Cinematic road walkthrough & orbit animations (100% continuous, zero pauses) ──
  async function flyAlongAlignment() {
    const map = mapRef.current;
    if (!map || !alignment) return;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    flyAbortRef.current = false;
    setIsFlying(true);

    try {
      if (alignment.type === "LineString" && alignment.coordinates.length >= 2) {
        const rawCoords = alignment.coordinates as Position[];
        const waypoints = resampleLineString(rawCoords, Math.max(30, rawCoords.length * 3));
        const { cumDist, totalDist } = computeCumulativeDistances(waypoints);
        if (totalDist <= 0) return;

        setFlyProgress("Aligning with road…");
        const startBearing = computeLookaheadBearing(waypoints, cumDist, 0, 50);

        await new Promise<void>((resolve) => {
          map.flyTo({
            center: waypoints[0],
            zoom: 17.2,
            pitch: 75,
            bearing: startBearing,
            duration: 1500,
          });
          map.once("moveend", () => resolve());
        });

        if (flyAbortRef.current) return;

        // Smooth continuous 60fps walkthrough with zero pauses
        let currentDist = 0;
        let lastTime = performance.now();
        const baseMetersPerSec = Math.max(35, totalDist / 25);

        await new Promise<void>((resolve) => {
          const loop = (now: number) => {
            if (flyAbortRef.current) {
              resolve();
              return;
            }
            const dt = Math.min((now - lastTime) / 1000, 0.08);
            lastTime = now;

            currentDist += baseMetersPerSec * speedRef.current * dt;

            if (currentDist >= totalDist) {
              setFlyProgress("Walkthrough 100%");
              resolve();
              return;
            }

            const pct = Math.round((currentDist / totalDist) * 100);
            setFlyProgress(`Walkthrough ${pct}%`);

            const currentPt = interpolateAlongPath(waypoints, cumDist, currentDist);
            const bearing = computeLookaheadBearing(waypoints, cumDist, currentDist, 50);

            map.jumpTo({
              center: currentPt,
              bearing: bearing,
              pitch: 75,
              zoom: 17.4,
            });

            animFrameRef.current = requestAnimationFrame(loop);
          };
          animFrameRef.current = requestAnimationFrame(loop);
        });

        if (!flyAbortRef.current) {
          setFlyProgress("Returning to overview…");
          const mid = rawCoords[Math.floor(rawCoords.length / 2)];
          await new Promise<void>((resolve) => {
            map.easeTo({ center: mid, zoom: 15, pitch: 45, bearing: 0, duration: 2200 });
            map.once("moveend", () => resolve());
          });
        }
      } else if (alignment.type === "Polygon") {
        const centroid = polygonCentroid(alignment);
        setFlyProgress("Aligning orbit…");

        await new Promise<void>((resolve) => {
          map.flyTo({
            center: centroid,
            zoom: 15.5,
            pitch: 58,
            bearing: 0,
            duration: 1500,
          });
          map.once("moveend", () => resolve());
        });

        if (flyAbortRef.current) return;

        let currentAngle = 0;
        let lastTime = performance.now();
        const baseDegPerSec = 18; // 20s for full 360° at 1x

        await new Promise<void>((resolve) => {
          const loop = (now: number) => {
            if (flyAbortRef.current) {
              resolve();
              return;
            }
            const dt = Math.min((now - lastTime) / 1000, 0.08);
            lastTime = now;

            currentAngle += baseDegPerSec * speedRef.current * dt;
            if (currentAngle >= 360) {
              setFlyProgress("Orbit 100%");
              resolve();
              return;
            }

            const pct = Math.round((currentAngle / 360) * 100);
            setFlyProgress(`Orbit ${pct}%`);

            const pitch = 58 + Math.sin((currentAngle * Math.PI) / 90) * 7;

            map.jumpTo({
              center: centroid,
              bearing: currentAngle,
              pitch,
              zoom: 15.5,
            });

            animFrameRef.current = requestAnimationFrame(loop);
          };
          animFrameRef.current = requestAnimationFrame(loop);
        });

        if (!flyAbortRef.current) {
          setFlyProgress("Returning…");
          await new Promise<void>((resolve) => {
            map.easeTo({ center: centroid, zoom: 15, pitch: 45, bearing: 0, duration: 2000 });
            map.once("moveend", () => resolve());
          });
        }
      }
    } finally {
      setIsFlying(false);
      setFlyProgress("");
    }
  }

  function stopFlight() {
    flyAbortRef.current = true;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    mapRef.current?.stop();
    setIsFlying(false);
    setFlyProgress("");
  }


  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureWorkerUrlConfigured();

    const center: [number, number] =
      alignment?.type === "LineString"
        ? alignment.coordinates[Math.floor(alignment.coordinates.length / 2)]
        : alignment?.type === "Polygon"
          ? polygonCentroid(alignment)
          : (parcels[0]?.geometry.coordinates[0][0] ?? [82.71, 18.81]);

    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          satellite: SATELLITE_SOURCE_CONFIG,
          "terrain-dem": TERRAIN_SOURCE_CONFIG,
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#18221b" },
          },
          { id: "satellite", type: "raster", source: "satellite" },
        ],
        sky: {
          "sky-color": "#38bdf8",
          "sky-horizon-blend": 0.15,
          "horizon-color": "#bae6fd",
          "horizon-fog-blend": 0.1,
          "fog-color": "#e0f2fe",
          "fog-ground-blend": 0.05,
        },
      },
      center,
      zoom: 16,
      pitch: 65,
      bearing: -20,
      maxPitch: 85,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new FullscreenControl(), "top-right");
    map.addControl(new RecenterControl(() => recenterFnRef.current()), "top-right");

    map.on("error", (e) => {
      console.warn("3D view tile notice (non-fatal):", e.error);
    });

    map.on("load", () => {
      try {
        map.setTerrain({ source: "terrain-dem", exaggeration });
      } catch (err) {
        console.warn("Terrain DEM unavailable (non-critical):", err);
      }

      if (alignment) {
        map.addSource("alignment", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: alignment },
        });
        map.addLayer({
          id: "alignment-line",
          type: "line",
          source: "alignment",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ALIGNMENT_LINE_COLOR, "line-width": 6, "line-opacity": 0.95 },
        });
        map.addLayer({
          id: "alignment-casing",
          type: "line",
          source: "alignment",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#111827", "line-width": 10, "line-opacity": 0.5 },
        }, "alignment-line");

        // 3D volume: buffer the alignment into a polygon and extrude it
        // For bridge projects, the procedural Three.js bridge model provides full 3D deck, piers, pylons and railings,
        // so skip alignment-volume-extrusion to avoid Z-fighting and flickering polygons.
        if (assetKind !== "bridge" && alignment.type === "LineString" && alignment.coordinates.length >= 2) {
          const buffered = bufferLineToPolygon(
            alignment.coordinates as [number, number][],
            10 // 10 meter half-width for the 3D volume
          );
          map.addSource("alignment-volume", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates: [buffered] },
            },
          });
          map.addLayer({
            id: "alignment-volume-extrusion",
            type: "fill-extrusion",
            source: "alignment-volume",
            paint: {
              "fill-extrusion-color": config.alignmentColor,
              "fill-extrusion-height": config.alignmentHeight,
              "fill-extrusion-opacity": 0.85,
            },
          });
        } else if (alignment.type === "Polygon") {
          // For polygon alignments (airports, industrial zones), extrude the polygon itself
          map.addSource("alignment-volume", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: alignment,
            },
          });
          map.addLayer({
            id: "alignment-volume-extrusion",
            type: "fill-extrusion",
            source: "alignment-volume",
            paint: {
              "fill-extrusion-color": config.alignmentColor,
              "fill-extrusion-height": config.alignmentHeight,
              "fill-extrusion-opacity": 0.65,
            },
          });
        }
      }

      // Asset-type-aware parcel extrusion
      map.addSource("parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: parcels.map((p, i) => ({
            type: "Feature",
            properties: {
              village: p.village,
              status: p.status,
              fillColor: config.parcelColor ?? statusHex(p.status),
              // Vary heights to create visual interest
              height: config.parcelHeight + (i % 3) * Math.max(1, config.parcelHeight * 0.15),
            },
            geometry: p.geometry,
          })),
        },
      });
      map.addLayer({
        id: "parcels-extrusion",
        type: "fill-extrusion",
        source: "parcels",
        paint: {
          "fill-extrusion-color": ["get", "fillColor"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-opacity": 0.75,
        },
      });

      setStatus("ready");

      // Lazily load procedural 3D models after the map is ready
      // Using dynamic import so Three.js doesn't increase initial bundle
      import("@/components/three-model-layer").then(
        ({ addProceduralModels, computeLinePlacements, computePolygonPlacement, computeBridgePlacements }) => {
          try {
            let placements: Parameters<typeof addProceduralModels>[2] = [];

            if (alignment?.type === "LineString") {
              if (assetKind === "bridge") {
                placements = computeBridgePlacements(alignment.coordinates, 1.0);
              } else {
                placements = computeLinePlacements(
                  alignment.coordinates,
                  600, // one model every 600m
                  0.8
                );
              }
            } else if (alignment?.type === "Polygon") {
              const placement = computePolygonPlacement(
                alignment.coordinates[0],
                1.2
              );
              placements = [placement];
            }

            if (placements.length > 0) {
              addProceduralModels(map, assetKind, placements).catch((err) => {
                console.warn("Three.js model layer failed (non-critical):", err);
              });
            }
          } catch (err) {
            console.warn("Failed to load 3D models (non-critical):", err);
          }
        }
      ).catch(() => {
        // Three.js load failed — non-critical, the map still works fine
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignment, parcels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getTerrain()) return;
    map.setTerrain({ source: "terrain-dem", exaggeration });
  }, [exaggeration]);

  const flyLabel =
    alignment?.type === "Polygon"
      ? "Cinematic orbit"
      : "Fly along alignment";

  return (
    <div className="space-y-2">
      <div className="relative h-[32rem] w-full overflow-hidden rounded-lg border">
        <div
          ref={containerRef}
          style={{ position: "absolute", inset: 0, backgroundColor: "#18221b" }}
        />

        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/60">
            <p className="text-sm text-muted-foreground">Loading satellite imagery and terrain…</p>
          </div>
        )}

        {/* Controls panel (left top) */}
        <div className="absolute left-3 top-3 z-10 space-y-3 rounded-lg border bg-background/95 p-3 text-xs shadow-sm backdrop-blur">
          <div>
            <p className="font-semibold text-foreground">Terrain exaggeration</p>
            <input
              type="range"
              min={1}
              max={4}
              step={0.5}
              value={exaggeration}
              onChange={(e) => setExaggeration(Number(e.target.value))}
              className="w-32 accent-blue-600"
            />
            <p className="text-muted-foreground">{exaggeration.toFixed(1)}×</p>
          </div>

          <div className="border-t pt-2">
            <p className="font-semibold text-foreground">Asset type</p>
            <p className="text-muted-foreground">{config.label}</p>
          </div>
        </div>

        {/* Cinematic flight & walkthrough controls (positioned at bottom right to avoid any button overlap) */}
        {alignment && (
          <div className="absolute right-3 bottom-3 z-10 space-y-2 rounded-lg border bg-background/95 p-3 text-xs shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              {!isFlying ? (
                <button
                  type="button"
                  onClick={flyAlongAlignment}
                  className="rounded-md bg-brand px-3 py-1.5 font-medium text-white shadow-sm hover:bg-brand/90"
                >
                  {flyLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopFlight}
                  className="rounded-md bg-destructive px-3 py-1.5 font-medium text-white shadow-sm hover:bg-destructive/90"
                >
                  Stop
                </button>
              )}
            </div>

            {/* Speed control */}
            <div>
              <p className="mb-1 font-semibold text-foreground">Speed</p>
              <div className="flex gap-1">
                {SPEED_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSpeed(preset.value)}
                    className={`rounded px-2 py-0.5 ${
                      speed === preset.value
                        ? "bg-brand text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {flyProgress && (
              <p className="text-muted-foreground">{flyProgress} · {speed}× speed</p>
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Real terrain: AWS Open Data Terrarium elevation tiles draped under Esri satellite
        imagery. Drag to orbit, scroll to zoom, shift-drag to tilt. Parcel extrusion height is
        nominal, for visual separation from the terrain — not a survey measurement.
        {config.label && ` Asset type: ${config.label}.`}
      </p>
    </div>
  );
}
