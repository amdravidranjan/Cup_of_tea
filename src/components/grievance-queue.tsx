"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toneBadgeClass } from "@/lib/status-colors";
import { formatDateTime } from "@/lib/format";
import type { GrievanceResolution, GrievanceStatus } from "@/lib/grievance-workflow";

interface GrievanceRow {
  id: string;
  trackingNumber: string;
  type: string;
  projectName: string;
  submitterName: string;
  submitterContact?: string | null;
  description: string;
  attachmentFileName: string | null;
  status: GrievanceStatus;
  resolution?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
}

const GRIEVANCE_STATUSES: GrievanceStatus[] = ["FILED", "UNDER_REVIEW", "RESOLVED"];

function statusTone(status: GrievanceStatus): "pending" | "info" | "success" {
  if (status === "FILED") return "pending";
  if (status === "UNDER_REVIEW") return "info";
  return "success";
}

/* ── Grievance Detail Dialog ──────────────────────────────────────── */

function GrievanceDetailDialog({
  grievance,
  open,
  onClose,
}: {
  grievance: GrievanceRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!grievance) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{grievance.trackingNumber}</span>
            <Badge variant="outline" className={toneBadgeClass(statusTone(grievance.status))}>
              {grievance.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Project</span>
              <p className="font-medium">{grievance.projectName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium">
                {grievance.type === "COMPENSATION_DISPUTE" ? "Compensation Dispute" : "General Objection"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Submitter</span>
              <p className="font-medium">{grievance.submitterName}</p>
            </div>
            {grievance.submitterContact && (
              <div>
                <span className="text-muted-foreground">Contact</span>
                <p className="font-medium">{grievance.submitterContact}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Filed on</span>
              <p className="font-medium">{formatDateTime(new Date(grievance.createdAt))}</p>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Description</span>
            <p className="mt-1 whitespace-pre-wrap">{grievance.description}</p>
          </div>

          {grievance.attachmentFileName && (
            <div>
              <span className="text-muted-foreground">Attachment</span>
              <p className="mt-1">
                <a
                  href={`/api/grievances/${grievance.trackingNumber}/attachment`}
                  className="text-blue-600 hover:underline"
                >
                  📎 {grievance.attachmentFileName}
                </a>
              </p>
            </div>
          )}

          {grievance.status === "RESOLVED" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-900">
              <p className="font-semibold text-xs uppercase tracking-wide">Resolution</p>
              {grievance.resolution && (
                <p className="mt-1 font-medium">{grievance.resolution}</p>
              )}
              {grievance.resolutionNote && (
                <p className="mt-1">{grievance.resolutionNote}</p>
              )}
            </div>
          )}

          {/* Next step indicator */}
          {grievance.status !== "RESOLVED" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold text-xs uppercase tracking-wide">Next step required</p>
              <p className="mt-1">
                {grievance.status === "FILED"
                  ? "District Collector must start review of this grievance."
                  : "District Collector must resolve with a decision (Upheld / Revised / Rejected)."}
              </p>
            </div>
          )}

          {/* Legal basis */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">Legal basis</p>
            <p>
              RFCTLARR Act 2013, Sec 15 — hearing of objections by interested
              persons. The Collector must consider all objections filed within
              the prescribed period.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Resolve Form ─────────────────────────────────────────────────── */

function ResolveForm({ trackingNumber, onDone }: { trackingNumber: string; onDone: () => void }) {
  const [resolution, setResolution] = useState<GrievanceResolution>("UPHELD");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/grievances/${trackingNumber}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "RESOLVE",
        resolution,
        resolutionNote: String(formData.get("resolutionNote") ?? ""),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to resolve");
      return;
    }
    toast.success("Grievance resolved");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <Select value={resolution} onValueChange={(v) => setResolution(v as GrievanceResolution)}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="UPHELD">Upheld</SelectItem>
          <SelectItem value="REVISED">Revised</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-1">
        <Label htmlFor={`note-${trackingNumber}`} className="text-xs">
          Note
        </Label>
        <Input id={`note-${trackingNumber}`} name="resolutionNote" className="h-8 w-48" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Resolve"}
      </Button>
    </form>
  );
}

/* ── Main Queue ───────────────────────────────────────────────────── */

export function GrievanceQueue({
  grievances,
  canManage,
}: {
  grievances: GrievanceRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedGrievance, setSelectedGrievance] = useState<GrievanceRow | null>(null);

  const filtered = useMemo(() => {
    return grievances.filter((g) => {
      const q = search.toLowerCase();
      if (
        q &&
        !g.trackingNumber.toLowerCase().includes(q) &&
        !g.submitterName.toLowerCase().includes(q) &&
        !g.projectName.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      return true;
    });
  }, [grievances, search, statusFilter]);

  async function startReview(trackingNumber: string) {
    setPending(trackingNumber);
    const res = await fetch(`/api/grievances/${trackingNumber}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "START_REVIEW" }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to start review");
      return;
    }
    toast.success("Marked under review");
    router.refresh();
  }

  if (grievances.length === 0) {
    return <p className="text-sm text-muted-foreground">No grievances filed yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking #, submitter, project…"
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
            {GRIEVANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {grievances.length} grievances
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking #</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((g) => (
              <TableRow
                key={g.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedGrievance(g)}
              >
                <TableCell className="font-mono text-xs">{g.trackingNumber}</TableCell>
                <TableCell>{g.projectName}</TableCell>
                <TableCell>
                  {g.type === "COMPENSATION_DISPUTE" ? "Dispute" : "Grievance"}
                </TableCell>
                <TableCell>{g.submitterName}</TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground" title={g.description}>
                  {g.description}
                  {g.attachmentFileName && (
                    <>
                      {" "}
                      <a
                        href={`/api/grievances/${g.trackingNumber}/attachment`}
                        className="text-brand hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📎
                      </a>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={toneBadgeClass(statusTone(g.status))}>
                    {g.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {canManage && g.status === "FILED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending !== null}
                      onClick={() => startReview(g.trackingNumber)}
                    >
                      {pending === g.trackingNumber ? "…" : "Start review"}
                    </Button>
                  )}
                  {canManage && g.status === "UNDER_REVIEW" && (
                    <ResolveForm trackingNumber={g.trackingNumber} onDone={() => router.refresh()} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <GrievanceDetailDialog
        grievance={selectedGrievance}
        open={selectedGrievance !== null}
        onClose={() => setSelectedGrievance(null)}
      />
    </div>
  );
}
