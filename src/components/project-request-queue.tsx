"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toneBadgeClass, type StatusTone } from "@/lib/status-colors";
import type { ProjectRequest, ProjectRequestStatus } from "@/db/project-requests";

const STATUS_TONE: Record<ProjectRequestStatus, StatusTone> = {
  SUBMITTED: "pending",
  UNDER_REVIEW: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

function ReviewForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);

  async function decide(status: "UNDER_REVIEW" | "APPROVED" | "REJECTED", note: string) {
    setPending(true);
    const res = await fetch(`/api/project-requests/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote: note || undefined }),
    });
    setPending(false);
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    toast.success("Updated");
    onDone();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, status: "APPROVED" | "REJECTED") {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await decide(status, String(fd.get("note") ?? ""));
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, "APPROVED")} className="flex flex-wrap items-end gap-2">
      <Input name="note" placeholder="Note (optional)" className="h-8 w-40" />
      <Button type="submit" size="sm" disabled={pending}>
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={(e) => {
          const form = e.currentTarget.closest("form");
          const note = (form?.elements.namedItem("note") as HTMLInputElement | null)?.value ?? "";
          decide("REJECTED", note);
        }}
      >
        Reject
      </Button>
    </form>
  );
}

export function ProjectRequestQueue({ requests }: { requests: ProjectRequest[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function startReview(id: string) {
    setPending(id);
    const res = await fetch(`/api/project-requests/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "UNDER_REVIEW" }),
    });
    setPending(null);
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    router.refresh();
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No project requests yet.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tracking #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Requested by</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.trackingNumber}</TableCell>
              <TableCell>
                <div className="font-medium">{r.title}</div>
                <div className="max-w-64 truncate text-xs text-muted-foreground" title={r.description}>
                  {r.description}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {r.district}, {r.state}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.requesterName}</TableCell>
              <TableCell>
                <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[r.status])}>
                  {r.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                {r.status === "SUBMITTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() => startReview(r.id)}
                  >
                    {pending === r.id ? "…" : "Start review"}
                  </Button>
                )}
                {r.status === "UNDER_REVIEW" && (
                  <ReviewForm id={r.id} onDone={() => router.refresh()} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
