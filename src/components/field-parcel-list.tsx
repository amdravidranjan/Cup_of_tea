"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldParcelCard } from "@/components/field-parcel-card";
import type { ParcelStatus } from "@/lib/parcel-status";

interface FieldParcel {
  id: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  surveyNumber?: string | null;
  pattaNumber?: string | null;
}

const PAGE_SIZE = 20;

function matchesQuery(parcel: FieldParcel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    parcel.village.toLowerCase().includes(q) ||
    (parcel.surveyNumber?.toLowerCase().includes(q) ?? false) ||
    (parcel.pattaNumber?.toLowerCase().includes(q) ?? false)
  );
}

export function FieldParcelList({
  parcels,
  canUpdate,
}: {
  parcels: FieldParcel[];
  canUpdate: boolean;
}) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => parcels.filter((p) => matchesQuery(p, query)),
    [parcels, query]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageParcels = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filtered, currentPage]
  );

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        placeholder="Search village, survey no., or patta no."
        className="h-11 text-base"
        aria-label="Search parcels"
      />
      <p className="text-sm text-muted-foreground">
        {filtered.length} of {parcels.length} parcels
      </p>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parcels match &quot;{query}&quot;.</p>
      ) : (
        pageParcels.map((parcel) => (
          <FieldParcelCard key={parcel.id} parcel={parcel} canUpdate={canUpdate} />
        ))
      )}
      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
