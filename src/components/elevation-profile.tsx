"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ElevationSample } from "@/lib/elevation";
import { summarizeElevation } from "@/lib/elevation";

const ELEVATION_COLOR = "#2563eb";

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { distanceKm: string; elevationMeters: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
      <p className="font-medium">{point.distanceKm} km</p>
      <p className="text-muted-foreground">{point.elevationMeters} m elevation</p>
    </div>
  );
}

export function ElevationProfile({ samples }: { samples: ElevationSample[] }) {
  const summary = summarizeElevation(samples);
  const chartData = samples.map((s) => ({
    distanceKm: (s.distanceMeters / 1000).toFixed(1),
    elevationMeters: s.elevationMeters,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{summary.minElevationMeters}–
            {summary.maxElevationMeters} m</span> elevation range
        </span>
        <span>
          <span className="font-semibold text-foreground">+{summary.totalClimbMeters} m</span> climb
        </span>
        <span>
          <span className="font-semibold text-foreground">−{summary.totalDescentMeters} m</span> descent
        </span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ELEVATION_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ELEVATION_COLOR} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distanceKm"
              tick={{ fontSize: 11 }}
              label={{ value: "Distance (km)", position: "insideBottom", offset: -2, fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={48}
              domain={["dataMin - 10", "dataMax + 10"]}
              label={{ value: "m", angle: 0, position: "insideTopLeft", fontSize: 11 }}
            />
            <Tooltip content={<TooltipContent />} />
            <Area
              type="monotone"
              dataKey="elevationMeters"
              stroke={ELEVATION_COLOR}
              strokeWidth={2}
              fill="url(#elevationFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Source: Open-Elevation (SRTM-derived), sampled at {samples.length} points along the
        alignment.
      </p>
    </div>
  );
}
