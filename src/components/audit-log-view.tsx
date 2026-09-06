"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface Entry {
  id: string;
  seq: number;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  projectId: string | null;
  summary: string;
  reason: string | null;
  changes: FieldChange[];
  ip: string | null;
  hash: string;
  createdAt: string;
}

interface Verification {
  valid: boolean;
  checked: number;
  brokenAt: { id: string; index: number; reason: string } | null;
}

const ENTITY_TYPES: AuditEntityType[] = [
  "PROJECT", "PARCEL", "FAMILY", "ENTITLEMENT", "COMPENSATION", "COMPENSATION_RATE",
  "DOCUMENT", "GRIEVANCE", "LEGAL_DISPUTE", "TENDER", "INFRASTRUCTURE_ITEM",
  "REHABILITATION_SERVICE", "GRAM_SABHA", "LAND_BANK_ENTRY", "NOTICE_DRAFT",
  "NOTIFICATION", "PROJECT_REQUEST", "CONFLICT_DISMISSAL", "SESSION",
];

const ACTIONS: AuditAction[] = [
  "CREATE", "UPDATE", "DELETE", "STAGE_TRANSITION", "GRANT", "PAY", "APPROVE",
  "REJECT", "DISMISS", "INGEST", "UPLOAD", "SUPERSEDE", "SEND", "STATUS_CHANGE", "SIGN_IN",
];

const PAGE_SIZE = 50;
const ANY = "__any__";

