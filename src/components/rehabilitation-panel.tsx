"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { RehabServiceType, RehabStatus, RehabilitationService } from "@/db/rehabilitation";

const SERVICE_LABELS: Record<RehabServiceType, string> = {
  SKILL_TRAINING: "Skill training",
  JOB_PLACEMENT: "Job placement",
  HOUSING_ALLOTMENT: "Housing allotment",
  TRANSPORT_ASSISTANCE: "Transport assistance",
  COUNSELING: "Counseling",
};

const STATUS_TONE: Record<RehabStatus, StatusTone> = {
  REQUESTED: "info",
  SCHEDULED: "pending",
  COMPLETED: "success",
  DECLINED: "danger",
};

const NEXT_STATUS: Partial<Record<RehabStatus, RehabStatus>> = {
  REQUESTED: "SCHEDULED",
  SCHEDULED: "COMPLETED",
};

export function RehabilitationPanel({
  projectId,
  services,
  families,
  canManage,
}: {
  projectId: string;
  services: (RehabilitationService & { familyName: string })[];
  families: { id: string; headOfHouseholdName: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fd = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/rehabilitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: fd.get("familyId"),
        serviceType: fd.get("serviceType"),
        notes: fd.get("notes") || undefined,
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to request service");
      return;
    }
    toast.success("Facilitation service requested");
    setShowForm(false);
    router.refresh();
  }

  async function advance(service: RehabilitationService) {
    const next = NEXT_STATUS[service.status];
    if (!next) return;
    setUpdating(service.id);
    const res = await fetch(`/api/rehabilitation/${service.id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setUpdating(null);
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rehabilitation facilitation services requested yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.familyName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {SERVICE_LABELS[s.serviceType]}
                  {s.notes && <div className="text-xs">{s.notes}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[s.status])}>
                    {s.status}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    {NEXT_STATUS[s.status] && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updating === s.id}
                        onClick={() => advance(s)}
                      >
                        Mark {NEXT_STATUS[s.status]}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canManage && families.length > 0 && (
        <div>
          {!showForm ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Request a facilitation service
            </Button>
          ) : (
            <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="rh-family">
                    Family
                  </label>
                  <select
                    id="rh-family"
                    name="familyId"
                    required
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.headOfHouseholdName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="rh-type">
                    Service
                  </label>
                  <select
                    id="rh-type"
                    name="serviceType"
                    required
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="rh-notes">
                  Notes (optional)
                </label>
                <Textarea id="rh-notes" name="notes" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Requesting…" : "Request service"}
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
