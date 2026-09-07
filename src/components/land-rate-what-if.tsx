"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormulaTraceView, InputNotes, PresetRow, SandboxField } from "@/components/ai-explainability";
import { formatINR, formatINRWords } from "@/lib/ai/input-guard";
import {
  CLASSIFICATION_FACTORS,
  DISTRICT_RATE_TABLE,
  RATE_PRESETS,
  compareMultiplierPolicy,
  predictLandRateSafe,
  ratePresetToInput,
  type RatePreset,
} from "@/lib/ai/land-rate-sandbox";

/**
 * The rate projection, with the inputs exposed, plus the policy question.
 *
 * Two panels in one card because they answer the two halves of the same
 * question. The projection answers "what is land here worth" — a planning
 * figure, explicitly not the s.26 market value for an award. The comparison
 * answers "what would it cost the state to be more generous", which is the
 * question a government audience actually has and the one NOVELTY.md promises:
 * change the multiplier from 2× to 3× and see the effect on a real extent.
 *
 * The comparison runs through Lane C's `calculateCompensation`, the same
 * function a real award uses, so this table cannot drift from what the project
 * workspace shows for an actual parcel.
 */

const DISTRICT_OPTIONS = [...DISTRICT_RATE_TABLE]
  .sort((a, b) => b.baseRatePerHectare - a.baseRatePerHectare)
  .map((d) => d.district);

function presetToForm(preset: RatePreset): Record<string, string> {
  return {
    state: preset.input.state,
    district: preset.input.district,
    rate: preset.input.currentRatePerHectare === null ? "" : String(preset.input.currentRatePerHectare),
    monthsSince: preset.input.monthsSinceRevision === null ? "" : String(preset.input.monthsSinceRevision),
    parcelCount: String(preset.input.parcelCount),
    classification: preset.input.classification ?? "",
  };
}

