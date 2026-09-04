"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RequestProjectForm() {
  const [pending, setPending] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    const res = await fetch("/api/project-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        purpose: fd.get("purpose"),
        description: fd.get("description"),
        state: fd.get("state"),
        district: fd.get("district"),
        village: fd.get("village") || undefined,
        requesterName: fd.get("requesterName"),
        requesterContact: fd.get("requesterContact") || undefined,
      }),
    });
    const body = (await res.json()) as { trackingNumber?: string; error?: string };
    setPending(false);
    if (!res.ok || !body.trackingNumber) {
      setError(body.error ?? "Failed to submit — please try again");
      return;
    }
    setTrackingNumber(body.trackingNumber);
    (event.target as HTMLFormElement).reset();
  }

  if (trackingNumber) {
    return (
      <div className="rounded-lg border bg-secondary/40 p-4 text-sm">
        <p className="font-medium">Request submitted.</p>
        <p className="mt-1 text-muted-foreground">
          Your tracking number is{" "}
          <span className="font-mono font-semibold text-foreground">{trackingNumber}</span>. Save
          it — you&apos;ll need it to check the status of your request.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="rp-title">What should the project be called?</Label>
        <Input id="rp-title" name="title" required placeholder="e.g. Bridge over Kolab river at Semiliguda" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rp-purpose">Purpose</Label>
        <Input id="rp-purpose" name="purpose" required placeholder="What would this achieve?" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rp-description">Describe the need</Label>
        <Textarea
          id="rp-description"
          name="description"
          required
          rows={4}
          placeholder="Why is this needed, and who would it help?"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="rp-state">State</Label>
          <Input id="rp-state" name="state" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rp-district">District</Label>
          <Input id="rp-district" name="district" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rp-village">Village (optional)</Label>
          <Input id="rp-village" name="village" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="rp-name">Your name</Label>
          <Input id="rp-name" name="requesterName" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rp-contact">Contact (optional)</Label>
          <Input id="rp-contact" name="requesterContact" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
