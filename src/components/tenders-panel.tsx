"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import type { Contractor, Tender, TenderStatus } from "@/db/tenders";

const STATUS_TONE: Record<TenderStatus, StatusTone> = {
  PUBLISHED: "info",
  AWARDED: "pending",
  IN_PROGRESS: "pending",
  COMPLETED: "success",
};

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function TendersPanel({
  projectId,
  tenders,
  contractors,
  canManage,
}: {
  projectId: string;
  tenders: (Tender & { contractorName?: string })[];
  contractors: Contractor[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [awarding, setAwarding] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);

  async function submitTender(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fd = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/tenders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        scope: fd.get("scope"),
        estimatedValue: Number(fd.get("estimatedValue")),
        submissionDeadline: fd.get("submissionDeadline") || undefined,
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to publish tender");
      return;
    }
    toast.success("Tender published");
    setShowForm(false);
    router.refresh();
  }

  async function submitAward(event: FormEvent<HTMLFormElement>, tenderId: string) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const contractorId = fd.get("contractorId") as string;
    const res = await fetch(`/api/tenders/${tenderId}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractorId: contractorId && contractorId !== "__new" ? contractorId : undefined,
        newContractorName: contractorId === "__new" ? fd.get("newContractorName") : undefined,
        newContractorRegistration:
          contractorId === "__new" ? fd.get("newContractorRegistration") : undefined,
        awardedValue: Number(fd.get("awardedValue")),
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(body.error ?? "Failed to award tender");
      return;
    }
    toast.success("Tender awarded");
    setAwarding(null);
    router.refresh();
  }

  async function advanceTender(id: string) {
    setAdvancing(id);
    const res = await fetch(`/api/tenders/${id}/advance`, { method: "POST" });
    setAdvancing(null);
    if (!res.ok) {
      toast.error("Failed to advance tender");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {tenders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tenders published for this project yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tender</TableHead>
              <TableHead>Estimated value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contractor</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenders.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-mono font-medium">{t.tenderNumber}</div>
                  <div className="text-xs text-muted-foreground">{t.title}</div>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {formatINR(t.estimatedValue)}
                  {t.awardedValue && (
                    <div className="text-xs">Awarded: {formatINR(t.awardedValue)}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[t.status])}>
                    {t.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {t.contractorId ? (
                    <Link href={`/app/contractors/${t.contractorId}`} className="hover:underline">
                      {t.contractorName ?? "View contractor"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="space-y-2">
                    {t.status === "PUBLISHED" && awarding !== t.id && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setAwarding(t.id)}>
                        Award
                      </Button>
                    )}
                    {t.status === "PUBLISHED" && awarding === t.id && (
                      <form
                        onSubmit={(e) => submitAward(e, t.id)}
                        className="w-64 space-y-2 rounded border bg-background p-2"
                      >
                        <select
                          name="contractorId"
                          className="w-full rounded border px-2 py-1 text-xs"
                          defaultValue={contractors[0]?.id ?? "__new"}
                        >
                          {contractors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                          <option value="__new">+ New contractor</option>
                        </select>
                        <Input name="newContractorName" placeholder="New contractor name" className="h-7 text-xs" />
                        <Input
                          name="newContractorRegistration"
                          placeholder="Registration no."
                          className="h-7 text-xs"
                        />
                        <Input
                          name="awardedValue"
                          type="number"
                          step="any"
                          placeholder="Awarded value (₹)"
                          required
                          className="h-7 text-xs"
                        />
                        <div className="flex gap-1">
                          <Button type="submit" size="sm" className="h-7 text-xs">
                            Confirm award
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setAwarding(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                    {(t.status === "AWARDED" || t.status === "IN_PROGRESS") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={advancing === t.id}
                        onClick={() => advanceTender(t.id)}
                      >
                        Mark {t.status === "AWARDED" ? "In progress" : "Completed"}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canManage && (
        <div>
          {!showForm ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Publish a tender
            </Button>
          ) : (
            <form onSubmit={submitTender} className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="tn-title">Title</Label>
                <Input id="tn-title" name="title" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tn-scope">Scope of work</Label>
                <Textarea id="tn-scope" name="scope" required rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tn-value">Estimated value (₹)</Label>
                  <Input id="tn-value" name="estimatedValue" type="number" step="any" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tn-deadline">Submission deadline</Label>
                  <Input id="tn-deadline" name="submissionDeadline" type="date" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Publishing…" : "Publish tender"}
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
