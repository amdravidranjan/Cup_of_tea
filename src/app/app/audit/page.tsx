import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listProjects } from "@/db/projects";
import { projectScopeFor, scopeProjects } from "@/lib/project-scope";
import { listAuditActors } from "@/db/audit";
import { AuditLogView } from "@/components/audit-log-view";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) return null;
  if (!can(session.role, "audit:view")) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role does not have access to the audit trail.
      </p>
    );
  }

  // The project filter only offers projects this officer can already see, so
  // the dropdown never advertises the existence of another district's work.
  const projects = scopeProjects(await listProjects(), projectScopeFor(session));
  const actors = await listAuditActors();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Security &amp; Governance
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Audit Trail</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every change to every record — who made it, when, from what value to what value, and
          on whose authority. Stage transitions, awards, payments, entitlement grants, document
          uploads and record corrections all land here.
        </p>
      </div>
      <AuditLogView
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        actors={actors}
      />
    </div>
  );
}
