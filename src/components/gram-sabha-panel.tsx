"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { GramSabhaConsultation } from "@/db/gram-sabha";

export function GramSabhaPanel({
  projectId,
  consultations,
  canManage,
}: {
  projectId: string;
  consultations: GramSabhaConsultation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fd = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/gram-sabha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        village: fd.get("village"),
        consultationDate: fd.get("consultationDate"),
        attendanceCount: Number(fd.get("attendanceCount")),
        minutes: fd.get("minutes"),
        resolution: fd.get("resolution"),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to record consultation");
      return;
    }
    toast.success("Consultation recorded");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {consultations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Gram Sabha consultations recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {consultations.map((c) => (
            <li key={c.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.village}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(c.consultationDate)} · {c.attendanceCount} attendees
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{c.minutes}</p>
              <p className="mt-1 text-xs font-medium text-foreground">Resolution: {c.resolution}</p>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div>
          {!showForm ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Record a consultation
            </Button>
          ) : (
            <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gs-village">Village</Label>
                  <Input id="gs-village" name="village" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gs-date">Date</Label>
                  <Input id="gs-date" name="consultationDate" type="date" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="gs-attendance">Attendance count</Label>
                <Input id="gs-attendance" name="attendanceCount" type="number" min={0} required className="w-32" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gs-minutes">Minutes</Label>
                <Textarea id="gs-minutes" name="minutes" required rows={3} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gs-resolution">Resolution</Label>
                <Textarea id="gs-resolution" name="resolution" required rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save consultation"}
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
