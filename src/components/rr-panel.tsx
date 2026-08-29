"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RR_STAGES, type RRAction, type RRStage } from "@/lib/rr-workflow";
import type { Role } from "@/lib/workflow";
import { formatDateTime } from "@/lib/format";

const RR_STEP_LABELS: Record<RRStage, string> = {
  SURVEYED: "1. Survey of affected families",
  SCHEME_DRAFTED: "2. R&R Scheme drafted",
  PUBLISHED: "3. Published locally, objection window and public hearing complete",
  SUBMITTED_TO_COLLECTOR: "4. Draft scheme and objections report submitted to Collector",
  COMMITTEE_APPROVED: "5. Committee and Commissioner R&R approval obtained",
  RR_AWARDED: "6. Final R&R Award passed, benefits paid",
};

const RR_STEP_ROLE: Record<RRStage, Role> = {
  SURVEYED: "district",
  SCHEME_DRAFTED: "district",
  PUBLISHED: "district",
  SUBMITTED_TO_COLLECTOR: "district",
  COMMITTEE_APPROVED: "state",
  RR_AWARDED: "district",
};

interface RRHistoryEntry {
  toStage: string;
  actorRole: string;
  note: string | null;
  createdAt: string | Date;
}

export function RRPanel({
  projectId,
  stage,
  history,
  availableActions,
}: {
  projectId: string;
  stage: RRStage | null;
  history: RRHistoryEntry[];
  availableActions: RRAction[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function perform(event: FormEvent<HTMLFormElement>, action: RRAction) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const note = formData.get("note");
    const res = await fetch(`/api/projects/${projectId}/rr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note ? String(note) : undefined }),
    });
    const body = (await res.json()) as { error?: string; stage?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "R&R step failed");
      return;
    }
    toast.success(`R&R advanced to ${body.stage}`);
    router.refresh();
  }

  const completedIndex = stage ? RR_STAGES.indexOf(stage) : -1;
  const nextStage = completedIndex + 1 < RR_STAGES.length ? RR_STAGES[completedIndex + 1] : null;
  const historyByStage = new Map(history.map((h) => [h.toStage, h]));

  return (
    <div className="space-y-2">
      {RR_STAGES.map((step, i) => {
        const entry = historyByStage.get(step);
        const isDone = i <= completedIndex;
        const isNext = step === nextStage;
        return (
          <Card key={step}>
            <CardContent className="flex flex-col gap-2 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{RR_STEP_LABELS[step]}</span>
                <Badge
                  variant="outline"
                  className={
                    isDone
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-dashed text-muted-foreground/60"
                  }
                >
                  {isDone ? "Complete" : "Pending"}
                </Badge>
              </div>
              {entry && (
                <p className="text-xs text-muted-foreground">
                  {entry.actorRole} on {formatDateTime(new Date(entry.createdAt))}
                  {entry.note ? ` — ${entry.note}` : ""}
                </p>
              )}
              {isNext &&
                (availableActions.length > 0 ? (
                  <form
                    onSubmit={(e) => perform(e, availableActions[0])}
                    className="flex items-end gap-2 pt-1"
                  >
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Note (optional)</Label>
                      <Textarea name="note" rows={1} className="min-h-8" />
                    </div>
                    <Button type="submit" size="sm" disabled={pending}>
                      {pending ? "Working..." : "Complete this step"}
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Needs a {RR_STEP_ROLE[step]}-role action to proceed.
                  </p>
                ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
