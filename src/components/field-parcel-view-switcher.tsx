"use client";

import { useState } from "react";
import type { PolygonGeometry } from "@/lib/geo";
import type { ParcelStatus } from "@/lib/parcel-status";
import { FieldParcelList } from "@/components/field-parcel-list";
import { FieldParcelMap } from "@/components/field-parcel-map";

interface FieldParcel {
  id: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  surveyNumber: string | null;
  pattaNumber: string | null;
  geometry: PolygonGeometry;
}

export function FieldParcelViewSwitcher({
  parcels,
  canUpdate,
}: {
  parcels: FieldParcel[];
  canUpdate: boolean;
}) {
  const [view, setView] = useState<"list" | "map">("map");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => setView("map")}
          className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
            view === "map" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
            view === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          List
        </button>
      </div>

      {view === "map" ? (
        <FieldParcelMap parcels={parcels} canUpdate={canUpdate} />
      ) : (
        <FieldParcelList parcels={parcels} canUpdate={canUpdate} />
      )}
    </div>
  );
}
