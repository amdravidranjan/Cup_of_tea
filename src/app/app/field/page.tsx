import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listProjects } from "@/db/projects";
import { listParcels } from "@/db/parcels";
import { Card, CardContent } from "@/components/ui/card";
import { OfflineBanner } from "@/components/offline-banner";
import { projectScopeFor, scopeProjects } from "@/lib/project-scope";

export default async function FieldVerificationPage() {
  const session = await getSession();
  if (!session) return null;

  const canUpdate = can(session.role, "parcel:update-status");
  const projects = scopeProjects(await listProjects(), projectScopeFor(session));
  const projectsWithCounts = await Promise.all(
    projects.map(async (project) => {
      const parcels = await listParcels(project.id);
      return {
        project,
        total: parcels.length,
        possessed: parcels.filter((p) => p.status === "POSSESSED").length,
      };
    })
  );
  const nonEmpty = projectsWithCounts.filter((p) => p.total > 0);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <OfflineBanner />
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Field Verification
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Select a project
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {canUpdate
            ? "Pick a project to record on-ground parcel progress."
            : "Your role can view but not update parcel status."}
        </p>
      </div>

      {nonEmpty.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parcels recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {nonEmpty.map(({ project, total, possessed }) => (
            <Link key={project.id} href={`/app/field/${project.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="space-y-1 py-4">
                  <p className="text-base font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.district}, {project.state}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {possessed} of {total} parcels possessed
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
