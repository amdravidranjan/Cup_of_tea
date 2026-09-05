"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toneBadgeClass, type StatusTone } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";
import type { DisputeStatus, LegalDispute } from "@/db/legal-disputes";

const STATUS_TONE: Record<DisputeStatus, StatusTone> = {
  FILED: "info",
  HEARING: "pending",
  STAYED: "danger",
  DISPOSED: "success",
};

const NEXT_STATUS: Partial<Record<DisputeStatus, DisputeStatus>> = {
  FILED: "HEARING",
  HEARING: "DISPOSED",
  STAYED: "HEARING",
};

const DISPUTE_STATUSES: DisputeStatus[] = ["FILED", "HEARING", "STAYED", "DISPOSED"];

/* ── Dispute Detail Dialog ────────────────────────────────────────── */

function DisputeDetailDialog({
  dispute,
  open,
  onClose,
}: {
  dispute: LegalDispute | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!dispute) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{dispute.caseNumber}</span>
            <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[dispute.status])}>
              {dispute.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-muted-foreground">Title</span>
            <p className="font-medium">{dispute.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Court</span>
              <p className="font-medium">{dispute.court}</p>
            </div>
            {dispute.partyName && (
              <div>
                <span className="text-muted-foreground">Petitioner / Party</span>
                <p className="font-medium">{dispute.partyName}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Filed date</span>
              <p className="font-medium">{formatDate(dispute.filedDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Next hearing</span>
              <p className="font-medium">
                {dispute.nextHearingDate ? formatDate(dispute.nextHearingDate) : "Not scheduled"}
              </p>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Summary</span>
            <p className="mt-1 whitespace-pre-wrap">{dispute.summary}</p>
          </div>

          {dispute.outcome && (
            <div>
              <span className="text-muted-foreground">Outcome</span>
              <p className="mt-1 font-medium">{dispute.outcome}</p>
            </div>
          )}

          {/* Stay order section */}
          {dispute.isStayOrder && (
            <div
              className={`rounded-lg border p-3 ${
                dispute.stayClearedAt
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <p className="font-semibold text-xs uppercase tracking-wide">
                {dispute.stayClearedAt ? "Stay order — cleared" : "Stay order — active"}
              </p>
              <p className="mt-1">
                {dispute.stayClearedAt
                  ? "This stay order has been cleared. Compensation and possession actions are unblocked."
                  : "This stay order blocks compensation payment and parcel possession actions on the project until it is logged as cleared."}
              </p>
            </div>
          )}

          {/* Legal basis */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">Legal basis</p>
            <p>
              RFCTLARR Act 2013, Sec 64–65 — disputes and references to court
              regarding land acquisition proceedings.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            Recorded by: {dispute.createdBy} · Created: {formatDate(dispute.createdAt)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Panel ───────────────────────────────────────────────────── */

export function LegalDisputesPanel({
  projectId,
  disputes,
  canManage,
}: {
  projectId: string;
  disputes: LegalDispute[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState<LegalDispute | null>(null);

  const activeStay = disputes.find((d) => d.isStayOrder && !d.stayClearedAt && d.status !== "DISPOSED");

  const filtered = useMemo(() => {
    return disputes.filter((d) => {
      const q = search.toLowerCase();
      if (
        q &&
        !d.caseNumber.toLowerCase().includes(q) &&
        !d.title.toLowerCase().includes(q) &&
        !(d.partyName ?? "").toLowerCase().includes(q) &&
        !d.court.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [disputes, search, statusFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fd = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/legal-disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseNumber: fd.get("caseNumber"),
        court: fd.get("court"),
        title: fd.get("title"),
        partyName: fd.get("partyName") || undefined,
        filedDate: fd.get("filedDate"),
        nextHearingDate: fd.get("nextHearingDate") || undefined,
        summary: fd.get("summary"),
        isStayOrder: fd.get("isStayOrder") === "on",
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to add case");
      return;
    }
    toast.success("Legal dispute recorded");
    setShowForm(false);
    router.refresh();
  }

  async function advance(dispute: LegalDispute) {
    const next = NEXT_STATUS[dispute.status];
    if (!next) return;
    setUpdating(dispute.id);
    const res = await fetch(`/api/legal-disputes/${dispute.id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setUpdating(null);
    if (!res.ok) {
      toast.error("Failed to update case");
      return;
    }
    router.refresh();
  }

  async function clearStay(dispute: LegalDispute) {
    setUpdating(dispute.id);
    const res = await fetch(`/api/legal-disputes/${dispute.id}/clear-stay`, { method: "POST" });
    setUpdating(null);
    if (!res.ok) {
      toast.error("Failed to clear stay");
      return;
    }
    toast.success("Stay order cleared — compensation/possession actions unblocked");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {activeStay && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">
            Active court stay order — {activeStay.caseNumber}
          </p>
          <p className="mt-0.5 text-red-800">
            Compensation payment and parcel-possession actions are blocked on this project until
            this stay is logged as cleared.
          </p>
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 border-red-400 text-red-900 hover:bg-red-100"
              disabled={updating === activeStay.id}
              onClick={() => clearStay(activeStay)}
            >
              Log stay as cleared
            </Button>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case number, title, party…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DISPUTE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {disputes.length} disputes
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {disputes.length === 0
            ? "No litigation on record for this project."
            : "No disputes match your search."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Filed</TableHead>
              <TableHead>Next hearing</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => {
              const urgent = d.status === "HEARING" || d.status === "FILED";
              return (
                <TableRow
                  key={d.id}
                  className={`cursor-pointer hover:bg-muted/50 ${urgent ? "border-l-4 border-l-red-500" : ""}`}
                  onClick={() => setSelectedDispute(d)}
                >
                  <TableCell>
                    <div className="font-mono text-sm font-medium">{d.caseNumber}</div>
                    <div className="text-xs text-muted-foreground">{d.title}</div>
                    {d.isStayOrder && (
                      <Badge
                        variant="outline"
                        className={
                          d.stayClearedAt
                            ? "mt-1 border-muted-foreground/30 text-muted-foreground"
                            : "mt-1 border-red-300 bg-red-50 text-red-800"
                        }
                      >
                        {d.stayClearedAt ? "Stay cleared" : "Stay order active"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.court}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[d.status])}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(d.filedDate)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.nextHearingDate ? formatDate(d.nextHearingDate) : "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {NEXT_STATUS[d.status] && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updating === d.id}
                          onClick={() => advance(d)}
                        >
                          Mark {NEXT_STATUS[d.status]}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {canManage && (
        <div>
          {!showForm ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Record a case
            </Button>
          ) : (
            <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ld-case">Case number</Label>
                  <Input id="ld-case" name="caseNumber" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ld-court">Court</Label>
                  <Input id="ld-court" name="court" required placeholder="e.g. Madras High Court" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ld-title">Title</Label>
                <Input id="ld-title" name="title" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ld-party">Petitioner / party</Label>
                  <Input id="ld-party" name="partyName" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ld-filed">Filed date</Label>
                  <Input id="ld-filed" name="filedDate" type="date" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ld-hearing">Next hearing date (optional)</Label>
                <Input id="ld-hearing" name="nextHearingDate" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ld-summary">Summary</Label>
                <Textarea id="ld-summary" name="summary" required rows={3} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isStayOrder" className="h-3.5 w-3.5" />
                This case includes a court stay order (blocks compensation/possession actions
                until cleared)
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save case"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <DisputeDetailDialog
        dispute={selectedDispute}
        open={selectedDispute !== null}
        onClose={() => setSelectedDispute(null)}
      />
    </div>
  );
}
