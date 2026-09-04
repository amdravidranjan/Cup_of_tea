"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toneBadgeClass, type StatusTone } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";
import type { LandBankEntry, LandBankStatus } from "@/db/land-bank";

const STATUS_TONE: Record<LandBankStatus, StatusTone> = {
  IDLE: "pending",
  UNDER_REVIEW: "info",
  REPURPOSED: "success",
  DISPOSED: "success",
};

const NEXT_STATUS: Partial<Record<LandBankStatus, LandBankStatus>> = {
  IDLE: "UNDER_REVIEW",
  UNDER_REVIEW: "REPURPOSED",
};

export function LandBankList({
  entries,
  canManage,
}: {
  entries: (LandBankEntry & { projectName: string; village: string })[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function advance(entry: LandBankEntry) {
    const next = NEXT_STATUS[entry.status];
    if (!next) return;
    setUpdating(entry.id);
    const res = await fetch(`/api/land-bank/${entry.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setUpdating(null);
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    router.refresh();
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No parcels flagged into the land bank yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Village</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Flagged</TableHead>
          {canManage && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell>
              <Link href={`/app/projects/${e.projectId}`} className="font-medium hover:underline">
                {e.projectName}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{e.village}</TableCell>
            <TableCell className="text-muted-foreground">{e.reason}</TableCell>
            <TableCell>
              <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[e.status])}>
                {e.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
            {canManage && (
              <TableCell>
                {NEXT_STATUS[e.status] && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updating === e.id}
                    onClick={() => advance(e)}
                  >
                    Mark {NEXT_STATUS[e.status]?.replace("_", " ")}
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
