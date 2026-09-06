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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [flyProgress, setFlyProgress] = useState("");
  const flyAbortRef = useRef(false);

  const assetKind = classifyProject(projectName, projectPurpose);
  const config = ASSET_CONFIG[assetKind];

  // ── Cinematic fly-through (LineString: fly along, Polygon: orbit) ──
  async function flyAlongAlignment() {
    const map = mapRef.current;
    if (!map || !alignment) return;
    flyAbortRef.current = false;
    setIsFlying(true);

    try {
      if (alignment.type === "LineString" && alignment.coordinates.length >= 2) {
        const coords = alignment.coordinates;
        const mid = coords[Math.floor(coords.length / 2)];
        const totalSegments = coords.length - 1;

        // Establish overview
        await flyToAsync(map, {
          center: mid,
          zoom: 15,
          pitch: 30,
          bearing: 0,
          duration: 1500 / speed,
        });

        // Fly along each segment
        for (let i = 0; i < coords.length - 1; i++) {
          if (flyAbortRef.current) break;
          setFlyProgress(`Segment ${i + 1}/${totalSegments}`);
          const bearing = bearingBetween(coords[i], coords[i + 1]);
          // Gentle banking on turns
          const bankOffset = i > 0
            ? (bearingBetween(coords[i - 1], coords[i]) - bearing + 360) % 360
            : 0;
          const bank = bankOffset > 180 ? -(360 - bankOffset) * 0.02 : bankOffset * 0.02;

          // Ease-in on first segment
          const segDuration = i === 0 ? 2200 / speed : 2600 / speed;

          await flyToAsync(map, {
            center: coords[i],
            zoom: 18,
            pitch: 75,
            bearing: bearing + bank,
            duration: segDuration,
          });
          if (flyAbortRef.current) break;
          await flyToAsync(map, {
            center: coords[i + 1],
            zoom: 18,
            pitch: 75,
            bearing: bearing + bank,
            duration: 3200 / speed,
          });
        }

        // Return to overview
        if (!flyAbortRef.current) {
          setFlyProgress("Returning…");
          await flyToAsync(map, { center: mid, zoom: 15, pitch: 45, bearing: 0, duration: 2200 / speed });
        }
      } else if (alignment.type === "Polygon") {
        // Orbit animation for polygon projects (airports, solar parks, etc.)
        const centroid = polygonCentroid(alignment);
        const totalSteps = 12;

        setFlyProgress("Starting orbit…");
        await flyToAsync(map, {
          center: centroid,
          zoom: 15,
          pitch: 20,
          bearing: 0,
          duration: 1500 / speed,
        });

        for (let i = 0; i < totalSteps; i++) {
          if (flyAbortRef.current) break;
          setFlyProgress(`Orbit ${i + 1}/${totalSteps}`);
          const bearing = (360 / totalSteps) * (i + 1);
          const pitch = 60 + Math.sin((i / totalSteps) * Math.PI) * 15;
          await flyToAsync(map, {
            center: centroid,
            zoom: 16.5,
            pitch,
            bearing,
            duration: 2500 / speed,
          });
        }

        if (!flyAbortRef.current) {
          setFlyProgress("Returning…");
          await flyToAsync(map, {
            center: centroid,
            zoom: 15,
            pitch: 45,
            bearing: 0,
            duration: 2000 / speed,
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
    mapRef.current?.stop();
    setIsFlying(false);
    setFlyProgress("");
  }

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
        layers: [{ id: "satellite", type: "raster", source: "satellite" }],
        sky: {
          "sky-color": "#87ceeb",
          "sky-horizon-blend": 0.5,
          "horizon-color": "#fef3c7",
          "horizon-fog-blend": 0.5,
          "fog-color": "#d1e9ff",
          "fog-ground-blend": 0.5,
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

    map.on("error", (e) => {
      console.error("3D view map error:", e.error);
      setStatus("error");
      setErrorMessage(e.error?.message ?? "Map tiles failed to load.");
    });

    map.on("load", () => {
      map.setTerrain({ source: "terrain-dem", exaggeration });

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
        // so the structure (bridge deck, road surface, viaduct) has 3D mass
        if (alignment.type === "LineString" && alignment.coordinates.length >= 2) {
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
        ({ addProceduralModels, computeLinePlacements, computePolygonPlacement }) => {
          try {
            let placements: Parameters<typeof addProceduralModels>[2] = [];

            if (alignment?.type === "LineString") {
              placements = computeLinePlacements(
                alignment.coordinates,
                600, // one model every 600m
                0.8
              );
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
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/60">
            <p className="text-sm text-muted-foreground">Loading satellite imagery and terrain…</p>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 p-6 text-center">
            <p className="max-w-xs text-sm text-muted-foreground">
              Couldn&apos;t load map tiles ({errorMessage}). This view needs a live connection to
              Esri and AWS Open Data — check your network and reload.
            </p>
          </div>
        )}

        {/* Controls panel */}
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

        {/* Cinematic flight controls */}
        {alignment && (
          <div className="absolute right-3 top-3 z-10 space-y-2 rounded-lg border bg-background/95 p-3 text-xs shadow-sm backdrop-blur">
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

        {/* Recenter button */}
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter map"
          className="absolute right-3 bottom-3 z-10 flex h-[29px] w-[29px] items-center justify-center rounded border bg-background shadow-sm hover:bg-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
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
