/**
 * Land-rate prediction. Same spirit as risk-score.ts: a deterministic,
 * explainable formula (not a trained model) that projects a plausible
 * near-term compensation rate from the district's own rate history plus
 * a small set of regional/seasonal adjustments seeded from the district
 * name so results are stable across reloads rather than random.
 */

export interface RatePredictionFactor {
  label: string;
  detail: string;
  adjustmentPercent: number;
}

export interface RatePrediction {
  predictedRatePerHectare: number;
  low: number;
  high: number;
  factors: RatePredictionFactor[];
  basisLabel: string;
}

function seededUnit(seed: string): number {
  // Small deterministic hash -> [0, 1), stable per district/state string.
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 100000;
  }
  return h / 100000;
}

export function predictLandRate(input: {
  state: string;
  district: string;
  currentRatePerHectare: number | null;
  lastSetAt: Date | null;
  parcelCount: number;
}): RatePrediction {
  const factors: RatePredictionFactor[] = [];
  const seed = seededUnit(`${input.state}:${input.district}`);

  // Baseline: fall back to a generic per-state floor if no rate has ever
  // been set for this district.
  const base = input.currentRatePerHectare ?? 4_500_000 + seed * 3_000_000;
  if (!input.currentRatePerHectare) {
    factors.push({
      label: "No local rate on record",
      detail: `Estimated from a state-level baseline for ${input.state}`,
      adjustmentPercent: 0,
    });
  } else {
    factors.push({
      label: "Current notified rate",
      detail: `₹${Math.round(input.currentRatePerHectare).toLocaleString("en-IN")}/ha, last set for this district`,
      adjustmentPercent: 0,
    });
  }

  // Time-since-last-set: rates drift upward the longer they've stood.
  let timeAdjust = 0;
  if (input.lastSetAt) {
    const monthsSince =
      (Date.now() - input.lastSetAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    timeAdjust = Math.min(18, Math.round(monthsSince * 0.6));
    if (timeAdjust > 0) {
      factors.push({
        label: "Time since last revision",
        detail: `${Math.round(monthsSince)} month(s) since this rate was last set — market drift applied`,
        adjustmentPercent: timeAdjust,
      });
    }
  }

  // Demand pressure: more parcels in an active project signals higher
  // local demand/scarcity pressure on remaining land.
  const demandAdjust = Math.min(10, Math.round(Math.log2(Math.max(1, input.parcelCount)) * 2));
  if (demandAdjust > 0) {
    factors.push({
      label: "Local acquisition activity",
      detail: `${input.parcelCount} parcel(s) currently active in this project`,
      adjustmentPercent: demandAdjust,
    });
  }

  // A small district-seeded regional variance so different districts
  // don't all move identically.
  const regionalAdjust = Math.round((seed - 0.5) * 10);
  factors.push({
    label: "Regional variance",
    detail: `District-level adjustment relative to the state average`,
    adjustmentPercent: regionalAdjust,
  });

  const totalAdjustPercent = timeAdjust + demandAdjust + regionalAdjust;
  const predicted = base * (1 + totalAdjustPercent / 100);
  const spread = predicted * 0.08;

  return {
    predictedRatePerHectare: Math.round(predicted),
    low: Math.round(predicted - spread),
    high: Math.round(predicted + spread),
    factors,
    basisLabel: input.currentRatePerHectare
      ? "Projected from the district's current notified rate"
      : "Projected from a state-level baseline (no local rate set yet)",
  };
}
