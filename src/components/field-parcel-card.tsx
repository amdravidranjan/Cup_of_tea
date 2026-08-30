"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nextParcelStatus, type ParcelStatus } from "@/lib/parcel-status";
import { toneBadgeClass, parcelStatusTone } from "@/lib/status-colors";
import { enqueue, makeLocalStorageQueue } from "@/lib/offline-queue";

interface FieldParcel {
  id: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
}

export function FieldParcelCard({
  parcel,
  canUpdate,
}: {
  parcel: FieldParcel;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<ParcelStatus | null>(null);
  const [queued, setQueued] = useState(false);

  const currentStatus = optimisticStatus ?? parcel.status;
  const next = nextParcelStatus(currentStatus);

  async function advance() {
    if (!next) return;
    setPending(true);
    try {
      const res = await fetch(`/api/parcels/${parcel.id}/advance-status`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      setPending(false);
      if (!res.ok) {
        toast.error(body.error ?? "Failed to update parcel status");
        return;
      }
      toast.success(`${parcel.village} marked ${next}`);
      router.refresh();
    } catch {
      // Network failure (offline) — queue for sync instead of losing the
      // field officer's work. Update optimistically so the card still
      // reflects what they just recorded.
      enqueue(makeLocalStorageQueue(), {
        url: `/api/parcels/${parcel.id}/advance-status`,
        method: "POST",
        label: `Mark ${parcel.village} as ${next}`,
      });
      setOptimisticStatus(next);
      setQueued(true);
      setPending(false);
      toast.info(`Offline — queued "${parcel.village} → ${next}", will sync automatically`);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-medium">{parcel.village}</p>
            <p className="text-sm text-muted-foreground">{parcel.areaHectares.toFixed(2)} ha</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={`${toneBadgeClass(parcelStatusTone(currentStatus))} text-sm`}
            >
              {currentStatus}
            </Badge>
            {queued && (
              <span className="text-xs text-muted-foreground">Queued — pending sync</span>
            )}
          </div>
        </div>
        {canUpdate && next && !queued && (
          <Button className="h-11 w-full text-base" disabled={pending} onClick={advance}>
            {pending ? "Updating…" : `Mark as ${next}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
