"use client";

import { useEffect, useRef } from "react";
import { MapLibreMap, NavigationControl, Popup, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geometry, PolygonGeometry } from "@/lib/geo";

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

export function ProjectMap({
  alignment,
  parcels,
}: {
  alignment: Geometry | null;
  parcels: ParcelFeature[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureWorkerUrlConfigured();

    const center: [number, number] =
      alignment?.type === "LineString"
        ? alignment.coordinates[0]
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

    map.on("load", () => {
      if (alignment) {
        map.addSource("alignment", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: alignment },
        });
        map.addLayer({
          id: "alignment-line",
          type: "line",
          source: "alignment",
          paint: { "line-color": "#2563eb", "line-width": 4 },
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
          "fill-color": ["case", ["get", "withinImpact"], "#f97316", "#22c55e"],
          "fill-opacity": 0.5,
        },
      });
      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: { "line-color": "#1f2937", "line-width": 1 },
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
            `<strong>${props.village}</strong><br/>Status: ${props.status}<br/>Area: ${props.areaHectares} ha<br/>${
              props.withinImpact ? "Within impact buffer" : "Outside impact buffer"
            }`
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

  return (
    <div
      ref={containerRef}
      className="h-96 w-full overflow-hidden rounded-lg border"
    />
  );
}
