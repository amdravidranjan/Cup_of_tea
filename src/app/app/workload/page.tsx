import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { computeDistrictWorkload } from "@/db/workload";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function WorkloadPage() {
  const session = await getSession();
  if (!session) return null;
  if (!can(session.role, "project:view:all")) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role does not have access to the workload view.
      </p>
    );
  }

  const workload = await computeDistrictWorkload();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Staff Allocation
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          District Workload
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active caseload and SLA breach rate per district — for deciding where staff attention or
          reinforcement is needed, not just where problems have already been flagged.
        </p>
      </div>
      {workload.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active districts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>District</TableHead>
              <TableHead>Active projects</TableHead>
              <TableHead>Open grievances</TableHead>
              <TableHead>SLA breaches</TableHead>
              <TableHead>SLA at-risk</TableHead>
              <TableHead>Breach rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workload.map((w) => (
              <TableRow key={`${w.district}-${w.state}`}>
                <TableCell className="font-medium">
                  {w.district}, {w.state}
                </TableCell>
                <TableCell className="text-muted-foreground">{w.activeProjects}</TableCell>
                <TableCell className="text-muted-foreground">{w.openGrievances}</TableCell>
                <TableCell>
                  {w.slaBreaches > 0 ? (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
                      {w.slaBreaches}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{w.slaAtRisk}</TableCell>
                <TableCell className="text-muted-foreground">
                  {Math.round(w.breachRate * 100)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
