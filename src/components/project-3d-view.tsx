"use client";

import { useEffect, useRef, useState } from "react";
import { MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geometry, PolygonGeometry, Position } from "@/lib/geo";
import { SATELLITE_TILE_URL } from "@/components/project-map";
import { parcelStatusTone, toneHex } from "@/lib/status-colors";

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

const ALIGNMENT_COLOR = "#facc15";

// AWS Open Data Terrain Tiles: free, keyless, Terrarium-encoded raster-DEM
// (global SRTM/other DEM mosaics, no API key or account required).
const TERRAIN_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

function statusHex(status: string): string {
  return toneHex(parcelStatusTone(status));
}

// Great-circle initial bearing from a to b, in degrees — used to orient
// the fly-through camera along the alignment's actual direction rather
// than a fixed angle.
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

export function Project3DView({
  alignment,
  parcels,
}: {
  alignment: Geometry | null;
  parcels: ParcelFeature[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [exaggeration, setExaggeration] = useState(1.5);
  const [isFlying, setIsFlying] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function flyAlongAlignment() {
    const map = mapRef.current;
    if (!map || alignment?.type !== "LineString" || alignment.coordinates.length < 2) return;
    const coords = alignment.coordinates;
    const mid = coords[Math.floor(coords.length / 2)];

    setIsFlying(true);
    try {
      await flyToAsync(map, { center: mid, zoom: 15, pitch: 30, bearing: 0, duration: 1500 });
      for (let i = 0; i < coords.length - 1; i++) {
        const bearing = bearingBetween(coords[i], coords[i + 1]);
        await flyToAsync(map, {
          center: coords[i],
          zoom: 18,
          pitch: 72,
          bearing,
          duration: i === 0 ? 2200 : 2600,
        });
        await flyToAsync(map, {
          center: coords[i + 1],
          zoom: 18,
          pitch: 72,
          bearing,
          duration: 3200,
        });
      }
      await flyToAsync(map, { center: mid, zoom: 15, pitch: 45, bearing: 0, duration: 2200 });
    } finally {
      setIsFlying(false);
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureWorkerUrlConfigured();

    const center: [number, number] =
      alignment?.type === "LineString"
        ? alignment.coordinates[Math.floor(alignment.coordinates.length / 2)]
        : alignment?.type === "Polygon"
          ? alignment.coordinates[0][0]
          : (parcels[0]?.geometry.coordinates[0][0] ?? [82.71, 18.81]);

    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [SATELLITE_TILE_URL],
            tileSize: 256,
            maxzoom: 19,
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
          "terrain-dem": {
            type: "raster-dem",
            tiles: [TERRAIN_TILE_URL],
            tileSize: 256,
            // AWS's Terrarium tile bucket only has coverage up to z15 —
            // without this, MapLibre requests nonexistent higher-zoom
            // tiles, gets S3's XML error body back, and floods the
            // console trying (and failing) to decode it as an image.
            maxzoom: 15,
            encoding: "terrarium",
            attribution: "AWS Open Data Terrain Tiles",
          },
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
          paint: { "line-color": ALIGNMENT_COLOR, "line-width": 6, "line-opacity": 0.95 },
        });
        map.addLayer({
          id: "alignment-casing",
          type: "line",
          source: "alignment",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#111827", "line-width": 10, "line-opacity": 0.5 },
        }, "alignment-line");
      }

      map.addSource("parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: parcels.map((p) => ({
            type: "Feature",
            properties: {
              village: p.village,
              status: p.status,
              fillColor: statusHex(p.status),
              // Nominal extrusion height so parcels read as ground plots
              // against the draped terrain, not a real building height.
              height: 6,
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

  return (
    <div className="space-y-2">
      <div className="relative h-[32rem] w-full overflow-hidden rounded-lg border">
        <div ref={containerRef} className="absolute inset-0" />

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

        <div className="absolute left-3 top-3 z-10 space-y-2 rounded-lg border bg-background/95 p-3 text-xs shadow-sm backdrop-blur">
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

        {alignment?.type === "LineString" && (
          <button
            type="button"
            onClick={flyAlongAlignment}
            disabled={isFlying}
            className="absolute right-3 top-3 z-10 rounded-lg border bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur disabled:opacity-60"
          >
            {isFlying ? "Flying…" : "Fly along alignment"}
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Real terrain: AWS Open Data Terrarium elevation tiles draped under Esri satellite
        imagery. Drag to orbit, scroll to zoom, shift-drag to tilt. Parcel extrusion height is
        nominal, for visual separation from the terrain — not a survey measurement.
      </p>
    </div>
  );
}
