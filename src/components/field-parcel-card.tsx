"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nextParcelStatus, type ParcelStatus } from "@/lib/parcel-status";
import { toneBadgeClass, parcelStatusTone } from "@/lib/status-colors";

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

  const next = nextParcelStatus(parcel.status);

  async function advance() {
    setPending(true);
    const res = await fetch(`/api/parcels/${parcel.id}/advance-status`, { method: "POST" });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to update parcel status");
      return;
    }
    toast.success(`${parcel.village} marked ${next}`);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-medium">{parcel.village}</p>
            <p className="text-sm text-muted-foreground">{parcel.areaHectares.toFixed(2)} ha</p>
          </div>
          <Badge
            variant="outline"
            className={`${toneBadgeClass(parcelStatusTone(parcel.status))} text-sm`}
          >
            {parcel.status}
          </Badge>
        </div>
        {canUpdate && next && (
          <Button className="h-11 w-full text-base" disabled={pending} onClick={advance}>
            {pending ? "Updating…" : `Mark as ${next}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
