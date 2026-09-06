"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import type { GramSabhaConsultation } from "@/db/gram-sabha";

/* ── Consultation Detail Dialog ───────────────────────────────────── */

function ConsultationDetailDialog({
  consultation,
  open,
  onClose,
}: {
  consultation: GramSabhaConsultation | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!consultation) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Gram Sabha — {consultation.village}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="font-medium">{formatDate(consultation.consultationDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Attendance</span>
              <p className="font-medium">{consultation.attendanceCount} attendees</p>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Minutes</span>
            <p className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3">
              {consultation.minutes}
            </p>
          </div>

          <div>
            <span className="text-muted-foreground">Resolution</span>
            <p className="mt-1 font-medium whitespace-pre-wrap rounded-lg border border-green-200 bg-green-50 p-3 text-green-900">
              {consultation.resolution}
            </p>
          </div>

          {/* Legal basis */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">Legal basis</p>
            <p>
              RFCTLARR Act 2013, Sec 2(2) — mandatory consultation with Gram
              Sabha or equivalent body at the village level before land
              acquisition can proceed.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            Recorded by: {consultation.recordedBy} · {formatDate(consultation.createdAt)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Panel ───────────────────────────────────────────────────── */

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
  const [search, setSearch] = useState("");
  const [selectedConsultation, setSelectedConsultation] = useState<GramSabhaConsultation | null>(null);

  const filtered = useMemo(() => {
    if (!search) return consultations;
    const q = search.toLowerCase();
    return consultations.filter(
      (c) =>
        c.village.toLowerCase().includes(q) ||
        c.minutes.toLowerCase().includes(q) ||
        c.resolution.toLowerCase().includes(q)
    );
  }, [consultations, search]);

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
      {/* Search Bar */}
      {consultations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by village or content…"
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
      )}

      {consultations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {consultations.length} consultations
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {consultations.length === 0
            ? "No Gram Sabha consultations recorded yet."
            : "No consultations match your search."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelectedConsultation(c)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.village}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(c.consultationDate)} · {c.attendanceCount} attendees
                </span>
              </div>
              <p className="mt-1 text-muted-foreground line-clamp-2">{c.minutes}</p>
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

      <ConsultationDetailDialog
        consultation={selectedConsultation}
        open={selectedConsultation !== null}
        onClose={() => setSelectedConsultation(null)}
      />
    </div>
  );
}
