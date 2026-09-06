"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentInsights } from "@/components/document-insights";
import type { DocumentExtraction } from "@/lib/ai/document-intelligence";
import type { Position } from "@/lib/geo";
import { boundaryMethodLabel, formatExtent, landClassificationLabel } from "@/lib/land-records";
import { documentCategoryMeta } from "@/lib/document-categories";

/**
 * A sketch of the plot the way the Field Measurement Book shows it: the
 * boundary, its corner points, the survey number inside, and the adjoining
 * survey numbers around the edge. Deliberately not a map — this is the
 * officer checking the read against the paper record in front of them,
 * before anything is written. The parcel goes onto the real map once it is
 * registered.
 */
function PlotSketch({
  ring,
  surveyNumber,
  adjoining,
}: {
  ring: Position[];
  surveyNumber: string;
  adjoining: string[];
}) {
  const points = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] ? ring.slice(0, -1) : ring;
  if (points.length < 3) return null;

  const size = 224;
  const pad = 30;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLng = maxLng - minLng || 1e-9;
  const spanLat = maxLat - minLat || 1e-9;
  const inner = size - pad * 2;
  const scale = Math.min(inner / spanLng, inner / spanLat);
  const offsetX = (inner - spanLng * scale) / 2;
  const offsetY = (inner - spanLat * scale) / 2;

  const project = ([lng, lat]: Position): [number, number] => [
    pad + offsetX + (lng - minLng) * scale,
    size - pad - offsetY - (lat - minLat) * scale,
  ];

  const projected = points.map(project);
  const pathData = projected.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const cx = projected.reduce((s, [x]) => s + x, 0) / projected.length;
  const cy = projected.reduce((s, [, y]) => s + y, 0) / projected.length;

  // Adjoining plots are labelled against the edge they touch, which is how
  // an FMB sheet identifies a plot — by its neighbours, not by coordinates.
  const edgeLabels = adjoining.slice(0, 4).map((label, i) => {
    const a = projected[i % projected.length];
    const b = projected[(i + 1) % projected.length];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const outward = 1.22;
    return {
      label,
      x: cx + (mx - cx) * outward,
      y: cy + (my - cy) * outward,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-56 w-56 shrink-0 rounded-md border bg-[#fdfbf5]"
      role="img"
      aria-label={`Sketch of survey number ${surveyNumber}`}
    >
      <defs>
        <pattern id="fmb-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="#e2ded0" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={size} height={size} fill="url(#fmb-grid)" />

      <polygon
        points={pathData}
        fill="rgba(37, 99, 235, 0.10)"
        stroke="#1d4ed8"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {projected.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="#1d4ed8" />
      ))}

      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-blue-900"
        style={{ fontSize: 12, fontWeight: 600 }}
      >
        {surveyNumber}
      </text>

      {edgeLabels.map((e) => (
        <text
          key={e.label}
          x={Math.max(10, Math.min(size - 10, e.x))}
          y={Math.max(12, Math.min(size - 6, e.y))}
          textAnchor="middle"
          className="fill-stone-500"
          style={{ fontSize: 8 }}
        >
          {e.label}
        </text>
      ))}

      <g transform={`translate(${size - 20}, 18)`}>
        <path d="M0 8 L0 -6 M0 -6 L-3 -1 M0 -6 L3 -1" stroke="#78716c" strokeWidth="1.2" fill="none" />
        <text y="17" textAnchor="middle" className="fill-stone-500" style={{ fontSize: 7 }}>
          N
        </text>
      </g>
    </svg>
  );
}

export function DocumentIngestPanel({
  projectId,
  documentId,
  category,
  extraction,
  alreadyIngested,
  canIngestParcel,
  canIngestFamily,
}: {
  projectId: string;
  documentId: string;
  category: string;
  extraction: DocumentExtraction;
  alreadyIngested: boolean;
  canIngestParcel: boolean;
  canIngestFamily: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const meta = documentCategoryMeta(category);
  const { parcel, family, advisories } = extraction;

  async function ingest(target: "PARCEL" | "FAMILY") {
    setPending(true);
    const res = await fetch(`/api/projects/${projectId}/documents/${documentId}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    const body = (await res.json()) as {
      error?: string;
      surveyNumber?: string;
      headOfHouseholdName?: string;
      linkedSurveyNumber?: string | null;
    };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not register this record");
      return;
    }
    if (target === "PARCEL") {
      toast.success(`Parcel ${body.surveyNumber} registered from this document`);
    } else {
      toast.success(
        body.linkedSurveyNumber
          ? `${body.headOfHouseholdName} registered and linked to survey ${body.linkedSurveyNumber}`
          : `${body.headOfHouseholdName} registered as an affected family`
      );
    }
    router.refresh();
  }

  const hasRegisterableRecord = Boolean(parcel || family);

  return (
    <div className="space-y-2">
      <DocumentInsights extraction={extraction} />

      {advisories?.map((note) => (
        <p
          key={note}
          className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-900"
        >
          {note}
        </p>
      ))}

      {hasRegisterableRecord && (
        <div className="rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-start gap-4">
            {parcel && (
              <PlotSketch
                ring={parcel.geometry.coordinates[0]}
                surveyNumber={parcel.surveyNumber}
                adjoining={parcel.adjoiningSurveyNumbers}
              />
            )}

            <div className="min-w-[220px] flex-1 space-y-2 text-xs">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">
                {parcel ? "Parcel read from this document" : "Titleholder read from this document"}
              </p>

              {parcel && (
                <dl className="space-y-1">
                  <Row label="Survey number" value={parcel.surveyNumber} />
                  <Row label="Village" value={parcel.village} />
                  <Row label="Extent" value={formatExtent(parcel.areaHectares)} />
                  <Row label="Classification" value={landClassificationLabel(parcel.landClassification)} />
                  <Row label="Boundary source" value={boundaryMethodLabel(parcel.boundaryMethod)} />
                  <Row label="Adjoining" value={parcel.adjoiningSurveyNumbers.join(", ")} />
                </dl>
              )}

              {family && (
                <dl className="space-y-1">
                  <Row label="Titleholder" value={family.headOfHouseholdName} />
                  <Row label="Patta number" value={family.pattaNumber} />
                  <Row label="Survey number" value={family.surveyNumber} />
                  <Row label="Village" value={family.village} />
                  <Row label="Household" value={`${family.memberCount} members`} />
                  <Row label="Aadhaar" value={family.aadhaarMasked} />
                  <Row label="Ration card" value={family.rationCardNumber} />
                </dl>
              )}

              {meta && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {meta.issuedBy} — {meta.basis}
                </p>
              )}

              {alreadyIngested ? (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                  Already read into the register
                </Badge>
              ) : parcel ? (
                canIngestParcel ? (
                  <Button size="sm" disabled={pending} onClick={() => ingest("PARCEL")}>
                    {pending ? "Registering…" : "Register this parcel"}
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    Your role cannot add parcels to this project.
                  </p>
                )
              ) : canIngestFamily ? (
                <Button size="sm" disabled={pending} onClick={() => ingest("FAMILY")}>
                  {pending ? "Registering…" : "Register titleholder as affected family"}
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  Your role cannot register affected families.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
