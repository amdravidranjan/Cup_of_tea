"use client";

import { useState } from "react";
import { renderTraceText, type FormulaTrace } from "@/lib/ai/explain";
import type { InputNote } from "@/lib/ai/input-guard";

/**
 * The two things every sandbox panel needs and none of them should reimplement:
 * the list of repairs made to the input, and the arithmetic behind the answer.
 *
 * They are separate components because they answer different questions. The
 * notes answer "is this what I typed?" — which a judge asks the moment a
 * number looks wrong. The trace answers "how did you get that?" — which is the
 * claim the whole product rests on.
 */

const NOTE_STYLES: Record<InputNote["severity"], string> = {
  info: "border-l-slate-300 bg-slate-50 text-slate-700",
  adjusted: "border-l-amber-400 bg-amber-50 text-amber-900",
  rejected: "border-l-red-400 bg-red-50 text-red-900",
};

/**
 * What was changed about the input before it was used.
 *
 * Rendered above the answer rather than below it, because a repaired input
 * changes how the answer should be read and finding that out afterwards is
 * finding out too late.
 */
export function InputNotes({ notes }: { notes: InputNote[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">
        {notes.length === 1 ? "One adjustment was made to your input" : `${notes.length} adjustments were made to your input`}
      </p>
      {notes.map((note, index) => (
        <div
          key={`${note.field}-${index}`}
          className={`rounded-r border-l-2 px-2.5 py-1.5 text-xs ${NOTE_STYLES[note.severity]}`}
        >
          <span className="font-medium">{note.field}</span>
          <span className="opacity-70"> — you entered {note.received}. </span>
          {note.message}
        </div>
      ))}
    </div>
  );
}

/**
 * The arithmetic, collapsed by default.
 *
 * Collapsed because a judge who has not asked yet should not have to scroll
 * past a spreadsheet, and open in one click because the moment they do ask,
 * hunting for it undermines the point.
 */
export function FormulaTraceView({ trace }: { trace: FormulaTrace }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(renderTraceText(trace));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is blocked in some browsers and on insecure origins.
      // The text is on screen either way, so there is nothing to recover from.
      setCopied(false);
    }
  }

  return (
    <details className="group rounded-md border bg-muted/30">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-brand">
        {trace.title}
      </summary>
      <div className="space-y-3 border-t px-3 py-3">
        <p className="text-xs text-muted-foreground">{trace.method}</p>
        {trace.basis && (
          <p className="rounded border-l-2 border-l-primary/40 bg-primary/5 px-2 py-1.5 text-xs text-foreground">
            {trace.basis}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Term</th>
                <th className="py-1 pr-3 font-medium">Formula</th>
                <th className="py-1 pr-3 font-medium">With your numbers</th>
                <th className="py-1 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {trace.steps.map((step, index) => (
                <tr key={`${step.label}-${index}`} className="border-b last:border-0 align-top">
                  <td className="py-1.5 pr-3">
                    <span className="font-medium text-foreground">{step.label}</span>
                    {step.basis && (
                      <span className="block text-[11px] text-muted-foreground">{step.basis}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-muted-foreground">
                    {step.formula}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-foreground">
                    {step.substitution}
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold text-foreground">
                    {step.result}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td colSpan={3} className="py-1.5 pr-3 font-medium text-foreground">
                  {trace.totalLabel}
                </td>
                <td className="py-1.5 text-right font-mono font-semibold text-foreground">
                  {trace.total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            A fixed formula, not a trained model. The same inputs always produce the same result.
          </p>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
          >
            {copied ? "Copied" : "Copy as text"}
          </button>
        </div>
      </div>
    </details>
  );
}

/** A labelled field for the sandbox forms, so the panels stay declarative. */
export function SandboxField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

/**
 * Preset buttons.
 *
 * Each carries a one-line reason for existing, shown under the label, because
 * a row of unlabelled buttons is a guessing game and the reason is what makes
 * the preset worth pressing.
 */
export function PresetRow<T extends { id: string; label: string; rationale: string }>({
  presets,
  activeId,
  onPick,
}: {
  presets: T[];
  activeId: string | null;
  onPick: (preset: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onPick(preset)}
          className={`rounded-md border px-3 py-2 text-left transition-colors ${
            activeId === preset.id
              ? "border-primary bg-primary/5"
              : "hover:border-primary/40 hover:bg-muted/50"
          }`}
        >
          <span className="block text-xs font-semibold text-foreground">{preset.label}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {preset.rationale}
          </span>
        </button>
      ))}
    </div>
  );
}
