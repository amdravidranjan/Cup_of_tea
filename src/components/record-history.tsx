"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import {
  auditActionLabel,
  auditEntityLabel,
  auditFieldLabel,
  auditValueLabel,
  type AuditAction,
  type AuditEntityType,
  type FieldChange,
} from "@/lib/audit";

interface HistoryEntry {
  id: string;
  seq: number;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  reason: string | null;
  changes: FieldChange[];
  hash: string;
  createdAt: string;
}

const ACTION_TONE: Partial<Record<AuditAction, string>> = {
  CREATE: "border-emerald-300 bg-emerald-50 text-emerald-800",
  INGEST: "border-emerald-300 bg-emerald-50 text-emerald-800",
  UPDATE: "border-amber-300 bg-amber-50 text-amber-800",
  SUPERSEDE: "border-amber-300 bg-amber-50 text-amber-800",
  DELETE: "border-red-300 bg-red-50 text-red-800",
  REJECT: "border-red-300 bg-red-50 text-red-800",
  PAY: "border-sky-300 bg-sky-50 text-sky-800",
  GRANT: "border-sky-300 bg-sky-50 text-sky-800",
  APPROVE: "border-sky-300 bg-sky-50 text-sky-800",
};

/**
 * The trail behind one record, on demand.
 *
 * Fetches on open rather than with the page: most records are never asked
 * about, and loading every history alongside every table would cost far more
 * than it earns. Renders field-level before/after, not just "edited" — the
 * point of the trail is that you can see what the value used to be.
 */
export function RecordHistory({
  entityType,
  entityId,
  projectId,
  label,
  variant = "button",
}: {
  entityType: AuditEntityType;
  entityId: string;
  projectId?: string;
  /** Names the record in the dialog title, e.g. a survey number. */
  label?: string;
  variant?: "button" | "icon";
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(open: boolean) {
    if (!open || entries || loading) return;
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ entityType, entityId });
    if (projectId) query.set("projectId", projectId);
    try {
      const res = await fetch(`/api/audit?${query}`);
      const body = (await res.json()) as { entries?: HistoryEntry[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not load the history for this record");
      } else {
        setEntries(body.entries ?? []);
      }
    } catch {
      setError("Could not reach the audit trail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog onOpenChange={load}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={`History of this ${auditEntityLabel(entityType).toLowerCase()}`}
            title="History"
          >
            <Icon icon="mdi:history" width={15} />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Icon icon="mdi:history" width={14} />
            History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {auditEntityLabel(entityType)} history{label ? ` — ${label}` : ""}
          </DialogTitle>
          <DialogDescription>
            Every recorded change to this record, oldest first, with who made it and why.
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {entries && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing has been recorded against this record yet. Entries appear here from the
            moment it is created or changed.
          </p>
        )}

        {entries && entries.length > 0 && (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={ACTION_TONE[entry.action] ?? "border-slate-300 bg-slate-50 text-slate-700"}
                  >
                    {auditActionLabel(entry.action)}
                  </Badge>
                  <span className="text-sm font-medium">{entry.summary}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actorId} ({entry.actorRole}) · {formatDateTime(new Date(entry.createdAt))}
                </p>
                {entry.reason && (
                  <p className="mt-1.5 text-xs">
                    <span className="font-medium">Reason: </span>
                    <span className="text-muted-foreground">{entry.reason}</span>
                  </p>
                )}
                {entry.changes.length > 0 && (
                  <dl className="mt-2 space-y-1">
                    {entry.changes.map((change) => (
                      <div
                        key={change.field}
                        className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 text-xs"
                      >
                        <dt className="text-muted-foreground">{auditFieldLabel(change.field)}</dt>
                        <dd className="break-words">
                          <span className="text-muted-foreground line-through">
                            {auditValueLabel(change.before)}
                          </span>
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          <span className="font-medium">{auditValueLabel(change.after)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p
                  className="mt-2 truncate font-mono text-[10px] text-muted-foreground/70"
                  title={entry.hash}
                >
                  #{entry.seq} · {entry.hash.slice(0, 16)}…
                </p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
