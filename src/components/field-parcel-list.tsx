"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldParcelCard } from "@/components/field-parcel-card";
import type { ParcelStatus } from "@/lib/parcel-status";

interface FieldParcel {
  id: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
}

const PAGE_SIZE = 20;

export function FieldParcelList({
  parcels,
  canUpdate,
}: {
  parcels: FieldParcel[];
  canUpdate: boolean;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(parcels.length / PAGE_SIZE));
  const pageParcels = useMemo(
    () => parcels.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [parcels, page]
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{parcels.length} parcels</p>
      {pageParcels.map((parcel) => (
        <FieldParcelCard key={parcel.id} parcel={parcel} canUpdate={canUpdate} />
      ))}
      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
