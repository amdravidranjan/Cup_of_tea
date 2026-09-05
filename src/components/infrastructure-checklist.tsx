"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INFRASTRUCTURE_LABELS, type InfrastructureItem } from "@/lib/infrastructure";
import { toneBadgeClass } from "@/lib/status-colors";
import { formatDateTime } from "@/lib/format";

interface ChecklistItem {
  id: string;
  item: InfrastructureItem;
  status: "PENDING" | "COMPLETE";
  completedBy?: string | null;
  completedAt?: Date | null;
}

/** Resolves the display label for an infrastructure item.
 *  Falls back to the raw DB value when the enum key doesn't match — this
 *  handles legacy seed data that stored free-text strings instead of the
 *  proper InfrastructureItem enum keys. */
function resolveLabel(item: string): string {
  return (INFRASTRUCTURE_LABELS as Record<string, string>)[item] ?? item;
}

function InfrastructureDetailDialog({
  item,
  open,
  onClose,
}: {
  item: ChecklistItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{resolveLabel(item.item)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant="outline"
              className={toneBadgeClass(item.status === "COMPLETE" ? "success" : "pending")}
            >
              {item.status === "COMPLETE" ? "Complete" : "Pending"}
            </Badge>
          </div>
          {item.status === "COMPLETE" && (
            <>
              {item.completedBy && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed by</span>
                  <span className="font-medium">{item.completedBy}</span>
                </div>
              )}
              {item.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed on</span>
                  <span>{formatDateTime(item.completedAt)}</span>
                </div>
              )}
            </>
          )}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">Legal basis</p>
            <p>
              Third Schedule, RFCTLARR Act 2013 — the Collector must provide this
              amenity at every resettlement colony before the project can be
              considered complete.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "COMPLETE">("all");
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);

  const completedCount = items.filter((i) => i.status === "COMPLETE").length;

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const label = resolveLabel(i.item).toLowerCase();
      if (search && !label.includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    });
  }, [items, search, statusFilter]);

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

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search amenities…"
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
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | "PENDING" | "COMPLETE")}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No amenities match your search.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((i) => (
            <li
              key={i.id}
              className="group flex items-center justify-between gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedItem(i)}
            >
              <span className="text-sm">{resolveLabel(i.item)}</span>
              {i.status === "COMPLETE" ? (
                <Badge variant="outline" className={toneBadgeClass("success")}>
                  Complete
                </Badge>
              ) : canManage ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending === i.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    complete(i.id);
                  }}
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
      )}

      <InfrastructureDetailDialog
        item={selectedItem}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
