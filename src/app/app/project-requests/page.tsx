import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listProjectRequests } from "@/db/project-requests";
import { ProjectRequestQueue } from "@/components/project-request-queue";

export default async function ProjectRequestsPage() {
  const session = await getSession();
  if (!session) return null;

  if (!can(session.role, "project-request:review")) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role does not have access to project requests.
      </p>
    );
  }

  const filter =
    session.role === "state"
      ? { state: session.state }
      : session.role === "district"
        ? { district: session.district }
        : undefined;
  const requests = await listProjectRequests(filter);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Public Requests
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Project Requests</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Requests submitted by the public asking that a project be taken up.
        </p>
      </div>
      <ProjectRequestQueue requests={requests} />
    </div>
  );
}
