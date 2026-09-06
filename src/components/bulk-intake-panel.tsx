"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DOCUMENT_CATEGORY_META, type DocumentCategory } from "@/lib/document-categories";

type Outcome = "CREATE" | "UPDATE" | "UNCHANGED" | "CONFLICT" | "INVALID";

interface PlanRow {
  rowNumber: number;
  outcome: Outcome;
  label: string;
  detail: string;
  matchedId: string | null;
  changes: { field: string; before: unknown; after: unknown }[];
  problems: string[];
  extent: number | null;
  holderName: string | null;
}

interface Plan {
  category: string;
  title: string;
  rowNoun: string;
  method: string;
  counts: Record<Outcome, number>;
  missingHeaders: { field: string; label: string; aliases: string[] }[];
  unknownHeaders: string[];
  warnings: string[];
  rows: PlanRow[];
}

interface Rejection {
  fileName: string;
  reason: string;
  remedy: string;
}

const OUTCOME_STYLE: Record<Outcome, { label: string; className: string; icon: string }> = {
  CREATE: { label: "New", className: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: "mdi:plus-circle-outline" },
  UPDATE: { label: "Updates existing", className: "border-amber-300 bg-amber-50 text-amber-800", icon: "mdi:pencil-outline" },
  UNCHANGED: { label: "Already on file", className: "border-slate-300 bg-slate-50 text-slate-600", icon: "mdi:equal" },
  CONFLICT: { label: "Needs a decision", className: "border-orange-300 bg-orange-50 text-orange-800", icon: "mdi:alert-outline" },
  INVALID: { label: "Cannot be read", className: "border-red-300 bg-red-50 text-red-800", icon: "mdi:close-circle-outline" },
};

const ACCEPT = ".csv,.xlsx,.docx,.pdf";

/**
 * Bulk land-record intake.
 *
 * The problem this replaces: one document produced one record, so a
 * 400-parcel alignment meant 800 uploads and 800 confirmations. Here an
 * officer drops the village extract their taluk office already has, sees
 * every row it contains and what each would do to the register, deselects
 * anything they disagree with, and commits the rest in one go.
 */
