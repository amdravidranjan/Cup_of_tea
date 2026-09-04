"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TitleConflict } from "@/db/title-conflicts";

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function ConflictsList({ conflicts }: { conflicts: TitleConflict[] }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState<string | null>(null);

  async function dismiss(key: string) {
    setDismissing(key);
    const res = await fetch("/api/conflicts/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conflictKey: key }),
    });
    setDismissing(null);
    if (!res.ok) {
      toast.error("Failed to dismiss");
      return;
    }
    toast.success("Dismissed as not a conflict");
    router.refresh();
  }

  if (conflicts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No name+village combinations appear on more than one project&apos;s family register.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {conflicts.map((c) => (
        <div key={c.key} className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-red-900">
                {c.headOfHouseholdName} — {c.village}
              </p>
              <p className="text-xs text-red-800">
                Registered as an affected family on {c.occurrences.length} different projects
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={dismissing === c.key}
              onClick={() => dismiss(c.key)}
            >
              Not a conflict
            </Button>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {c.occurrences.map((o) => (
              <li key={o.familyId} className="flex items-center justify-between">
                <Link href={`/app/projects/${o.projectId}`} className="hover:underline">
                  {o.projectName}
                </Link>
                <span className="text-muted-foreground">
                  {o.category} · {formatINR(o.entitlementTotal)} granted
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
