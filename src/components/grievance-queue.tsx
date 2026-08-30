"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  description: string;
  status: GrievanceStatus;
  createdAt: string;
}

function statusTone(status: GrievanceStatus): "pending" | "info" | "success" {
  if (status === "FILED") return "pending";
  if (status === "UNDER_REVIEW") return "info";
  return "success";
}

function ResolveForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [resolution, setResolution] = useState<GrievanceResolution>("UPHELD");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/grievances/${id}/transition`, {
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
        <Label htmlFor={`note-${id}`} className="text-xs">
          Note
        </Label>
        <Input id={`note-${id}`} name="resolutionNote" className="h-8 w-48" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Resolve"}
      </Button>
    </form>
  );
}

export function GrievanceQueue({
  grievances,
  canManage,
}: {
  grievances: GrievanceRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function startReview(id: string) {
    setPending(id);
    const res = await fetch(`/api/grievances/${id}/transition`, {
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
          {grievances.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="font-mono text-xs">{g.trackingNumber}</TableCell>
              <TableCell>{g.projectName}</TableCell>
              <TableCell>
                {g.type === "COMPENSATION_DISPUTE" ? "Dispute" : "Grievance"}
              </TableCell>
              <TableCell>{g.submitterName}</TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground" title={g.description}>
                {g.description}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={toneBadgeClass(statusTone(g.status))}>
                  {g.status}
                </Badge>
              </TableCell>
              <TableCell>
                {canManage && g.status === "FILED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() => startReview(g.id)}
                  >
                    {pending === g.id ? "…" : "Start review"}
                  </Button>
                )}
                {canManage && g.status === "UNDER_REVIEW" && (
                  <ResolveForm id={g.id} onDone={() => router.refresh()} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
