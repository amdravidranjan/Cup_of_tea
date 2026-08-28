"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

  async function perform(action: Action) {
    setPending(action);
    const res = await fetch(`/api/projects/${projectId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = (await res.json()) as { error?: string; stage?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Transition failed");
      return;
    }
    toast.success(`Moved to ${body.stage}`);
    router.refresh();
  }

  if (availableActions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No actions available for your role at this stage.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableActions.map((action) => (
        <Button
          key={action}
          type="button"
          variant="outline"
          onClick={() => perform(action)}
          disabled={pending !== null}
        >
          {pending === action ? "Working…" : action}
        </Button>
      ))}
    </div>
  );
}
