"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toneBadgeClass, type StatusTone } from "@/lib/status-colors";
import type { LandBankEntry, LandBankStatus } from "@/db/land-bank";

const STATUS_TONE: Record<LandBankStatus, StatusTone> = {
  IDLE: "pending",
  UNDER_REVIEW: "info",
  REPURPOSED: "success",
  DISPOSED: "success",
};

export function LandBankPanel({
  projectId,
  entries,
  parcels,
  canManage,
}: {
  projectId: string;
  entries: (LandBankEntry & { village: string })[];
  parcels: { id: string; village: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fd = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/land-bank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parcelId: fd.get("parcelId"), reason: fd.get("reason") }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to flag parcel");
      return;
    }
    toast.success("Flagged for the land bank register");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No parcels from this project are flagged as unused.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded border px-3 py-1.5">
              <span>
                {e.village} — {e.reason}
              </span>
              <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[e.status])}>
                {e.status.replace("_", " ")}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {canManage && parcels.length > 0 && (
        <div>
          {!showForm ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Flag a parcel as unused
            </Button>
          ) : (
            <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
              <select name="parcelId" required className="h-9 rounded-md border px-2 text-sm">
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.village} ({p.id.slice(0, 8)})
                  </option>
                ))}
              </select>
              <Input name="reason" placeholder="Reason (e.g. project descoped)" required className="w-56" />
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Flag"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
