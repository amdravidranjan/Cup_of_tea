"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bilingual } from "@/components/bilingual";
import { compensationTone, parcelStatusTone, toneBadgeClass } from "@/lib/status-colors";
import { formatArea, formatCurrency, formatCurrencyCompact, formatDateTime } from "@/lib/format";

export interface CompensationDetail {
  id: string;
  total: number;
  status: string;
  ratePerHectare: number;
  multiplier: number;
  marketValue: number;
  multipliedMarketValue: number;
  assetsValue: number;
  solatium: number;
  interest: number;
  assessedBy: string;
  assessedAt: Date;
  paidAt: Date | null;
}

export interface ParcelWithCompensation {
  id: string;
  village: string;
  areaHectares: number;
  surveyNumber: string | null;
  pattaNumber: string | null;
  status: string;
  withinImpact: boolean;
  compensation: CompensationDetail | null;
}

interface RateHistoryEntry {
  id: string;
  ratePerHectare: number;
  multiplier: number;
  setBy: string;
  createdAt: Date;
}

const PAGE_SIZE = 25;

type StatusFilter = "ALL" | "UNASSESSED" | "ASSESSED" | "PAID";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "UNASSESSED", label: "Unassessed" },
  { value: "ASSESSED", label: "Assessed" },
  { value: "PAID", label: "Paid" },
];

function parcelLabel(p: ParcelWithCompensation): string {
  return p.surveyNumber ? `Survey No. ${p.surveyNumber}` : "Parcel";
}

/**
 * The award breakdown, shown when a row is opened. The rows here mirror the
 * RFCTLARR First Schedule order (market value -> multiplier -> assets ->
 * solatium -> interest) so the figure can be checked line by line against the
 * statute rather than being presented as one opaque total.
 */
