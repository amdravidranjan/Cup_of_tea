"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GrievanceType } from "@/lib/grievance-workflow";

export function FileGrievanceForm({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false);
  const [type, setType] = useState<GrievanceType>("GENERAL_GRIEVANCE");
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/grievances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        submitterName: String(formData.get("submitterName") ?? ""),
        submitterContact: String(formData.get("submitterContact") ?? "") || undefined,
        description: String(formData.get("description") ?? ""),
      }),
    });
    const body = (await res.json()) as { trackingNumber?: string; error?: string };
    setPending(false);
    if (!res.ok || !body.trackingNumber) {
      toast.error(body.error ?? "Failed to file — please try again");
      return;
    }
    setTrackingNumber(body.trackingNumber);
    (event.target as HTMLFormElement).reset();
  }

  if (trackingNumber) {
    return (
      <div className="rounded-lg border bg-secondary/40 p-4 text-sm">
        <p className="font-medium">Filed successfully.</p>
        <p className="mt-1 text-muted-foreground">
          Your tracking number is <span className="font-mono font-semibold text-foreground">{trackingNumber}</span>.
          Save it — you&apos;ll need it to check the status of your submission.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as GrievanceType)}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GENERAL_GRIEVANCE">General grievance / objection</SelectItem>
            <SelectItem value="COMPENSATION_DISPUTE">Compensation dispute</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="submitterName">Your name</Label>
          <Input id="submitterName" name="submitterName" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="submitterContact">Contact (optional)</Label>
          <Input id="submitterContact" name="submitterContact" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Describe your objection or grievance</Label>
        <Textarea id="description" name="description" required rows={4} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Filing…" : "File"}
      </Button>
    </form>
  );
}
