import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProject } from "@/db/projects";
import { listParcels } from "@/db/parcels";
import { FieldParcelList } from "@/components/field-parcel-list";
import { OfflineBanner } from "@/components/offline-banner";

export default async function FieldProjectParcelsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const canUpdate = can(session.role, "parcel:update-status");
  const parcels = await listParcels(projectId);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <OfflineBanner />
      <div>
        <Link href="/app/field" className="text-sm text-brand hover:underline">
          ← All projects
        </Link>
        <p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Field Verification
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">{project.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.district}, {project.state}
        </p>
      </div>

      {parcels.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parcels recorded yet.</p>
      ) : (
        <FieldParcelList
          parcels={parcels.map((p) => ({
            id: p.id,
            village: p.village,
            areaHectares: p.areaHectares,
            status: p.status,
          }))}
          canUpdate={canUpdate}
        />
      )}
    </div>
  );
}
