"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compensationTone, toneBadgeClass } from "@/lib/status-colors";
import { formatDateTime } from "@/lib/format";

interface ParcelWithCompensation {
  id: string;
  village: string;
  areaHectares: number;
  compensation: { id: string; total: number; status: string } | null;
}

interface RateHistoryEntry {
  id: string;
  ratePerHectare: number;
  multiplier: number;
  setBy: string;
  createdAt: Date;
}

const PAGE_SIZE = 25;

function ParcelRow({
  projectId,
  parcel,
  canAssess,
  datesResolved,
  pending,
  setPending,
  onDone,
}: {
  projectId: string;
  parcel: ParcelWithCompensation;
  canAssess: boolean;
  datesResolved: boolean;
  pending: string | null;
  setPending: (v: string | null) => void;
  onDone: () => void;
}) {
  async function handleAssess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(parcel.id);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/parcels/${parcel.id}/compensation`, {
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
    onDone();
  }

  async function handlePay() {
    if (!parcel.compensation) return;
    setPending(parcel.compensation.id);
    const res = await fetch(`/api/compensation/${parcel.compensation.id}/pay`, {
      method: "POST",
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to mark paid");
      return;
    }
    toast.success("Marked as paid");
    onDone();
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{parcel.village}</TableCell>
      <TableCell className="text-muted-foreground">{parcel.areaHectares.toFixed(2)}</TableCell>
      <TableCell>
        {parcel.compensation ? (
          <span>Rs {parcel.compensation.total.toLocaleString("en-IN")}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {parcel.compensation ? (
          <Badge
            variant="outline"
            className={toneBadgeClass(compensationTone(parcel.compensation.status))}
          >
            {parcel.compensation.status}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Unassessed</span>
        )}
      </TableCell>
      <TableCell>
        {parcel.compensation ? (
          canAssess &&
          parcel.compensation.status === "ASSESSED" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePay}
              disabled={pending !== null}
            >
              {pending === parcel.compensation.id ? "Working…" : "Mark paid"}
            </Button>
          )
        ) : (
          canAssess &&
          datesResolved && (
            <form onSubmit={handleAssess} className="flex items-center gap-2">
              <Input
                aria-label="Assets value (Rs)"
                name="assetsValue"
                type="number"
                step="any"
                defaultValue={0}
                className="h-8 w-28"
              />
              <Button type="submit" size="sm" variant="outline" disabled={pending !== null}>
                {pending === parcel.id ? "…" : "Assess"}
              </Button>
            </form>
          )
        )}
      </TableCell>
    </TableRow>
  );
}

export function CompensationPanel({
  projectId,
  canManageRate,
  canAssess,
  datesResolved,
  currentRate,
  parcels,
  rateHistory,
}: {
  projectId: string;
  canManageRate: boolean;
  canAssess: boolean;
  datesResolved: boolean;
  currentRate: { ratePerHectare: number; multiplier: number } | null;
  parcels: ParcelWithCompensation[];
  rateHistory: RateHistoryEntry[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(parcels.length / PAGE_SIZE));
  const pageParcels = useMemo(
    () => parcels.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [parcels, page]
  );

  const paidTotal = parcels.reduce(
    (sum, p) => sum + (p.compensation?.status === "PAID" ? p.compensation.total : 0),
    0
  );
  const assessedTotal = parcels.reduce((sum, p) => sum + (p.compensation?.total ?? 0), 0);

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

  function onRowDone() {
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
            {pending === "rate" ? "Saving…" : "Set current rate"}
          </Button>
        </form>
      )}

      {rateHistory.length > 1 && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Rate history ({rateHistory.length} revisions)
          </summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {rateHistory.map((r) => (
              <li key={r.id}>
                Rs {r.ratePerHectare.toLocaleString("en-IN")}/ha &times; {r.multiplier} — set by{" "}
                {r.setBy} on {formatDateTime(r.createdAt)}
              </li>
            ))}
          </ul>
        </details>
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
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {parcels.length} parcels &middot; Rs {paidTotal.toLocaleString("en-IN")} paid of Rs{" "}
            {assessedTotal.toLocaleString("en-IN")} assessed
          </p>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Village</TableHead>
                  <TableHead>Area (ha)</TableHead>
                  <TableHead>Compensation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageParcels.map((p) => (
                  <ParcelRow
                    key={p.id}
                    projectId={projectId}
                    parcel={p}
                    canAssess={canAssess}
                    datesResolved={datesResolved}
                    pending={pending}
                    setPending={setPending}
                    onDone={onRowDone}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
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
      )}
    </div>
  );
}
