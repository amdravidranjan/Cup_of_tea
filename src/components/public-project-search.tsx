"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { stageTone, toneBadgeClass, slaStatusTone } from "@/lib/status-colors";
import type { SLAMetric } from "@/lib/sla";

interface PublicProjectRow {
  id: string;
  name: string;
  state: string;
  district: string;
  stage: string;
  metrics: SLAMetric[];
  coverPhotoUrl: string | null;
}

export function PublicProjectSearch({ projects }: { projects: PublicProjectRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q)
    );
  }, [projects, query]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by project name, state, or district…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching projects.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>District, State</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.coverPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.coverPhotoUrl}
                          alt=""
                          className="h-10 w-14 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-14 shrink-0 rounded bg-secondary" />
                      )}
                      <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.district}, {p.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={toneBadgeClass(stageTone(p.stage))}>
                      {p.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.metrics
                        .filter((m) => m.status !== "not-applicable")
                        .map((m) => (
                          <Badge
                            key={m.id}
                            variant="outline"
                            className={toneBadgeClass(slaStatusTone(m.status))}
                          >
                            {m.label}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