export function LandRateWhatIf() {
  const [activePreset, setActivePreset] = useState<string | null>(RATE_PRESETS[0].id);
  const [form, setForm] = useState<Record<string, string>>(() => presetToForm(RATE_PRESETS[0]));
  const [policy, setPolicy] = useState({ area: "50", assets: "0", years: "2" });

  const prediction = useMemo(() => {
    const monthsSince = Number(form.monthsSince);
    const lastSetAt =
      form.monthsSince.trim() === "" || !Number.isFinite(monthsSince)
        ? null
        : new Date(Date.now() - monthsSince * 30 * 24 * 60 * 60 * 1000);
    return predictLandRateSafe({
      state: form.state,
      district: form.district,
      currentRatePerHectare: form.rate,
      lastSetAt,
      parcelCount: form.parcelCount,
      classification: form.classification || undefined,
    });
  }, [form]);

  const comparison = useMemo(
    () =>
      compareMultiplierPolicy({
        areaHectares: policy.area,
        ratePerHectare: prediction.prediction.predictedRatePerHectare,
        assetsValue: policy.assets,
        yearsToAward: policy.years,
      }),
    [policy, prediction.prediction.predictedRatePerHectare]
  );

  function set(key: string, value: string) {
    setActivePreset(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  const reference = prediction.reference;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Land rate projection — try your own district
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            A base rate with four percentage adjustments. A planning aid, and not the market value
            an award is built on — s.26 defines that quite differently.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Start from a scenario</p>
            <PresetRow
              presets={RATE_PRESETS}
              activeId={activePreset}
              onPick={(preset) => {
                setActivePreset(preset.id);
                setForm(presetToForm(preset));
              }}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <SandboxField label="District" hint="Any name is accepted; unknown ones fall back to a state band.">
                <Input
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  list="tnglms-districts"
                  className="h-8 text-sm"
                  aria-label="District"
                />
                <datalist id="tnglms-districts">
                  {DISTRICT_OPTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </SandboxField>

              <SandboxField label="State">
                <Input
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="h-8 text-sm"
                  aria-label="State"
                />
              </SandboxField>

              <SandboxField label="Notified rate per hectare" hint="Blank uses the district band. '45 lakh' works.">
                <Input
                  value={form.rate}
                  onChange={(e) => set("rate", e.target.value)}
                  placeholder="e.g. 38,00,000 or 38 lakh"
                  className="h-8 text-sm"
                  aria-label="Notified rate per hectare"
                />
              </SandboxField>

              <SandboxField label="Months since last revised" hint="Drift is capped at 18% however stale.">
                <Input
                  value={form.monthsSince}
                  onChange={(e) => set("monthsSince", e.target.value)}
                  inputMode="numeric"
                  className="h-8 text-sm"
                  aria-label="Months since last revised"
                />
              </SandboxField>

              <SandboxField label="Parcels in the project" hint="Demand term is logarithmic, capped at 10%.">
                <Input
                  value={form.parcelCount}
                  onChange={(e) => set("parcelCount", e.target.value)}
                  inputMode="numeric"
                  className="h-8 text-sm"
                  aria-label="Parcels in the project"
                />
              </SandboxField>

              <SandboxField label="Land classification">
                <select
                  value={form.classification}
                  onChange={(e) => set("classification", e.target.value)}
                  aria-label="Land classification"
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">Not specified</option>
                  {CLASSIFICATION_FACTORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ×{c.factor}
                    </option>
                  ))}
                </select>
              </SandboxField>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {formatINR(prediction.prediction.predictedRatePerHectare)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ hectare</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatINRWords(prediction.prediction.predictedRatePerHectare)} · likely range{" "}
                  {formatINR(prediction.prediction.low)} – {formatINR(prediction.prediction.high)}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">{prediction.prediction.basisLabel}</p>

              {reference && (
                <p className="rounded border-l-2 border-l-primary/40 bg-primary/5 px-2 py-1.5 text-xs">
                  <span className="font-medium text-foreground">
                    {reference.district} — {reference.band} band
                  </span>
                  <span className="block text-muted-foreground">
                    {reference.reason}. Ordinarily a {reference.typicalMultiplier}× First Schedule
                    multiplier. Indicative band, not a gazette value.
                  </span>
                </p>
              )}

              <InputNotes notes={prediction.notes} />

              <div className="space-y-1.5 border-t pt-2">
                {prediction.prediction.factors.map((factor) => (
                  <div key={factor.label} className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{factor.label}</p>
                      <p className="text-muted-foreground">{factor.detail}</p>
                    </div>
                    {factor.adjustmentPercent !== 0 && (
                      <span
                        className={`shrink-0 font-semibold ${
                          factor.adjustmentPercent > 0 ? "text-orange-600" : "text-emerald-600"
                        }`}
                      >
                        {factor.adjustmentPercent > 0 ? "+" : ""}
                        {factor.adjustmentPercent}%
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <FormulaTraceView trace={prediction.trace} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Policy test — what a different multiplier would cost
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            The First Schedule multiplier is the one number in the award a government can decide to
            change. This evaluates the award formula once per multiplier, at the projected rate
            above, using the same arithmetic as a real parcel.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <SandboxField label="Extent" hint="Hectares by default; '120 acres' also works.">
              <Input
                value={policy.area}
                onChange={(e) => setPolicy((p) => ({ ...p, area: e.target.value }))}
                className="h-8 text-sm"
                aria-label="Extent"
              />
            </SandboxField>
            <SandboxField label="Assets value" hint="Trees, wells, structures — s.29.">
              <Input
                value={policy.assets}
                onChange={(e) => setPolicy((p) => ({ ...p, assets: e.target.value }))}
                className="h-8 text-sm"
                aria-label="Assets value"
              />
            </SandboxField>
            <SandboxField label="Years to award" hint="Drives the 12% interest under s.30(3).">
              <Input
                value={policy.years}
                onChange={(e) => setPolicy((p) => ({ ...p, years: e.target.value }))}
                inputMode="numeric"
                className="h-8 text-sm"
                aria-label="Years to award"
              />
            </SandboxField>
          </div>

          <InputNotes notes={comparison.notes} />

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Multiplier</th>
                  <th className="py-1.5 pr-3 font-medium">Market value × factor</th>
                  <th className="py-1.5 pr-3 font-medium">Solatium</th>
                  <th className="py-1.5 pr-3 font-medium">Interest</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Total award</th>
                  <th className="py-1.5 text-right font-medium">Vs lowest</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.multiplier} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-semibold text-foreground">{row.multiplier}×</td>
                    <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                      {formatINRWords(row.breakdown.multipliedMarketValue)}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                      {formatINRWords(row.breakdown.solatium)}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                      {formatINRWords(row.breakdown.interest)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono font-semibold text-foreground">
                      {formatINRWords(row.breakdown.total)}
                    </td>
                    <td className="py-1.5 text-right font-mono text-orange-600">
                      {row.deltaFromFirst === 0 ? "—" : `+${formatINRWords(row.deltaFromFirst)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Computed over {comparison.areaHectares} ha at{" "}
            {formatINR(comparison.ratePerHectare)}/ha, with{" "}
            {formatINR(comparison.assetsValue)} of assets and {comparison.yearsToAward} year(s) to
            award.
          </p>

          <FormulaTraceView trace={comparison.trace} />
        </CardContent>
      </Card>
    </div>
  );
}
