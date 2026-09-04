"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toneBadgeClass } from "@/lib/status-colors";
import type { NoticeDraft } from "@/db/notice-drafts";

export function NoticeDraftsPanel({
  projectId,
  drafts,
  families,
  canManage,
}: {
  projectId: string;
  drafts: NoticeDraft[];
  families: { id: string; headOfHouseholdName: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [familyId, setFamilyId] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    const res = await fetch(`/api/projects/${projectId}/notice-drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: familyId || undefined }),
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error("Failed to generate draft");
      return;
    }
    toast.success("Draft generated — review before approving");
    router.refresh();
  }

  async function approve(draft: NoticeDraft) {
    const editedText = editing[draft.id] ?? draft.draftText;
    setApproving(draft.id);
    const res = await fetch(`/api/notice-drafts/${draft.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editedText }),
    });
    setApproving(null);
    if (!res.ok) {
      toast.error("Failed to approve");
      return;
    }
    toast.success("Notice approved");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            className="h-9 rounded-md border px-2 text-sm"
          >
            <option value="">General notice (no specific family)</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.headOfHouseholdName}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" onClick={generate} disabled={generating}>
            {generating ? "Drafting…" : "Generate draft"}
          </Button>
        </div>
      )}
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notice drafts yet.</p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((d) => (
            <li key={d.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={toneBadgeClass(d.status === "APPROVED" ? "success" : "pending")}
                >
                  {d.status}
                </Badge>
              </div>
              {d.status === "DRAFT" && canManage ? (
                <>
                  <Textarea
                    defaultValue={d.draftText}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    rows={6}
                    className="text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Auto-drafted from project data — edit as needed, then approve. Nothing is sent
                    until approved.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={approving === d.id}
                    onClick={() => approve(d)}
                  >
                    {approving === d.id ? "Approving…" : "Approve notice"}
                  </Button>
                </>
              ) : (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{d.draftText}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
