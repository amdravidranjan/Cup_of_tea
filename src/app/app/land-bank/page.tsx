import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listAllLandBank } from "@/db/land-bank";
import { getProject } from "@/db/projects";
import { getParcel } from "@/db/parcels";
import { LandBankList } from "@/components/land-bank-list";

export default async function LandBankPage() {
  const session = await getSession();
  if (!session) return null;
  if (!can(session.role, "land-bank:manage")) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role does not have access to the land bank register.
      </p>
    );
  }

  const entries = await listAllLandBank();
  const withDetails = await Promise.all(
    entries.map(async (e) => {
      const [project, parcel] = await Promise.all([getProject(e.projectId), getParcel(e.parcelId)]);
      return {
        ...e,
        projectName: project?.name ?? "Unknown project",
        village: parcel?.village ?? "Unknown village",
      };
    })
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Land Bank
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Acquired-but-Unused Land
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Parcels flagged from a project as no longer needed for that project&apos;s original
          purpose — tracked here rather than just disappearing from view once a project winds
          down or descopes.
        </p>
      </div>
      <LandBankList entries={withDetails} canManage={can(session.role, "land-bank:manage")} />
    </div>
  );
}
