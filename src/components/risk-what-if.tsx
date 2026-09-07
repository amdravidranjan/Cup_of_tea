"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RiskGauge } from "@/components/risk-gauge";
import { FormulaTraceView, InputNotes, PresetRow, SandboxField } from "@/components/ai-explainability";
import {
  RISK_BANDS,
  RISK_PRESETS,
  assessProjectRiskSafe,
  riskWhatIf,
  type RiskPreset,
} from "@/lib/ai/risk-score-sandbox";

/**
 * The risk score, with the inputs exposed.
 *
 * The card on the project workspace computes from database counts, which means
 * a judge can look at the score but not test it. This panel is the same scorer
 * with a form in front of it, because the only convincing way to show that a
 * number is arithmetic rather than an oracle is to let someone change an input
 * and watch one line of the working move.
 *
 * State is held as strings rather than numbers on purpose. A numeric state
 * cannot represent "the user has cleared this box and is mid-typing", and
 * coercing on every keystroke makes the field fight the person using it. The
 * strings go straight into `assessProjectRiskSafe`, which is built to take
 * anything.
 */

const FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: "openGrievances", label: "Open grievances" },
  { key: "totalGrievances", label: "Grievances filed in total" },
  { key: "slaBreached", label: "Statutory deadlines breached", hint: "Out of four tracked" },
  { key: "slaAtRisk", label: "Deadlines at risk" },
  { key: "slaOnTrack", label: "Deadlines on track" },
  { key: "vulnerableFamilies", label: "Vulnerable families" },
  { key: "totalFamilies", label: "Families registered" },
  { key: "parcelsPossessed", label: "Parcels possessed" },
  { key: "totalParcels", label: "Parcels in the project" },
  { key: "openLegalDisputes", label: "Undisposed court matters" },
];

const BAND_BADGE: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Moderate: "bg-amber-100 text-amber-800 border-amber-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Critical: "bg-red-100 text-red-800 border-red-200",
};

function presetToForm(preset: RiskPreset): Record<string, string> {
  const form: Record<string, string> = { stage: preset.input.stage };
  for (const field of FIELDS) {
    form[field.key] = String((preset.input as unknown as Record<string, number>)[field.key]);
  }
  return form;
}

export function RiskWhatIf({ initial }: { initial?: Record<string, unknown> }) {
  const [activePreset, setActivePreset] = useState<string | null>(
    initial ? null : RISK_PRESETS[0].id
  );
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (initial) {
      const seeded: Record<string, string> = { stage: String(initial.stage ?? "DRAFT") };
      for (const field of FIELDS) seeded[field.key] = String(initial[field.key] ?? 0);
      return seeded;
    }
    return presetToForm(RISK_PRESETS[0]);
  });

  const result = useMemo(() => assessProjectRiskSafe(form), [form]);
  const whatIf = useMemo(() => riskWhatIf(result.input), [result.input]);

  function set(key: string, value: string) {
    setActivePreset(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">Risk score — try your own numbers</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Six weighted signals, capped to 0–100. Change any box and the working below changes with it.
          </p>
        </div>
        <Badge variant="outline" className={BAND_BADGE[result.assessment.band]}>
          {result.assessment.band} risk
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium text-foreground">Start from a scenario</p>
          <PresetRow
            presets={RISK_PRESETS}
            activeId={activePreset}
            onPick={(preset) => {
              setActivePreset(preset.id);
              setForm(presetToForm(preset));
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
          <div className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <SandboxField key={field.key} label={field.label} hint={field.hint}>
                  <Input
                    value={form[field.key] ?? ""}
                    onChange={(e) => set(field.key, e.target.value)}
                    inputMode="numeric"
                    className="h-8 text-sm"
                    aria-label={field.label}
                  />
                </SandboxField>
              ))}
            </div>
            <SandboxField label="Stage" hint="Recorded but not weighted — the score does not depend on it.">
              <Input
                value={form.stage ?? ""}
                onChange={(e) => set("stage", e.target.value)}
                className="h-8 text-sm"
                aria-label="Stage"
              />
            </SandboxField>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
              <RiskGauge score={result.assessment.score} />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{result.assessment.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {RISK_BANDS.map((band) => (
                    <span
                      key={band.band}
                      title={band.meaning}
                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                        band.band === result.assessment.band
                          ? BAND_BADGE[band.band]
                          : "border-transparent bg-muted text-muted-foreground"
                      }`}
                    >
                      {band.band} {band.from}–{band.to}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <InputNotes notes={result.notes} />

            <div className="space-y-2 border-t pt-3">
              {result.assessment.factors.map((factor) => (
                <div key={factor.label} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{factor.label}</p>
                    <p className="text-xs text-muted-foreground">{factor.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-xs font-semibold ${
                      factor.points >= 0 ? "text-orange-600" : "text-emerald-600"
                    }`}
                  >
                    {factor.points >= 0 ? "+" : ""}
                    {factor.points}
                  </span>
                </div>
              ))}
            </div>

            <FormulaTraceView trace={result.trace} />

            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground">
                What would move this score
              </p>
              <p className="text-[11px] text-muted-foreground">
                One lever at a time, so the movement is attributable to a single action.
              </p>
              <div className="space-y-1">
                {whatIf.map((delta) => (
                  <div key={delta.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground">{delta.label}</span>
                    <span className="flex shrink-0 items-center gap-1.5 font-mono">
                      <span className="text-muted-foreground">{delta.before}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-foreground">{delta.after}</span>
                      <span
                        className={
                          delta.change === 0
                            ? "text-muted-foreground"
                            : delta.change > 0
                              ? "text-red-600"
                              : "text-emerald-600"
                        }
                      >
                        ({delta.change > 0 ? "+" : ""}
                        {delta.change})
                      </span>
                      {delta.bandBefore !== delta.bandAfter && (
                        <span className="rounded border px-1 text-[10px] text-foreground">
                          {delta.bandAfter}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
