"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

  const activeStay = disputes.find((d) => d.isStayOrder && !d.stayClearedAt && d.status !== "DISPOSED");

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

      {disputes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No litigation on record for this project.
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
            {disputes.map((d) => {
              const urgent = d.status === "HEARING" || d.status === "FILED";
              return (
                <TableRow
                  key={d.id}
                  className={urgent ? "border-l-4 border-l-red-500" : undefined}
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
                    <TableCell>
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
    </div>
  );
}
