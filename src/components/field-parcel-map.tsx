"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  MapLibreMap,
  NavigationControl,
  FullscreenControl,
  GeolocateControl,
  GeoJSONSource,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geometry, PolygonGeometry } from "@/lib/geo";
import { computeBbox } from "@/lib/geo";
import type { ParcelStatus } from "@/lib/parcel-status";
import { parcelStatusTone, toneHex } from "@/lib/status-colors";
import { PARCEL_STATUSES } from "@/lib/parcel-status";
import { Input } from "@/components/ui/input";
import { FieldParcelCard } from "@/components/field-parcel-card";
import { VECTOR_STYLE_URL } from "@/lib/tile-cache";

let workerUrlConfigured = false;
function ensureWorkerUrlConfigured() {
  if (workerUrlConfigured) return;
  setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");
  workerUrlConfigured = true;
}

interface FieldParcel {
  id: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  surveyNumber: string | null;
  pattaNumber: string | null;
  geometry: PolygonGeometry;
}

function statusHex(status: string): string {
  return toneHex(parcelStatusTone(status));
}

function polygonCenter(geometry: PolygonGeometry): [number, number] {
  const ring = geometry.coordinates[0];
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 }
  );
  return [sum.lng / ring.length, sum.lat / ring.length];
}

function matchesQuery(parcel: FieldParcel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    parcel.village.toLowerCase().includes(q) ||
    (parcel.surveyNumber?.toLowerCase().includes(q) ?? false) ||
    (parcel.pattaNumber?.toLowerCase().includes(q) ?? false)
  );
}

// Lets a field officer find and update a parcel by tapping it on a real
// map — the way they'd actually locate it on the ground — instead of
// scrolling a flat list of visually identical rows. Search narrows which
// parcels are highlighted/clickable so a large project stays usable.
export function FieldParcelMap({
  parcels,
  canUpdate,
}: {
  parcels: FieldParcel[];
  canUpdate: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const parcelsById = useMemo(() => new Map(parcels.map((p) => [p.id, p])), [parcels]);

  const filtered = useMemo(() => parcels.filter((p) => matchesQuery(p, query)), [parcels, query]);
  const filteredIds = useMemo(() => new Set(filtered.map((p) => p.id)), [filtered]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || parcels.length === 0) return;
    ensureWorkerUrlConfigured();

    const center = polygonCenter(parcels[0].geometry);
    const map = new MapLibreMap({
      container: containerRef.current,
      style: VECTOR_STYLE_URL,
      center,
      zoom: 15,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");
    map.addControl(new FullscreenControl(), "top-right");
    map.addControl(
      new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      "top-right"
    );

    map.on("error", (e) => {
      console.error("Field map error:", e.error);
      setStatus("error");
    });

    map.on("load", () => {
      map.addSource("field-parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: parcels.map((p) => ({
            type: "Feature",
            properties: { id: p.id, fillColor: statusHex(p.status), dimmed: false },
            geometry: p.geometry,
          })),
        },
      });
      map.addLayer({
        id: "field-parcels-fill",
        type: "fill",
        source: "field-parcels",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": ["case", ["get", "dimmed"], 0.15, 0.6],
        },
      });
      map.addLayer({
        id: "field-parcels-outline",
        type: "line",
        source: "field-parcels",
        paint: { "line-color": "#1f2937", "line-width": 1 },
      });
      map.addLayer({
        id: "field-parcels-selected",
        type: "line",
        source: "field-parcels",
        filter: ["==", ["get", "id"], ""],
        paint: { "line-color": "#2563eb", "line-width": 4 },
      });

      map.on("click", "field-parcels-fill", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) setSelectedId(id);
      });
      map.on("mouseenter", "field-parcels-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "field-parcels-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      setStatus("ready");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels]);

  // Dim parcels that don't match the current search, so a field officer
  // scanning the map can see at a glance which plot they're looking for.
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource<GeoJSONSource>("field-parcels");
    if (!map || !source || status !== "ready") return;
    source.setData({
      type: "FeatureCollection",
      features: parcels.map((p) => ({
        type: "Feature",
        properties: {
          id: p.id,
          fillColor: statusHex(p.status),
          dimmed: query.trim().length > 0 && !filteredIds.has(p.id),
        },
        geometry: p.geometry,
      })),
    });
  }, [query, filteredIds, parcels, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("field-parcels-selected")) return;
    map.setFilter("field-parcels-selected", ["==", ["get", "id"], selectedId ?? ""]);
  }, [selectedId]);

  // Flying to a single unambiguous search match saves the officer from
  // hunting for it visually once they've typed a specific survey/patta no.
  useEffect(() => {
    if (filtered.length !== 1) return;
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    setSelectedId(filtered[0].id);
    map.flyTo({ center: polygonCenter(filtered[0].geometry), zoom: 18, duration: 800 });
  }, [filtered, status]);

  const selected = selectedId ? parcelsById.get(selectedId) : null;

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search village, survey no., or patta no."
        className="h-11 text-base"
        aria-label="Search parcels on map"
      />
      {query.trim() && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {parcels.length} parcels highlighted
        </p>
      )}

      <div className="relative h-[24rem] w-full overflow-hidden rounded-lg border">
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        {/* Recenter button */}
        <button
          type="button"
          onClick={() => {
            const map = mapRef.current;
            if (!map || parcels.length === 0) return;
            const geoms: Geometry[] = parcels.map((p) => p.geometry);
            const bounds = computeBbox(geoms);
            map.fitBounds(bounds, { padding: 50, duration: 800 });
          }}
          title="Recenter map"
          className="absolute right-3 top-[7.5rem] z-10 flex h-[29px] w-[29px] items-center justify-center rounded border bg-background shadow-sm hover:bg-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/60">
            <p className="text-sm text-muted-foreground">Loading map…</p>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load the map — check your network and reload.
            </p>
          </div>
        )}
        <div className="absolute left-3 top-3 z-10 space-y-1 rounded-lg border bg-background/95 p-2 text-[11px] shadow-sm backdrop-blur">
          {PARCEL_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: statusHex(s) }}
              />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Tapped on the map:</p>
          <FieldParcelCard parcel={selected} canUpdate={canUpdate} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tap a parcel on the map to select it.</p>
      )}
    </div>
  );
}
