"use client";

import { useEffect, useRef, useState } from "react";
import { MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geometry, PolygonGeometry } from "@/lib/geo";
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
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
          "terrain-dem": {
            type: "raster-dem",
            tiles: [TERRAIN_TILE_URL],
            tileSize: 256,
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
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Real terrain: AWS Open Data Terrarium elevation tiles draped under Esri satellite
        imagery. Drag to orbit, scroll to zoom, shift-drag to tilt. Parcel extrusion height is
        nominal, for visual separation from the terrain — not a survey measurement.
      </p>
    </div>
  );
}
