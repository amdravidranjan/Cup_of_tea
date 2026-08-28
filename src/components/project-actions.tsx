"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Action } from "@/lib/workflow";

export function ProjectActions({
  projectId,
  availableActions,
}: {
  projectId: string;
  availableActions: Action[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function perform(action: Action) {
    setPending(action);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Transition failed");
      return;
    }
    router.refresh();
  }

  if (availableActions.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No actions available for your role at this stage.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => perform(action)}
            disabled={pending !== null}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            {pending === action ? "Working..." : action}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
