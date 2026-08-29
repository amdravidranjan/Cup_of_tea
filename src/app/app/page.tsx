import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getProjectsWithSLA, getPortfolioStats, getStateBreakdown } from "@/db/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stageTone, toneBadgeClass, slaStatusTone } from "@/lib/status-colors";
import { DashboardStats } from "@/components/dashboard-stats";
import type { SLAMetric } from "@/lib/sla";

const SLA_BADGE_LABELS: Record<SLAMetric["id"], string> = {
  declaration: "Declaration",
  compensation: "Compensation",
  "rr-award": "R&R Award",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const stateFilter = session.role === "state" ? session.state : undefined;
  const showPortfolioStats = session.role === "central" || session.role === "state";

  const summaries = await getProjectsWithSLA(stateFilter ? { state: stateFilter } : undefined);
  const stats = showPortfolioStats
    ? await getPortfolioStats(stateFilter ? { state: stateFilter } : undefined)
    : null;
  const stateBreakdown = session.role === "central" ? await getStateBreakdown() : undefined;

  return (
    <div className="space-y-6">
      {stats && <DashboardStats stats={stats} stateBreakdown={stateBreakdown} />}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
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
                {summaries.map(({ project, metrics }) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.district}, {project.state}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={toneBadgeClass(stageTone(project.stage))}>
                        {project.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {metrics
                          .filter((m) => m.status !== "not-applicable")
                          .map((m) => (
                            <Badge
                              key={m.id}
                              variant="outline"
                              className={toneBadgeClass(slaStatusTone(m.status))}
                            >
                              {SLA_BADGE_LABELS[m.id]}
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
    </div>
  );
}
