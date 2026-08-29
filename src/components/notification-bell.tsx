"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";

interface NotificationEvent {
  id: string;
  projectId: string;
  projectName: string;
  kind: "stage" | "rr";
  fromStage: string | null;
  toStage: string;
  action: string;
  actorRole: string;
  createdAt: string;
}

function describe(event: NotificationEvent): string {
  const label = event.kind === "rr" ? "R&R" : "Stage";
  return `${label}: ${event.fromStage ?? "Created"} → ${event.toStage}`;
}

export function NotificationBell() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const body = (await res.json()) as { events: NotificationEvent[]; lastSeenAt: string | null };
    setEvents(body.events);
    setLastSeenAt(body.lastSeenAt);
  }

  useEffect(() => {
    load();
  }, []);

  const unreadCount = lastSeenAt
    ? events.filter((e) => new Date(e.createdAt) > new Date(lastSeenAt)).length
    : events.length;

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && unreadCount > 0) {
      await fetch("/api/notifications/mark-seen", { method: "POST" });
      setLastSeenAt(new Date().toISOString());
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {events.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No recent activity.
          </div>
        ) : (
          events.map((e) => (
            <DropdownMenuItem key={e.id} asChild className="flex-col items-start gap-0.5">
              <Link href={`/app/projects/${e.projectId}`}>
                <span className="font-medium">{e.projectName}</span>
                <span className="text-xs text-muted-foreground">{describe(e)}</span>
                <span className="text-xs text-muted-foreground">
                  {e.actorRole} &middot; {formatDateTime(new Date(e.createdAt))}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
