"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapLibreMap,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geometry, PolygonGeometry } from "@/lib/geo";
import { IMPACT_BUFFER_METERS } from "@/lib/geo";
import { parcelStatusTone, toneHex } from "@/lib/status-colors";
import { PARCEL_STATUSES } from "@/lib/parcel-status";

// v6 requires this one-time call for every bundler — import.meta.url
// doesn't reliably resolve to the worker file inside a bundler's module
// graph. Pointed at /public rather than a `new URL(..., import.meta.url)`
// bundler asset: the worker file internally imports a sibling module
// ("./maplibre-gl-shared.mjs") via a plain relative ESM import, and
// webpack's asset-URL copying only copies the worker file itself, not
// that sibling — the browser then 404s resolving the relative import
// against the copied file's hashed URL. Serving both files together from
// a stable public/ path (kept in sync by scripts/copy-maplibre-worker.mjs,
// run on postinstall) sidesteps the bundler entirely.
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
  withinImpact: boolean;
  geometry: PolygonGeometry;
}

const ALIGNMENT_COLOR = "#2563eb";
const IMPACT_OUTLINE_COLOR = "#ea580c";

// Esri World Imagery: free, keyless satellite/aerial basemap (Esri, Maxar,
// Earthstar Geographics — attribution required, shown in the legend).
export const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function statusHex(status: string): string {
  return toneHex(parcelStatusTone(status));
}

export function ProjectMap({
  alignment,
  parcels,
}: {
  alignment: Geometry | null;
  parcels: ParcelFeature[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [showAlignment, setShowAlignment] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [showImpact, setShowImpact] = useState(true);
  const [showSatellite, setShowSatellite] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureWorkerUrlConfigured();

    const center: [number, number] =
      alignment?.type === "LineString"
        ? alignment.coordinates[0]
        : alignment?.type === "Polygon"
          ? alignment.coordinates[0][0]
          : parcels[0]
            ? parcels[0].geometry.coordinates[0][0]
            : [82.71, 18.81];

    const map = new MapLibreMap({
      container: containerRef.current,
      // OpenFreeMap: free, keyless, full OSM detail (roads, buildings,
      // labels) — demotiles.maplibre.org is a bare placeholder tileset
      // with no street-level content, never meant for real use.
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom: 12,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");
    map.addControl(new FullscreenControl(), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      map.addSource("satellite", {
        type: "raster",
        tiles: [SATELLITE_TILE_URL],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Esri, Maxar, Earthstar Geographics",
      });
      // No beforeId: appends on top of the vector basemap's own layers
      // (which is everything that currently exists at this point in
      // `load`) but every alignment/parcel layer added below will stack
      // on top of this one in turn — satellite ends up sandwiched
      // between the base map and this project's own overlays, exactly
      // where a basemap swap belongs.
      map.addLayer({
        id: "satellite-raster",
        type: "raster",
        source: "satellite",
        layout: { visibility: "none" },
        paint: { "raster-opacity": 1 },
      });

      if (alignment) {
        map.addSource("alignment", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: alignment },
        });
        // Dual-line (tramline) styling — the standard cartographic
        // convention for a canal/waterway alignment, two parallel offset
        // strokes rather than one road-style line.
        map.addLayer({
          id: "alignment-line",
          type: "line",
          source: "alignment",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ALIGNMENT_COLOR, "line-width": 2.5, "line-offset": 3.5 },
        });
        map.addLayer({
          id: "alignment-line-2",
          type: "line",
          source: "alignment",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ALIGNMENT_COLOR, "line-width": 2.5, "line-offset": -3.5 },
        });
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
              areaHectares: p.areaHectares,
              withinImpact: p.withinImpact,
              fillColor: statusHex(p.status),
            },
            geometry: p.geometry,
          })),
        },
      });
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: { "line-color": "#1f2937", "line-width": 1 },
      });
      map.addLayer({
        id: "parcels-impact-outline",
        type: "line",
        source: "parcels",
        filter: ["==", ["get", "withinImpact"], true],
        paint: { "line-color": IMPACT_OUTLINE_COLOR, "line-width": 3, "line-dasharray": [2, 1] },
      });

      map.on("click", "parcels-fill", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as {
          village: string;
          status: string;
          areaHectares: number;
          withinImpact: boolean;
        };
        new Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:13px;line-height:1.5">
              <strong>${props.village}</strong><br/>
              <span style="display:inline-block;padding:1px 6px;border-radius:9999px;background:${statusHex(props.status)}22;color:${statusHex(props.status)};font-weight:600;font-size:11px;margin-top:2px">${props.status}</span><br/>
              Area: ${props.areaHectares} ha<br/>
              ${props.withinImpact ? `<span style="color:${IMPACT_OUTLINE_COLOR}">Within ${IMPACT_BUFFER_METERS}m impact buffer</span>` : "Outside impact buffer"}
            </div>`
          )
          .addTo(map);
      });
      map.on("mouseenter", "parcels-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [alignment, parcels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("alignment-line")) return;
    const visibility = showAlignment ? "visible" : "none";
    map.setLayoutProperty("alignment-line", "visibility", visibility);
    if (map.getLayer("alignment-line-2")) {
      map.setLayoutProperty("alignment-line-2", "visibility", visibility);
    }
  }, [showAlignment]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("parcels-fill")) return;
    const visibility = showParcels ? "visible" : "none";
    map.setLayoutProperty("parcels-fill", "visibility", visibility);
    map.setLayoutProperty("parcels-outline", "visibility", visibility);
  }, [showParcels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("parcels-impact-outline")) return;
    map.setLayoutProperty("parcels-impact-outline", "visibility", showImpact ? "visible" : "none");
  }, [showImpact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("satellite-raster")) return;
    map.setLayoutProperty("satellite-raster", "visibility", showSatellite ? "visible" : "none");
  }, [showSatellite]);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[28rem] w-full overflow-hidden rounded-lg border" />

      <div className="absolute left-3 top-3 z-10 w-48 space-y-2 rounded-lg border bg-background/95 p-3 text-xs shadow-sm backdrop-blur">
        <p className="font-semibold text-foreground">Layers</p>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSatellite}
            onChange={(e) => setShowSatellite(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          <span>Satellite imagery</span>
        </label>

        {alignment && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAlignment}
              onChange={(e) => setShowAlignment(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span className="flex h-3 w-4 shrink-0 flex-col justify-between">
              <span className="h-[1.5px] w-full" style={{ backgroundColor: ALIGNMENT_COLOR }} />
              <span className="h-[1.5px] w-full" style={{ backgroundColor: ALIGNMENT_COLOR }} />
            </span>
            <span>Alignment / canal</span>
          </label>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showParcels}
            onChange={(e) => setShowParcels(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          <span>Parcels</span>
        </label>

        {parcels.some((p) => p.withinImpact) && (
          <label className="flex items-center gap-2 pl-5">
            <input
              type="checkbox"
              checked={showImpact}
              onChange={(e) => setShowImpact(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span
              className="h-0.5 w-4 shrink-0 border-t-2 border-dashed"
              style={{ borderColor: IMPACT_OUTLINE_COLOR }}
            />
            <span>Impact buffer ({IMPACT_BUFFER_METERS}m)</span>
          </label>
        )}

        <div className="space-y-1 border-t pt-2">
          <p className="font-semibold text-foreground">Parcel status</p>
          {PARCEL_STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: statusHex(status) }}
              />
              <span>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
