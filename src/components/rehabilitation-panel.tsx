"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { RehabServiceType, RehabStatus, RehabilitationService } from "@/db/rehabilitation";

const SERVICE_LABELS: Record<RehabServiceType, string> = {
  SKILL_TRAINING: "Skill training",
  JOB_PLACEMENT: "Job placement",
  HOUSING_ALLOTMENT: "Housing allotment",
  TRANSPORT_ASSISTANCE: "Transport assistance",
  COUNSELING: "Counseling",
};

const STATUS_TONE_MAP: Record<RehabStatus, StatusTone> = {
  REQUESTED: "info",
  SCHEDULED: "pending",
  COMPLETED: "success",
  DECLINED: "danger",
};

const NEXT_STATUS: Partial<Record<RehabStatus, RehabStatus>> = {
  REQUESTED: "SCHEDULED",
  SCHEDULED: "COMPLETED",
};

const REHAB_STATUSES: RehabStatus[] = ["REQUESTED", "SCHEDULED", "COMPLETED", "DECLINED"];
const SERVICE_TYPES: RehabServiceType[] = [
  "SKILL_TRAINING",
  "JOB_PLACEMENT",
  "HOUSING_ALLOTMENT",
  "TRANSPORT_ASSISTANCE",
  "COUNSELING",
];

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
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (search && !s.familyName.toLowerCase().includes(search.toLowerCase())) return false;
      if (serviceFilter !== "all" && s.serviceType !== serviceFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [services, search, serviceFilter, statusFilter]);

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
      {/* Search & Filter Bar */}
      {services.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by family name…"
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
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{SERVICE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REHAB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {services.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {services.length} services
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {services.length === 0
            ? "No rehabilitation facilitation services requested yet."
            : "No services match your filters."}
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
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.familyName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {SERVICE_LABELS[s.serviceType]}
                  {s.notes && <div className="text-xs">{s.notes}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={toneBadgeClass(STATUS_TONE_MAP[s.status])}>
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