function AwardBreakdown({
  parcel,
  comp,
}: {
  parcel: ParcelWithCompensation;
  comp: CompensationDetail;
}) {
  const rows: { label: string; hint?: string; value: string; strong?: boolean }[] = [
    {
      label: "Market value of land",
      hint: `${formatCurrency(comp.ratePerHectare)}/ha × ${formatArea(parcel.areaHectares)}`,
      value: formatCurrency(comp.marketValue),
    },
    {
      label: `Factor applied (×${comp.multiplier})`,
      hint: "Rural/urban multiplier under the First Schedule",
      value: formatCurrency(comp.multipliedMarketValue),
    },
    {
      label: "Value of assets attached to land",
      hint: "Structures, trees, wells and standing crops",
      value: formatCurrency(comp.assetsValue),
    },
    {
      label: "Solatium (100%)",
      hint: "Statutory compensation for compulsory nature of acquisition",
      value: formatCurrency(comp.solatium),
    },
    {
      label: "Interest",
      hint: "Accrued from the date of the Section 11 notification",
      value: formatCurrency(comp.interest),
    },
    { label: "Total award", value: formatCurrency(comp.total), strong: true },
  ];

  return (
    <dl className="divide-y rounded-lg border">
      {rows.map((r) => (
        <div
          key={r.label}
          className={`flex items-baseline justify-between gap-4 px-3 py-2 ${
            r.strong ? "bg-muted/60" : ""
          }`}
        >
          <div>
            <dt className={`text-sm ${r.strong ? "font-semibold" : ""}`}>{r.label}</dt>
            {r.hint && <p className="text-xs text-muted-foreground">{r.hint}</p>}
          </div>
          <dd
            className={`shrink-0 font-mono text-sm tabular-nums ${
              r.strong ? "font-semibold" : ""
            }`}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ParcelDetailDialog({
  parcel,
  onOpenChange,
}: {
  parcel: ParcelWithCompensation | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={parcel !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {parcel && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono">{parcelLabel(parcel)}</DialogTitle>
              <DialogDescription>
                {parcel.village}
                {parcel.pattaNumber ? ` · Patta ${parcel.pattaNumber}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Survey number</dt>
                  <dd className="font-mono">{parcel.surveyNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Patta number</dt>
                  <dd className="font-mono">{parcel.pattaNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Village</dt>
                  <dd>{parcel.village}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Extent</dt>
                  <dd className="font-mono">{formatArea(parcel.areaHectares)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Acquisition status</dt>
                  <dd>
                    <Badge
                      variant="outline"
                      className={toneBadgeClass(parcelStatusTone(parcel.status))}
                    >
                      {parcel.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Within impact buffer</dt>
                  <dd>{parcel.withinImpact ? "Yes (500 m)" : "No"}</dd>
                </div>
              </dl>

              {parcel.compensation ? (
                <>
                  <AwardBreakdown parcel={parcel} comp={parcel.compensation} />
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Assessed by</dt>
                      <dd>{parcel.compensation.assessedBy}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Assessed on</dt>
                      <dd>{formatDateTime(parcel.compensation.assessedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Payment status</dt>
                      <dd>
                        <Badge
                          variant="outline"
                          className={toneBadgeClass(
                            compensationTone(parcel.compensation.status)
                          )}
                        >
                          {parcel.compensation.status}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Paid on</dt>
                      <dd>
                        {parcel.compensation.paidAt
                          ? formatDateTime(parcel.compensation.paidAt)
                          : "Not yet paid"}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No compensation has been assessed for this parcel yet.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ParcelRow({
  projectId,
  parcel,
  canAssess,
  datesResolved,
  pending,
  setPending,
  onDone,
  onOpen,
}: {
  projectId: string;
  parcel: ParcelWithCompensation;
  canAssess: boolean;
  datesResolved: boolean;
  pending: string | null;
  setPending: (v: string | null) => void;
  onDone: () => void;
  onOpen: () => void;
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
    <TableRow className="group cursor-pointer" onClick={onOpen}>
      <TableCell className="font-mono font-medium">{parcel.surveyNumber ?? "—"}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {parcel.pattaNumber ?? "—"}
      </TableCell>
      <TableCell>{parcel.village}</TableCell>
      <TableCell className="font-mono text-muted-foreground tabular-nums">
        {parcel.areaHectares.toFixed(2)}
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {parcel.compensation ? (
          formatCurrency(parcel.compensation.total)
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
      {/* Actions live inside the row but must not trigger the row's own
          open-details click, hence the stopPropagation wrapper. */}
      <TableCell onClick={(e) => e.stopPropagation()}>
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [villageFilter, setVillageFilter] = useState("ALL");
  const [openParcel, setOpenParcel] = useState<ParcelWithCompensation | null>(null);

  const villages = useMemo(
    () => [...new Set(parcels.map((p) => p.village))].sort(),
    [parcels]
  );

  // A 535-parcel award list is unusable without a way to reach one record, so
  // search covers the two identifiers a landowner or officer would actually
  // quote: survey number and patta number (plus village for browsing).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parcels.filter((p) => {
      if (villageFilter !== "ALL" && p.village !== villageFilter) return false;
      if (statusFilter !== "ALL") {
        const s = p.compensation?.status ?? "UNASSESSED";
        if (s !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        (p.surveyNumber ?? "").toLowerCase().includes(q) ||
        (p.pattaNumber ?? "").toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q)
      );
    });
  }, [parcels, query, statusFilter, villageFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageParcels = useMemo(
    () => filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [filtered, safePage]
  );

  // Totals follow the current filter so the figures always describe the rows
  // actually on screen.
  const paidTotal = filtered.reduce(
    (sum, p) => sum + (p.compensation?.status === "PAID" ? p.compensation.total : 0),
    0
  );
  const assessedTotal = filtered.reduce((sum, p) => sum + (p.compensation?.total ?? 0), 0);
  const filtersActive = query.trim() !== "" || statusFilter !== "ALL" || villageFilter !== "ALL";

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setVillageFilter("ALL");
    setPage(0);
  }

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
                {formatCurrency(r.ratePerHectare)}/ha &times; {r.multiplier} — set by {r.setBy} on{" "}
                {formatDateTime(r.createdAt)}
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search survey no., patta no. or village…"
                aria-label="Search parcels"
                className="h-9 pl-8"
              />
            </div>

            <select
              value={villageFilter}
              onChange={(e) => {
                setVillageFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Filter by village"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="ALL">All villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-md border p-0.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.value);
                    setPage(0);
                  }}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="size-4" />
                Clear
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {filtered.length === parcels.length
              ? `${parcels.length} parcels`
              : `${filtered.length} of ${parcels.length} parcels`}{" "}
            &middot; {formatCurrencyCompact(paidTotal)} paid of{" "}
            {formatCurrencyCompact(assessedTotal)} assessed
          </p>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Bilingual>Survey No.</Bilingual></TableHead>
                  <TableHead><Bilingual>Patta No.</Bilingual></TableHead>
                  <TableHead><Bilingual>Village</Bilingual></TableHead>
                  <TableHead><Bilingual>Area (ha)</Bilingual></TableHead>
                  <TableHead><Bilingual>Compensation</Bilingual></TableHead>
                  <TableHead><Bilingual>Status</Bilingual></TableHead>
                  <TableHead><Bilingual>Action</Bilingual></TableHead>
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
                    onDone={() => router.refresh()}
                    onOpen={() => setOpenParcel(p)}
                  />
                ))}
                {pageParcels.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No parcels match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {safePage + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <ParcelDetailDialog
        parcel={openParcel}
        onOpenChange={(open) => !open && setOpenParcel(null)}
      />
    </div>
  );
}
