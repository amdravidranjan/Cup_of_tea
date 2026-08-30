import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listGrievances } from "@/db/grievances";
import { GrievanceQueue } from "@/components/grievance-queue";

export default async function GrievancesPage() {
  const session = await getSession();
  if (!session) return null;

  const filter = session.role === "state" ? { state: session.state } : undefined;
  const grievances = await listGrievances(filter);
  const canManage = can(session.role, "grievance:manage");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Review Queue
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Grievances</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {grievances.length} filed{" "}
          {grievances.filter((g) => g.status !== "RESOLVED").length > 0 &&
            `(${grievances.filter((g) => g.status !== "RESOLVED").length} open)`}
        </p>
      </div>
      <GrievanceQueue
        grievances={grievances.map((g) => ({
          id: g.id,
          trackingNumber: g.trackingNumber,
          type: g.type,
          projectName: g.projectName,
          submitterName: g.submitterName,
          description: g.description,
          status: g.status,
          createdAt: g.createdAt.toISOString(),
        }))}
        canManage={canManage}
      />
    </div>
  );
}
