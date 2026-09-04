"use client";

import { useEffect, useState } from "react";

export interface StageHeaderStep {
  key: string;
  label: string;
  /** ISO date string this stage was first reached, or null if not yet reached. */
  reachedAt: string | null;
}

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/**
 * The project's lifecycle progress, built as part of the page's own dark
 * architecture rather than a floating card — a full-width band with the
 * amber fill animating in on mount and each reached stage stamped with
 * the month/year it actually happened, not just an abstract dot.
 */
export function StageHeaderBar({
  steps,
  currentIndex,
}: {
  steps: StageHeaderStep[];
  currentIndex: number;
}) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const targetPercent = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full bg-[#0e1a30] px-6 pb-5 pt-4 text-white">
      <div className="relative">
        <div className="absolute left-0 right-0 top-[7px] h-[2px] bg-white/15" />
        <div
          className="absolute left-0 top-[7px] h-[2px] bg-[#d99a3f] transition-[width] duration-[1200ms] ease-out"
          style={{ width: `${filled ? targetPercent : 0}%` }}
        />
        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const reached = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={step.key} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={`h-[15px] w-[15px] rounded-full border-2 transition-colors duration-500 ${
                    reached
                      ? "border-[#d99a3f] bg-[#d99a3f]"
                      : "border-white/25 bg-[#0e1a30]"
                  } ${isCurrent ? "ring-2 ring-[#d99a3f]/40" : ""}`}
                />
                <span
                  className={`max-w-[6.5rem] text-[10px] font-semibold uppercase tracking-wide ${
                    isCurrent ? "text-white" : reached ? "text-white/70" : "text-white/35"
                  }`}
                >
                  {step.label}
                </span>
                <span className="font-mono text-[10px] text-white/45">
                  {step.reachedAt ? monthYear(step.reachedAt) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
