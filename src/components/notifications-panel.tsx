"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const CHANNELS: NotificationChannel[] = ["VOICE", "EMAIL", "SMS", "POST"];
const STATUSES: NotificationStatus[] = ["QUEUED", "SENT", "DELIVERED", "FAILED"];

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
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (search && !n.familyName.toLowerCase().includes(search.toLowerCase())) return false;
      if (channelFilter !== "all" && n.channel !== channelFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      return true;
    });
  }, [notifications, search, channelFilter, statusFilter]);

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
      {/* Search & Filter Bar */}
      {notifications.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by family name…"
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
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {notifications.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {notifications.length} notifications
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {notifications.length === 0
            ? "No notifications sent yet."
            : "No notifications match your filters."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
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
