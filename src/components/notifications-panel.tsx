"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toneBadgeClass, type StatusTone } from "@/lib/status-colors";
import { formatDateTime } from "@/lib/format";
import type { NotificationChannel, NotificationEntry, NotificationStatus } from "@/db/notifications-log";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  VOICE: "Voice call",
  EMAIL: "Email",
  SMS: "SMS",
  POST: "Postal notice",
};

const STATUS_TONE: Record<NotificationStatus, StatusTone> = {
  QUEUED: "pending",
  SENT: "info",
  DELIVERED: "success",
  FAILED: "danger",
};

export function NotificationsPanel({
  projectId,
  notifications,
  families,
  canSend,
}: {
  projectId: string;
  notifications: (NotificationEntry & { familyName: string })[];
  families: { id: string; headOfHouseholdName: string }[];
  canSend: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [updatingPostal, setUpdatingPostal] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const fd = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: fd.get("familyId"), channel: fd.get("channel") }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to notify");
      return;
    }
    toast.success("Notification recorded");
    setShowForm(false);
    router.refresh();
  }

  async function markPostal(id: string, trackingId: string) {
    if (!trackingId.trim()) {
      toast.error("Enter a tracking id first");
      return;
    }
    setUpdatingPostal(id);
    const res = await fetch(`/api/notifications/${id}/postal-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postalTrackingId: trackingId, status: "SENT" }),
    });
    setUpdatingPostal(null);
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    toast.success("Postal status updated");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{n.familyName}</span>
                <span className="text-muted-foreground"> — {CHANNEL_LABELS[n.channel]}</span>
                {n.postalTrackingId && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    #{n.postalTrackingId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[n.status])}>
                  {n.status}
                </Badge>
                {n.channel === "POST" && n.status === "QUEUED" && canSend && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem("tracking") as HTMLInputElement;
                      markPostal(n.id, input.value);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Input name="tracking" placeholder="Tracking ID" className="h-7 w-32 text-xs" />
                    <Button type="submit" size="sm" className="h-7 text-xs" disabled={updatingPostal === n.id}>
                      Mark sent
                    </Button>
                  </form>
                )}
              </div>
              <span className="w-full text-xs text-muted-foreground">
                {formatDateTime(n.sentAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canSend && families.length > 0 && (
        <div>
          {!showForm ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Notify a family
            </Button>
          ) : (
            <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
              <select name="familyId" required className="h-9 rounded-md border px-2 text-sm">
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.headOfHouseholdName}
                  </option>
                ))}
              </select>
              <select name="channel" required className="h-9 rounded-md border px-2 text-sm">
                {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Sending…" : "Send"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </form>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            Voice/Email/SMS are simulated for this demo. Postal generates a real tracking entry
            you update once the printed notice is actually handed to the postal service.
          </p>
        </div>
      )}
    </div>
  );
}
