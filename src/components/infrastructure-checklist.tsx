"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INFRASTRUCTURE_LABELS, type InfrastructureItem } from "@/lib/infrastructure";
import { toneBadgeClass } from "@/lib/status-colors";

interface ChecklistItem {
  id: string;
  item: InfrastructureItem;
  status: "PENDING" | "COMPLETE";
}

export function InfrastructureChecklist({
  items,
  canManage,
}: {
  items: ChecklistItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const completedCount = items.filter((i) => i.status === "COMPLETE").length;

  async function complete(id: string) {
    setPending(id);
    const res = await fetch(`/api/infrastructure/${id}/complete`, { method: "POST" });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to update");
      return;
    }
    toast.success("Marked complete");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {completedCount} of {items.length} Third Schedule amenities complete
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li
            key={i.id}
            className="group flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <span className="text-sm">{INFRASTRUCTURE_LABELS[i.item]}</span>
            {i.status === "COMPLETE" ? (
              <Badge variant="outline" className={toneBadgeClass("success")}>
                Complete
              </Badge>
            ) : canManage ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending === i.id}
                onClick={() => complete(i.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                {pending === i.id ? "…" : "Mark complete"}
              </Button>
            ) : (
              <Badge variant="outline" className={toneBadgeClass("pending")}>
                Pending
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