export function BulkIntakePanel({
  projectId,
  readableCategories,
}: {
  projectId: string;
  readableCategories: DocumentCategory[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(readableCategories[0] ?? "PATTA_CHITTA");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [errorReport, setErrorReport] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const meta = DOCUMENT_CATEGORY_META[category as DocumentCategory];

  const reset = useCallback(() => {
    setPlan(null);
    setRejection(null);
    setErrorReport("");
    setSelected(new Set());
  }, []);

  const preview = useCallback(
    async (chosen: File) => {
      setBusy(true);
      reset();
      setFile(chosen);

      const body = new FormData();
      body.set("file", chosen);
      body.set("category", category);

      const res = await fetch(`/api/projects/${projectId}/intake`, { method: "POST", body });
      const payload = await res.json();
      setBusy(false);

      if (res.status === 422 && payload.rejected) {
        setRejection({ fileName: payload.fileName, reason: payload.reason, remedy: payload.remedy });
        return;
      }
      if (!res.ok) {
        toast.error(payload.error ?? "The file could not be read");
        return;
      }

      const next = payload.plan as Plan;
      setPlan(next);
      setErrorReport(payload.errorReport ?? "");
      // Everything committable starts selected — the officer deselects what
      // they disagree with, rather than hand-picking hundreds of good rows.
      setSelected(
        new Set(next.rows.filter((r) => r.outcome === "CREATE" || r.outcome === "UPDATE").map((r) => r.rowNumber))
      );
    },
    [category, projectId, reset]
  );

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) void preview(dropped);
  }

  async function commit() {
    if (!file || !plan) return;
    setBusy(true);
    const body = new FormData();
    body.set("file", file);
    body.set("category", category);
    body.set("commit", "true");
    body.set("rows", JSON.stringify([...selected]));

    const res = await fetch(`/api/projects/${projectId}/intake`, { method: "POST", body });
    const payload = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast.error(payload.error ?? "The batch could not be committed");
      return;
    }
    toast.success(
      `${payload.created} ${plan.rowNoun}${payload.created === 1 ? "" : "s"} registered` +
        (payload.updated ? `, ${payload.updated} updated` : "")
    );
    setFile(null);
    reset();
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function downloadErrorReport() {
    const blob = new Blob([errorReport], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${file?.name ?? "upload"}-errors.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const committable = plan
    ? plan.rows.filter((r) => r.outcome === "CREATE" || r.outcome === "UPDATE")
    : [];
  const blocked = plan ? plan.missingHeaders.length > 0 : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="intake-category" className="text-xs">
            What is in this file?
          </Label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              reset();
            }}
          >
            <SelectTrigger id="intake-category" className="w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {readableCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {DOCUMENT_CATEGORY_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/templates/${category.toLowerCase()}`}>
              <Icon icon="mdi:file-table-outline" width={14} className="mr-1.5" />
              Blank template
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/api/templates/${category.toLowerCase()}?format=guide`}>
              <Icon icon="mdi:help-circle-outline" width={14} className="mr-1.5" />
              What goes in it
            </a>
          </Button>
        </div>
      </div>

      {meta && (
        <p className="text-xs text-muted-foreground">
          {meta.issuedBy} — {meta.basis}.
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-brand bg-brand/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
        }`}
      >
        <Icon icon="mdi:tray-arrow-down" width={32} className="mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">
          {busy ? "Reading…" : "Drop the village extract here, or click to choose"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          .csv, .xlsx, .docx, or .pdf with a text layer — up to 25 MB. One row per {plan?.rowNoun ?? "record"}.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          A scan or photograph cannot be read and will say so.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) void preview(chosen);
          }}
        />
      </div>

      {rejection && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <Icon icon="mdi:file-cancel-outline" width={18} className="mt-0.5 shrink-0 text-red-700" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Rejected — {rejection.fileName}
              </p>
              <p className="mt-1 text-sm text-red-800">{rejection.reason}</p>
              <p className="mt-2 text-sm text-red-800">{rejection.remedy}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/templates/${category.toLowerCase()}`}>Download the template</a>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                  Choose another file
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {plan && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{file?.name}</span>
            <span className="text-xs text-muted-foreground">read as {plan.method}</span>
            {(Object.keys(OUTCOME_STYLE) as Outcome[])
              .filter((o) => plan.counts[o] > 0)
              .map((o) => (
                <Badge key={o} variant="outline" className={OUTCOME_STYLE[o].className}>
                  {plan.counts[o]} {OUTCOME_STYLE[o].label.toLowerCase()}
                </Badge>
              ))}
          </div>

          {blocked && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-medium">Required columns are missing, so nothing can be read.</p>
              <ul className="mt-1 list-inside list-disc">
                {plan.missingHeaders.map((m) => (
                  <li key={m.field}>
                    <strong>{m.label}</strong>
                    {m.aliases.length > 0 && (
                      <span className="text-red-800">
                        {" "}
                        (also accepted: {m.aliases.join(", ")})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.unknownHeaders.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Columns kept but not read: {plan.unknownHeaders.join(", ")}.
            </p>
          )}
          {plan.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">
              {w}
            </p>
          ))}

          <div className="max-h-[26rem] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select every committable row"
                      checked={committable.length > 0 && selected.size === committable.length}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? new Set(committable.map((r) => r.rowNumber)) : new Set()
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>{plan.rowNoun === "plot" ? "Survey no." : "Titleholder"}</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Extent</TableHead>
                  <TableHead>What committing does</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.rows.map((row) => {
                  const style = OUTCOME_STYLE[row.outcome];
                  const selectable = row.outcome === "CREATE" || row.outcome === "UPDATE";
                  return (
                    <TableRow key={row.rowNumber}>
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Include row ${row.rowNumber}`}
                          disabled={!selectable}
                          checked={selected.has(row.rowNumber)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(row.rowNumber);
                            else next.delete(row.rowNumber);
                            setSelected(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-muted-foreground">{row.detail || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.extent !== null ? `${row.extent} ha` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={style.className}>
                          {style.label}
                        </Badge>
                        {row.changes.length > 0 && (
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {row.changes.map((c) => (
                              <li key={c.field}>
                                {c.field}: {String(c.before)} → <strong>{String(c.after)}</strong>
                              </li>
                            ))}
                          </ul>
                        )}
                        {row.problems.map((p, i) => (
                          <p key={i} className="mt-1 text-xs text-red-700">
                            {p}
                          </p>
                        ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={commit} disabled={busy || blocked || selected.size === 0}>
              {busy
                ? "Committing…"
                : `Commit ${selected.size} ${plan.rowNoun}${selected.size === 1 ? "" : "s"}`}
            </Button>
            {(plan.counts.INVALID > 0 || plan.counts.CONFLICT > 0 || blocked) && (
              <Button variant="outline" onClick={downloadErrorReport}>
                <Icon icon="mdi:download" width={14} className="mr-1.5" />
                Download the error report
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setFile(null);
                reset();
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
