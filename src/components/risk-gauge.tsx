"use client";

import { useEffect, useState } from "react";

/** CSS rotation (deg, clockwise) to point a needle that starts pointing
 * straight up at 12 o'clock toward the gauge angle for a given score. */
function needleRotation(score: number): number {
  return 1.8 * score - 90;
}

export function RiskGauge({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const clamped = Math.max(0, Math.min(100, score));
  const rotation = animated ? needleRotation(clamped) : needleRotation(0);

  // Arc segment boundary points (fixed — the zones themselves don't move,
  // only the needle does), computed for a semicircle of radius 80 centered
  // at (100, 100): green 0-33, amber 33-66, red 66-100.
  const arcs = [
    { d: "M 20 100 A 80 80 0 0 1 59.28 31.14", color: "#1f9d55" },
    { d: "M 59.28 31.14 A 80 80 0 0 1 138.54 29.90", color: "#d99a3f" },
    { d: "M 138.54 29.90 A 80 80 0 0 1 180 100", color: "#c0392b" },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 115" className="w-full max-w-[280px]">
        {arcs.map((arc) => (
          <path
            key={arc.d}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={14}
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={animated ? 0 : 100}
            style={{ transition: "stroke-dashoffset 900ms ease-out" }}
          />
        ))}
        {/* Needle, pivoting from the gauge center */}
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "100px 100px",
            transition: "transform 1100ms cubic-bezier(0.34, 1.2, 0.4, 1)",
          }}
        >
          <line x1="100" y1="100" x2="100" y2="32" stroke="#1b2333" strokeWidth={3} strokeLinecap="round" />
          <circle cx="100" cy="100" r="7" fill="#1b2333" />
        </g>
      </svg>
      <div className="-mt-6 text-center">
        <span className="font-[family-name:var(--font-dm-serif)] text-5xl text-foreground">
          {clamped}
        </span>
        <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
