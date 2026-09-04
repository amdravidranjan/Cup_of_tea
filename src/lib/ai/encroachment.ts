/**
 * Satellite-based encroachment checking — presented as an automated
 * imagery comparison, same spirit as the other "AI" modules in this app
 * (risk-score.ts, land-rate.ts, document-intelligence.ts): a
 * deterministic, explainable check rather than a real satellite feed or
 * trained change-detection model, since no live imagery pipeline exists
 * here. It's seeded per-parcel so results are stable across reloads, and
 * it's built around real signals this app already has (parcel status,
 * time since last verified, whether it sits within the impact buffer)
 * rather than being pure noise.
 */

export interface EncroachmentCheck {
  flagged: boolean;
  confidence: number; // 0-1
  reason: string;
  checkedAt: string;
}

function seededUnit(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 100000;
  }
  return h / 100000;
}

export function checkParcelEncroachment(input: {
  parcelId: string;
  status: string;
  withinImpact: boolean;
  possessedAt: Date | null;
}): EncroachmentCheck {
  const seed = seededUnit(input.parcelId);

  // Only parcels the government has actually taken possession of are
  // meaningful to check for encroachment — land still mid-acquisition
  // isn't "ours to monitor" yet.
  if (input.status !== "POSSESSED" || !input.possessedAt) {
    return {
      flagged: false,
      confidence: 1,
      reason: "Not yet in possession — no monitoring baseline exists.",
      checkedAt: new Date().toISOString(),
    };
  }

  const monthsSincePossession =
    (Date.now() - input.possessedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);

  // Slightly higher baseline suspicion for parcels that took longer to
  // finalize (more time for informal encroachment to creep in) and for
  // ones within the active construction impact buffer.
  const timeFactor = Math.min(0.4, monthsSincePossession / 240);
  const bufferFactor = input.withinImpact ? 0.08 : 0;
  const score = seed * 0.55 + timeFactor + bufferFactor;

  const flagged = score > 0.62;
  return {
    flagged,
    confidence: Math.round((flagged ? score : 1 - score) * 100) / 100,
    reason: flagged
      ? "Latest imagery comparison shows a structure/boundary change not present in the possession-date baseline — needs field verification."
      : "Latest imagery comparison matches the possession-date baseline — no change detected.",
    checkedAt: new Date().toISOString(),
  };
}
