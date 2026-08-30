"use client";

import { useEffect, useRef, useState } from "react";
import { MapLibreMap, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
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

const ALIGNMENT_COLOR = "#2563eb";

function statusHex(status: string): string {
  return toneHex(parcelStatusTone(status));
}

function satelliteOnlyStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [SATELLITE_TILE_URL],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Esri, Maxar, Earthstar Geographics",
      },
    },
    layers: [{ id: "satellite", type: "raster", source: "satellite" }],
  };
}

// Two synced satellite maps stacked with a clip-path swipe divider: the
// left pane is raw imagery ("today"), the right pane is the same imagery
// with the project's alignment/parcel overlay ("planned"). Only the left
// (bottom) map is interactive — the right map's viewport is mirrored on
// every "move" event so panning/zooming feels like one map.
export function BeforeAfterSlider({
  alignment,
  parcels,
}: {
  alignment: Geometry | null;
  parcels: ParcelFeature[];
}) {
  const beforeContainerRef = useRef<HTMLDivElement>(null);
  const afterContainerRef = useRef<HTMLDivElement>(null);
  const beforeMapRef = useRef<MapLibreMap | null>(null);
  const afterMapRef = useRef<MapLibreMap | null>(null);
  const [percent, setPercent] = useState(50);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!beforeContainerRef.current || !afterContainerRef.current || beforeMapRef.current) return;
    ensureWorkerUrlConfigured();

    const center: [number, number] =
      alignment?.type === "LineString"
        ? alignment.coordinates[Math.floor(alignment.coordinates.length / 2)]
        : alignment?.type === "Polygon"
          ? alignment.coordinates[0][0]
          : (parcels[0]?.geometry.coordinates[0][0] ?? [82.71, 18.81]);

    const before = new MapLibreMap({
      container: beforeContainerRef.current,
      style: satelliteOnlyStyle(),
      center,
      zoom: 14,
      attributionControl: false,
    });
    const after = new MapLibreMap({
      container: afterContainerRef.current,
      style: satelliteOnlyStyle(),
      center,
      zoom: 14,
      interactive: false,
      attributionControl: false,
    });
    beforeMapRef.current = before;
    afterMapRef.current = after;

    const onError = (e: { error?: { message?: string } }) => {
      console.error("Before/after slider map error:", e.error);
      setStatus("error");
      setErrorMessage(e.error?.message ?? "Satellite tiles failed to load.");
    };
    before.on("error", onError);
    after.on("error", onError);
    before.on("load", () => setStatus((s) => (s === "error" ? s : "ready")));

    before.on("move", () => {
      after.jumpTo({
        center: before.getCenter(),
        zoom: before.getZoom(),
        bearing: before.getBearing(),
        pitch: before.getPitch(),
      });
    });

    after.on("load", () => {
      if (alignment) {
        after.addSource("alignment", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: alignment },
        });
        after.addLayer({
          id: "alignment-line",
          type: "line",
          source: "alignment",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ALIGNMENT_COLOR, "line-width": 4 },
        });
      }
      after.addSource("parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: parcels.map((p) => ({
            type: "Feature",
            properties: { fillColor: statusHex(p.status) },
            geometry: p.geometry,
          })),
        },
      });
      after.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: { "fill-color": ["get", "fillColor"], "fill-opacity": 0.55 },
      });
      after.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: { "line-color": "#f8fafc", "line-width": 1 },
      });
    });

    return () => {
      before.remove();
      after.remove();
      beforeMapRef.current = null;
      afterMapRef.current = null;
    };
  }, [alignment, parcels]);

  return (
    <div className="space-y-2">
      <div className="relative h-[28rem] w-full select-none overflow-hidden rounded-lg border">
        <div ref={beforeContainerRef} className="absolute inset-0" />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${percent}%)` }}
        >
          <div ref={afterContainerRef} className="absolute inset-0" />
        </div>

        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/60">
            <p className="text-sm text-muted-foreground">Loading satellite imagery…</p>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 p-6 text-center">
            <p className="max-w-xs text-sm text-muted-foreground">
              Couldn&apos;t load satellite imagery ({errorMessage}). This view needs a live
              connection to Esri&apos;s tile service — check your network and reload.
            </p>
          </div>
        )}

        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-white"
          style={{ left: `${percent}%`, boxShadow: "0 0 0 1px rgba(0,0,0,0.25)" }}
        />

        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-background/90 px-2 py-1 text-[11px] font-medium shadow-sm">
          Satellite imagery today
        </div>
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded bg-background/90 px-2 py-1 text-[11px] font-medium shadow-sm">
          Planned alignment overlay
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          aria-label="Compare slider"
          className="absolute inset-x-3 bottom-3 z-10 h-1.5 w-[calc(100%-1.5rem)] cursor-ew-resize appearance-none rounded-full bg-white/70 accent-blue-600"
        />
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Imagery: Esri World Imagery (Esri, Maxar, Earthstar Geographics). Drag the slider to
        compare present-day satellite imagery against the notified alignment and parcels.
      </p>
    </div>
  );
}
