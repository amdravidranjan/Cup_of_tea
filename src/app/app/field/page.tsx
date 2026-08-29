import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listProjects } from "@/db/projects";
import { listParcels } from "@/db/parcels";
import { FieldParcelCard } from "@/components/field-parcel-card";

export default async function FieldVerificationPage() {
  const session = await getSession();
  if (!session) return null;

  const canUpdate = can(session.role, "parcel:update-status");
  const projects = await listProjects();
  const projectsWithParcels = await Promise.all(
    projects.map(async (project) => ({
      project,
      parcels: await listParcels(project.id),
    }))
  );
  const nonEmpty = projectsWithParcels.filter((p) => p.parcels.length > 0);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Field Verification
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Parcel Status Checklist
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {canUpdate
            ? "Tap a parcel to record on-ground progress."
            : "Your role can view but not update parcel status."}
        </p>
      </div>

      {nonEmpty.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parcels recorded yet.</p>
      ) : (
        <div className="space-y-6">
          {nonEmpty.map(({ project, parcels }) => (
            <div key={project.id} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
              {parcels.map((parcel) => (
                <FieldParcelCard
                  key={parcel.id}
                  parcel={{
                    id: parcel.id,
                    village: parcel.village,
                    areaHectares: parcel.areaHectares,
                    status: parcel.status,
                  }}
                  canUpdate={canUpdate}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
