"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapLibreMap,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Geometry, PolygonGeometry, Position } from "@/lib/geo";
import { polygonAreaHectares, computeBbox } from "@/lib/geo";
import { PARCEL_STATUSES, type ParcelStatus } from "@/lib/parcel-status";
import { SATELLITE_SOURCE_CONFIG, VECTOR_STYLE_URL } from "@/lib/tile-cache";
import { RecenterControl } from "@/lib/map-controls";

let workerUrlConfigured = false;
function ensureWorkerUrlConfigured() {
  if (workerUrlConfigured) return;
  setWorkerUrl("/maplibre-gl/maplibre-gl-worker.mjs");
  workerUrlConfigured = true;
}

type Mode = "idle" | "alignment" | "parcel";

interface ParcelFeature {
  id: string;
  village: string;
  surveyNumber: string | null;
  pattaNumber: string | null;
  geometry: PolygonGeometry;
}

export function GeometryEditor({
  projectId,
  alignment,
  parcels,
}: {
  projectId: string;
  alignment: Geometry | null;
  parcels: ParcelFeature[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [points, setPoints] = useState<Position[]>([]);
  const [village, setVillage] = useState("");
  const [status, setStatus] = useState<ParcelStatus>(PARCEL_STATUSES[0]);
  const [areaOverride, setAreaOverride] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [surveyNumber, setSurveyNumber] = useState("");
  const [pattaNumber, setPattaNumber] = useState("");
  const [suggested, setSuggested] = useState({ village: "", surveyNumber: "", pattaNumber: "" });
  const [satellite, setSatellite] = useState(true);
  const [cursor, setCursor] = useState<Position | null>(null);
  const [canRedo, setCanRedo] = useState(false);
  const [parcelQuery, setParcelQuery] = useState("");
  const [parcelPage, setParcelPage] = useState(0);
  const modeRef = useRef<Mode>("idle");
  const pointsRef = useRef<Position[]>([]);
  const undoHistoryRef = useRef<Position[][]>([]);
  const redoHistoryRef = useRef<Position[][]>([]);
  const parcelPageSize = 12;

  useEffect(() => {
    modeRef.current = mode;
    pointsRef.current = points;
  }, [mode, points]);

  const suggestedArea = mode === "parcel" && points.length >= 3 ? polygonAreaHectares(points) : 0;
  const area = areaOverride ?? suggestedArea;
  const filteredParcels = useMemo(() => {
    const query = parcelQuery.trim().toLowerCase();
    if (!query) return parcels;
    return parcels.filter((parcel) =>
      [parcel.village, parcel.surveyNumber, parcel.pattaNumber]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [parcels, parcelQuery]);
  const parcelPageCount = Math.max(1, Math.ceil(filteredParcels.length / parcelPageSize));
  const currentParcelPage = Math.min(parcelPage, parcelPageCount - 1);
  const visibleParcels = filteredParcels.slice(
    currentParcelPage * parcelPageSize,
    (currentParcelPage + 1) * parcelPageSize
  );

  const recenterFnRef = useRef<() => void>(() => {});

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
      style: VECTOR_STYLE_URL,
      center,
      zoom: 13,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");
    map.addControl(new FullscreenControl(), "top-right");
    map.addControl(new RecenterControl(() => recenterFnRef.current()), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");

    // Live coordinate readout. Drawing a boundary against a basemap is
    // guesswork without being able to read off the position under the cursor,
    // and surveyors work in explicit lat/long.
    map.on("mousemove", (e) => setCursor([e.lngLat.lng, e.lngLat.lat]));
    map.on("mouseout", () => setCursor(null));

    map.on("load", () => {
      // Satellite basemap beneath the vector style: a parcel boundary has to
      // be drawn against what is actually on the ground (field bunds, roads,
      // structures), which the road-map style does not show.
      map.addSource("satellite", SATELLITE_SOURCE_CONFIG);
      // Added with no beforeId, so it sits ON TOP of the vector basemap.
      // Inserting it underneath instead hides it completely: the OpenFreeMap
      // style's first layer is an opaque background fill. The draft geometry
      // layers below are added after this one, so they still draw above it.
      map.addLayer({
        id: "satellite-layer",
        type: "raster",
        source: "satellite",
        layout: { visibility: "visible" },
      });

      if (alignment) {
        map.addSource("existing-alignment", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: alignment },
        });
        map.addLayer({
          id: "existing-alignment-line",
          type: "line",
          source: "existing-alignment",
          paint: { "line-color": "#94a3b8", "line-width": 3, "line-dasharray": [1, 1] },
        });
      }

      map.addSource("existing-parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: parcels.map((p) => ({
            type: "Feature",
            properties: { village: p.village },
            geometry: p.geometry,
          })),
        },
      });
      map.addLayer({
        id: "existing-parcels-outline",
        type: "line",
        source: "existing-parcels",
        paint: { "line-color": "#94a3b8", "line-width": 1 },
      });

      map.addSource("draft", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "draft-fill",
        type: "fill",
        source: "draft",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#16a34a", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "draft-line",
        type: "line",
        source: "draft",
        paint: { "line-color": "#16a34a", "line-width": 3 },
      });
      map.addLayer({
        id: "draft-points",
        type: "circle",
        source: "draft",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 5, "circle-color": "#16a34a" },
      });

      setMapReady(true);

      map.on("click", (e) => {
        if (modeRef.current === "idle") return;
        const next: Position[] = [...pointsRef.current, [e.lngLat.lng, e.lngLat.lat]];
        undoHistoryRef.current.push(pointsRef.current);
        redoHistoryRef.current = [];
        pointsRef.current = next;
        setPoints(next);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw the draft layer whenever the in-progress points change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getSource("draft")) return;
    const features: GeoJSON.Feature[] = points.map((p) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: p },
    }));
    if (points.length >= 2) {
      if (mode === "parcel" && points.length >= 3) {
        features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [[...points, points[0]]] },
        });
      } else {
        features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: points },
        });
      }
    }
    (map.getSource("draft") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    });
  }, [points, mode, mapReady]);

  // Satellite visibility is toggled on the existing layer rather than by
  // rebuilding the style, so the in-progress draft geometry survives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer("satellite-layer")) return;
    map.setLayoutProperty("satellite-layer", "visibility", satellite ? "visible" : "none");
  }, [satellite, mapReady]);

  function startAlignment() {
    setMode("alignment");
    setPoints([]);
    undoHistoryRef.current = [];
    redoHistoryRef.current = [];
    setCanRedo(false);
  }
  function startParcel() {
    setMode("parcel");
    setPoints([]);
    undoHistoryRef.current = [];
    redoHistoryRef.current = [];
    setCanRedo(false);
    if (suggested.village) setVillage(suggested.village);
    if (suggested.surveyNumber) setSurveyNumber(suggested.surveyNumber);
    if (suggested.pattaNumber) setPattaNumber(suggested.pattaNumber);
    setAreaOverride(null);
  }
  function cancelDraw() {
    setMode("idle");
    setPoints([]);
    setAreaOverride(null);
    // Identifiers must not survive into the next parcel — cancelDraw also runs
    // after a successful save, and carrying a survey number over would quietly
    // register two parcels under the same land-record reference.
    setSurveyNumber("");
    setPattaNumber("");
    setVillage("");
    undoHistoryRef.current = [];
    redoHistoryRef.current = [];
    setCanRedo(false);
  }
  function undoPoint() {
    const previous = undoHistoryRef.current.pop();
    if (!previous) return;
    redoHistoryRef.current.push(pointsRef.current);
    setCanRedo(true);
    pointsRef.current = previous;
    setPoints(previous);
  }
  function redoPoint() {
    const next = redoHistoryRef.current.pop();
    setCanRedo(redoHistoryRef.current.length > 0);
    if (!next) return;
    undoHistoryRef.current.push(pointsRef.current);
    pointsRef.current = next;
    setPoints(next);
  }
  function clearPoints() {
    if (pointsRef.current.length === 0) return;
    undoHistoryRef.current.push(pointsRef.current);
    redoHistoryRef.current = [];
    setCanRedo(false);
    pointsRef.current = [];
    setPoints([]);
  }

  useEffect(() => {
    fetch(`/api/projects/${projectId}/parcels`)
      .then((res) => res.json())
      .then((body: { suggestedIdentifiers?: typeof suggested }) => {
        if (body.suggestedIdentifiers) setSuggested(body.suggestedIdentifiers);
      })
      .catch((error) => console.warn("Could not load parcel suggestions", error));
  }, [projectId, parcels.length]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("existing-parcels") as GeoJSONSource | undefined;
    if (!source || !mapReady) return;
    source.setData({
      type: "FeatureCollection",
      features: parcels.map((p) => ({
        type: "Feature",
        properties: { id: p.id, village: p.village },
        geometry: p.geometry,
      })),
    });
  }, [parcels, mapReady]);

  async function removeParcel(parcel: ParcelFeature) {
    if (!window.confirm(`Delete parcel ${parcel.surveyNumber ?? parcel.id}?`)) return;
    const res = await fetch(`/api/projects/${projectId}/parcels?parcelId=${encodeURIComponent(parcel.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? "Failed to delete parcel");
      return;
    }
    toast.success("Parcel deleted");
    router.refresh();
  }

  async function saveAlignment() {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/geometry`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "LineString", coordinates: points }),
    });
    const body = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to save alignment");
      return;
    }
    toast.success("Alignment saved");
    cancelDraw();
    router.refresh();
  }

  async function saveParcel() {
    const parcelVillage = village.trim() || suggested.village;
    if (!parcelVillage) {
      toast.error("Village could not be generated");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/parcels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        village: parcelVillage,
        areaHectares: area,
        status,
        surveyNumber: surveyNumber.trim(),
        pattaNumber: pattaNumber.trim(),
        geometry: { type: "Polygon", coordinates: [[...points, points[0]]] },
      }),
    });
    const body = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to save parcel");
      return;
    }
    toast.success("Parcel added");
    cancelDraw();
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {mode === "idle" ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={startAlignment}>
              {alignment ? "Redraw alignment" : "Draw alignment"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={startParcel}>
              Draw new parcel
            </Button>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">
              {mode === "alignment"
                ? `Click the map to place alignment points (${points.length} so far, need at least 2).`
                : `Click the map to place parcel corners (${points.length} so far, need at least 3).`}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={undoPoint} disabled={points.length === 0}>
              Undo point
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={redoPoint} disabled={!canRedo}>
              Redo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearPoints} disabled={points.length === 0}>
              Clear
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelDraw}>
              Cancel
            </Button>
          </>
        )}
      </div>

      <div className="relative">
        <div ref={containerRef} className="h-[28rem] w-full overflow-hidden rounded-lg border" />

        <label className="absolute left-3 top-3 z-10 flex cursor-pointer items-center gap-2 rounded border bg-background/95 px-2.5 py-1.5 text-xs font-medium shadow-sm">
          <input
            type="checkbox"
            checked={satellite}
            onChange={(e) => setSatellite(e.target.checked)}
          />
          Satellite imagery
        </label>

        {/* Cursor position, in the decimal degrees a survey record uses. */}
        <div className="absolute bottom-3 left-3 z-10 rounded border bg-background/95 px-2.5 py-1.5 font-mono text-[11px] shadow-sm">
          {cursor
            ? `${cursor[1].toFixed(6)}° N, ${cursor[0].toFixed(6)}° E`
            : "Move the cursor over the map for coordinates"}
        </div>

      </div>

      {parcels.length > 0 && (
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Existing parcels</p>
              <p className="text-xs text-muted-foreground">
                Showing {filteredParcels.length === 0 ? 0 : currentParcelPage * parcelPageSize + 1}-
                {Math.min((currentParcelPage + 1) * parcelPageSize, filteredParcels.length)} of {filteredParcels.length}
                {parcelQuery ? ` matching “${parcelQuery}”` : ""}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleRecenter}>Focus all</Button>
          </div>
          <Input
            value={parcelQuery}
            onChange={(event) => {
              setParcelQuery(event.target.value);
              setParcelPage(0);
            }}
            placeholder="Search village, survey no., or patta no."
            aria-label="Search existing parcels"
            className="mb-3 h-9"
          />
          <div className="max-h-[24rem] overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
            {visibleParcels.map((parcel) => (
              <div key={parcel.id} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                <span>
                  <span className="font-medium">{parcel.surveyNumber ?? "Unnumbered parcel"}</span>
                  <span className="ml-2 text-muted-foreground">{parcel.village}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" className="text-red-700" onClick={() => removeParcel(parcel)}>
                  Delete
                </Button>
              </div>
            ))}
            </div>
          </div>
          {filteredParcels.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No parcels match this search.</p>
          )}
          {parcelPageCount > 1 && (
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentParcelPage === 0}
                onClick={() => setParcelPage((page) => Math.max(0, page - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentParcelPage + 1} of {parcelPageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentParcelPage >= parcelPageCount - 1}
                onClick={() => setParcelPage((page) => Math.min(parcelPageCount - 1, page + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {points.length > 0 && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Placed points ({points.length})
            {mode === "parcel" && points.length >= 3
              ? ` · computed extent ${suggestedArea.toFixed(4)} ha`
              : ""}
          </summary>
          <ol className="mt-2 space-y-0.5 font-mono text-xs text-muted-foreground">
            {points.map((p, i) => (
              <li key={`${p[0]}-${p[1]}-${i}`}>
                {String(i + 1).padStart(2, "0")}. {p[1].toFixed(6)}° N, {p[0].toFixed(6)}° E
              </li>
            ))}
          </ol>
        </details>
      )}

      {mode === "alignment" && points.length >= 2 && (
        <Button type="button" onClick={saveAlignment} disabled={saving}>
          {saving ? "Saving…" : `Save alignment (${points.length} points)`}
        </Button>
      )}

      {mode === "parcel" && points.length >= 3 && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          {/* Survey and patta numbers are how a parcel is identified in the
              land record and in every downstream award document, so they are
              captured at the point of drawing rather than left blank. */}
          <div className="space-y-1">
            <Label htmlFor="geo-survey">Survey No.</Label>
            <Input
              id="geo-survey"
              value={surveyNumber}
              onChange={(e) => setSurveyNumber(e.target.value)}
              placeholder={suggested.surveyNumber || "e.g. 104/2"}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="geo-patta">Patta No.</Label>
            <Input
              id="geo-patta"
              value={pattaNumber}
              onChange={(e) => setPattaNumber(e.target.value)}
              placeholder={suggested.pattaNumber || "auto-generated"}
              className="w-36"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="geo-village">Previous / revenue village</Label>
            <Input
              id="geo-village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={suggested.village || "auto-generated"}
              className="w-48"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="geo-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ParcelStatus)}>
              <SelectTrigger id="geo-status" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARCEL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="geo-area">Area (ha)</Label>
            <Input
              id="geo-area"
              type="number"
              step="any"
              value={area}
              onChange={(e) => setAreaOverride(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <Button type="button" onClick={saveParcel} disabled={saving}>
            {saving ? "Saving…" : "Save parcel"}
          </Button>
        </div>
      )}
    </div>
  );
}
