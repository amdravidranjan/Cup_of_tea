"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toneBadgeClass } from "@/lib/status-colors";
import { formatDateTime } from "@/lib/format";
import type { GrievanceStatus } from "@/lib/grievance-workflow";

interface Grievance {
  trackingNumber: string;
  type: string;
  status: GrievanceStatus;
  description: string;
  resolution: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

function statusTone(status: GrievanceStatus): "pending" | "info" | "success" {
  if (status === "FILED") return "pending";
  if (status === "UNDER_REVIEW") return "info";
  return "success";
}

export function TrackGrievance() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [result, setResult] = useState<Grievance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/grievances/${encodeURIComponent(trackingNumber.trim())}`);
    const body = (await res.json()) as { grievance?: Grievance; error?: string };
    setPending(false);
    if (!res.ok || !body.grievance) {
      setError(body.error ?? "Not found");
      return;
    }
    setResult(body.grievance);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="trackingNumber">Tracking number</Label>
          <Input
            id="trackingNumber"
            placeholder="GRV-2026-XXXXXX"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            required
            className="w-56 font-mono"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Looking up…" : "Track"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <Card>
          <CardContent className="space-y-2 py-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-medium">{result.trackingNumber}</span>
              <Badge variant="outline" className={toneBadgeClass(statusTone(result.status))}>
                {result.status}
              </Badge>
              <Badge variant="outline">
                {result.type === "COMPENSATION_DISPUTE" ? "Compensation dispute" : "General grievance"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{result.description}</p>
            <p className="text-xs text-muted-foreground">
              Filed {formatDateTime(new Date(result.createdAt))}
            </p>
            {result.status === "RESOLVED" && (
              <div className="rounded-md border bg-secondary/40 p-3">
                <p className="font-medium">Resolution: {result.resolution}</p>
                {result.resolutionNote && (
                  <p className="mt-1 text-muted-foreground">{result.resolutionNote}</p>
                )}
                {result.resolvedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resolved {formatDateTime(new Date(result.resolvedAt))}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