export function AuditLogView({
  projects,
  actors,
}: {
  projects: { id: string; name: string }[];
  actors: { actorId: string; actorRole: string }[];
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [projectId, setProjectId] = useState(ANY);
  const [entityType, setEntityType] = useState(ANY);
  const [action, setAction] = useState(ANY);
  const [actorId, setActorId] = useState(ANY);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /**
   * Fetches whenever the query changes.
   *
   * `setLoading(true)` deliberately lives in the change handlers below rather
   * than here: setting state synchronously in an effect body causes a
   * cascading render, and the spinner belongs to the interaction that started
   * the request anyway. The effect only synchronizes with the API and writes
   * state back from the resolved promise.
   */
  useEffect(() => {
    const controller = new AbortController();

    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (projectId !== ANY) query.set("projectId", projectId);
    if (entityType !== ANY) query.set("entityType", entityType);
    if (action !== ANY) query.set("action", action);
    if (actorId !== ANY) query.set("actorId", actorId);
    if (from) query.set("from", new Date(from).toISOString());
    // An end date names a day, so include all of it rather than stopping at
    // midnight and silently hiding everything that happened that day.
    if (to) query.set("to", new Date(`${to}T23:59:59.999`).toISOString());

    fetch(`/api/audit?${query}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<{ entries?: Entry[]; total?: number }>)
      .then((body) => {
        setEntries(body.entries ?? []);
        setTotal(body.total ?? 0);
        setLoading(false);
      })
      .catch((err: unknown) => {
        // An aborted request was superseded by a newer one, which will set
        // the state itself — treating it as a failure would clear the table
        // and stop the spinner under the request still in flight.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setEntries([]);
        setTotal(0);
        setLoading(false);
      });

    return () => controller.abort();
  }, [page, projectId, entityType, action, actorId, from, to]);

  /**
   * Applies a filter change: a new filter invalidates whatever page number
   * was showing, so the two move together rather than leaving the view on
   * page 4 of a result set that now has one page.
   */
  function applyFilter(set: (value: string) => void) {
    return (value: string) => {
      setLoading(true);
      setPage(0);
      set(value);
    };
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  async function verify() {
    setVerifying(true);
    const res = await fetch("/api/audit/verify");
    setVerification((await res.json()) as Verification);
    setVerifying(false);
  }

  const filtered = projectId !== ANY || entityType !== ANY || action !== ANY || actorId !== ANY || from || to;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Icon icon="mdi:link-variant" width={18} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="text-sm font-medium">Tamper-evident chain</p>
              <p className="text-xs text-muted-foreground">
                Each entry is hashed together with the one before it. Editing or deleting any
                historical entry breaks the chain from that point onward.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={verify} disabled={verifying}>
            {verifying ? "Verifying…" : "Verify the chain"}
          </Button>
        </div>
        {verification && (
          <p
            className={`mt-2 text-sm ${verification.valid ? "text-emerald-700" : "text-red-700"}`}
          >
            {verification.valid ? (
              <>
                <Icon icon="mdi:check-circle" width={14} className="mr-1 inline" />
                Intact — {verification.checked} entries re-derived and matched.
              </>
            ) : (
              <>
                <Icon icon="mdi:alert-circle" width={14} className="mr-1 inline" />
                Broken at entry {verification.brokenAt?.index}: {verification.brokenAt?.reason}.
                Everything after it is unverifiable.
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1">
          <Label className="text-xs">Project</Label>
          <Select value={projectId} onValueChange={applyFilter(setProjectId)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Record type</Label>
          <Select value={entityType} onValueChange={applyFilter(setEntityType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All types</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{auditEntityLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select value={action} onValueChange={applyFilter(setAction)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{auditActionLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Officer</Label>
          <Select value={actorId} onValueChange={applyFilter(setActorId)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Anyone</SelectItem>
              {actors.map((a) => (
                <SelectItem key={a.actorId} value={a.actorId}>
                  {a.actorId} ({a.actorRole})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="audit-from">From</Label>
          <Input id="audit-from" type="date" value={from} onChange={(e) => applyFilter(setFrom)(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="audit-to">To</Label>
          <Input id="audit-to" type="date" value={to} onChange={(e) => applyFilter(setTo)(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {loading
            ? "Loading…"
            : `${total} ${total === 1 ? "entry" : "entries"}${filtered ? " matching these filters" : ""}`}
        </span>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              setPage(0);
              setProjectId(ANY); setEntityType(ANY); setAction(ANY);
              setActorId(ANY); setFrom(""); setTo("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {!loading && entries.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {filtered
            ? "No entries match these filters."
            : "The trail is empty. Entries appear here as soon as anyone changes a record."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Officer</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>What changed</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <>
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {entry.seq}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(new Date(entry.createdAt))}
                  </TableCell>
                  <TableCell className="text-xs">
                    {entry.actorId}
                    <span className="block text-muted-foreground">{entry.actorRole}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap text-[11px]">
                      {auditEntityLabel(entry.entityType)} · {auditActionLabel(entry.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.summary}
                    {entry.projectId && (
                      <Link
                        href={`/app/projects/${entry.projectId}`}
                        className="ml-2 text-xs text-brand hover:underline"
                      >
                        open project
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    {(entry.changes.length > 0 || entry.reason) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label={expanded === entry.id ? "Hide detail" : "Show detail"}
                        onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                      >
                        <Icon
                          icon={expanded === entry.id ? "mdi:chevron-up" : "mdi:chevron-down"}
                          width={16}
                        />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {expanded === entry.id && (
                  <TableRow key={`${entry.id}-detail`}>
                    <TableCell colSpan={6} className="bg-muted/30">
                      {entry.reason && (
                        <p className="mb-2 text-xs">
                          <span className="font-medium">Reason: </span>
                          <span className="text-muted-foreground">{entry.reason}</span>
                        </p>
                      )}
                      {entry.changes.length > 0 && (
                        <dl className="space-y-1">
                          {entry.changes.map((change) => (
                            <div
                              key={change.field}
                              className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-3 text-xs"
                            >
                              <dt className="text-muted-foreground">
                                {auditFieldLabel(change.field)}
                              </dt>
                              <dd className="break-all">
                                <span className="text-muted-foreground line-through">
                                  {auditValueLabel(change.before)}
                                </span>
                                <span className="mx-1.5">→</span>
                                <span className="font-medium">{auditValueLabel(change.after)}</span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <p className="mt-2 font-mono text-[10px] break-all text-muted-foreground/70">
                        record {entry.entityType}:{entry.entityId}
                        {entry.ip ? ` · from ${entry.ip}` : ""} · hash {entry.hash}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => goToPage(Math.max(0, page - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {lastPage + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage || loading}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
