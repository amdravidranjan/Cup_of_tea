"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { compensationTone, toneBadgeClass } from "@/lib/status-colors";

interface ParcelWithCompensation {
  id: string;
  village: string;
  areaHectares: number;
  compensation: { id: string; total: number; status: string } | null;
}

export function CompensationPanel({
  projectId,
  canManageRate,
  canAssess,
  datesResolved,
  currentRate,
  parcels,
}: {
  projectId: string;
  canManageRate: boolean;
  canAssess: boolean;
  datesResolved: boolean;
  currentRate: { ratePerHectare: number; multiplier: number } | null;
  parcels: ParcelWithCompensation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function handleSetRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("rate");
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/compensation-rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratePerHectare: Number(formData.get("ratePerHectare")),
        multiplier: Number(formData.get("multiplier")),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to set rate");
      return;
    }
    toast.success("Compensation rate updated");
    router.refresh();
  }

  async function handleAssess(event: FormEvent<HTMLFormElement>, parcelId: string) {
    event.preventDefault();
    setPending(parcelId);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/parcels/${parcelId}/compensation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        assetsValue: Number(formData.get("assetsValue") ?? 0),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to assess compensation");
      return;
    }
    toast.success("Compensation assessed");
    router.refresh();
  }

  async function handlePay(compensationId: string) {
    setPending(compensationId);
    const res = await fetch(`/api/compensation/${compensationId}/pay`, { method: "POST" });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to mark paid");
      return;
    }
    toast.success("Marked as paid");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManageRate && (
        <form onSubmit={handleSetRate} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="ratePerHectare">Rate (Rs/hectare)</Label>
            <Input
              id="ratePerHectare"
              name="ratePerHectare"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.ratePerHectare}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="multiplier">Multiplier</Label>
            <Input
              id="multiplier"
              name="multiplier"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.multiplier ?? 1}
              className="w-24"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending !== null}>
            {pending === "rate" ? "Saving..." : "Set current rate"}
          </Button>
        </form>
      )}

      {!currentRate && (
        <p className="text-sm text-muted-foreground">
          No compensation rate set for this district yet.
        </p>
      )}

      {currentRate && !datesResolved && (
        <p className="text-sm text-muted-foreground">
          Compensation can be assessed once the project reaches the AWARDED stage (needs both
          the SIA notification date and the award date from its own history).
        </p>
      )}

      {currentRate && parcels.length > 0 && (
        <div className="space-y-2">
          {parcels.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3 text-sm">
                <p className="font-medium">
                  {p.village} &middot; {p.areaHectares} ha
                </p>
                {p.compensation ? (
                  <div className="mt-1 flex items-center gap-3">
                    <span>Total: Rs {p.compensation.total.toLocaleString("en-IN")}</span>
                    <Badge
                      variant="outline"
                      className={toneBadgeClass(compensationTone(p.compensation.status))}
                    >
                      {p.compensation.status}
                    </Badge>
                    {canAssess && p.compensation.status === "ASSESSED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handlePay(p.compensation!.id)}
                        disabled={pending !== null}
                      >
                        {pending === p.compensation.id ? "Working..." : "Mark paid"}
                      </Button>
                    )}
                  </div>
                ) : (
                  canAssess &&
                  datesResolved && (
                    <form
                      onSubmit={(e) => handleAssess(e, p.id)}
                      className="mt-2 flex items-end gap-2"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Assets value (Rs)</Label>
                        <Input
                          name="assetsValue"
                          type="number"
                          step="any"
                          defaultValue={0}
                          className="w-32 h-8"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={pending !== null}
                      >
                        {pending === p.id ? "Assessing..." : "Assess compensation"}
                      </Button>
                    </form>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
