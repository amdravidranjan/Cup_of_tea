"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toneBadgeClass, type StatusTone } from "@/lib/status-colors";
import { formatDateTime } from "@/lib/format";

interface RequestResult {
  trackingNumber: string;
  title: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  description: string;
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<RequestResult["status"], StatusTone> = {
  SUBMITTED: "pending",
  UNDER_REVIEW: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

export function TrackProjectRequest() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [result, setResult] = useState<RequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/project-requests/${encodeURIComponent(trackingNumber.trim())}`);
    const body = (await res.json()) as { request?: RequestResult; error?: string };
    setPending(false);
    if (!res.ok || !body.request) {
      setError(body.error ?? "Not found");
      return;
    }
    setResult(body.request);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="req-tracking">Tracking number</Label>
          <Input
            id="req-tracking"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="REQ-2026-XXXXXX"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Check status"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">{result.trackingNumber}</span>
            <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[result.status])}>
              {result.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="font-medium">{result.title}</p>
          <p className="text-muted-foreground">{result.description}</p>
          <p className="text-xs text-muted-foreground">
            Submitted {formatDateTime(new Date(result.createdAt))}
          </p>
          {result.reviewNote && (
            <p className="border-t pt-2 text-muted-foreground">
              <span className="font-medium text-foreground">Review note: </span>
              {result.reviewNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
