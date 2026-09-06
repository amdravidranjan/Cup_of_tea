import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { listAuditEntries, getEntityHistory, countAuditEntries } from "@/db/audit";
import type { AuditAction, AuditEntityType } from "@/lib/audit";

/**
 * Reads the audit trail.
 *
 * Two shapes, because two questions get asked of it. `entityType` +
 * `entityId` answers "what has happened to this record" and is what the
 * History panel on a record calls — any signed-in officer who can see the
 * record can see its history, since a record you can read without knowing
 * who changed it is half a record.
 *
 * Everything else is the supervisory log, which needs `audit:view`.
 *
 * Scope is enforced the same way it is everywhere else: a project-filtered
 * query is checked against the project, and an officer who cannot see a
 * project cannot read its trail.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const entityType = params.get("entityType") as AuditEntityType | null;
  const entityId = params.get("entityId");
  const projectId = params.get("projectId");

  if (entityType && entityId) {
    // A record's own history. Authorized through the project it belongs to
    // when one is named; the record-level check is the caller's own route.
    if (projectId) {
      const project = await getProject(projectId);
      if (!project || !canViewProject(session, project)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    } else if (!can(session.role, "audit:view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const entries = await getEntityHistory(entityType, entityId);
    return NextResponse.json({ entries });
  }

  if (!can(session.role, "audit:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (projectId) {
    const project = await getProject(projectId);
    if (!project || !canViewProject(session, project)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const limitRaw = Number(params.get("limit"));
  const offsetRaw = Number(params.get("offset"));
  const from = params.get("from");
  const to = params.get("to");

  const query = {
    projectId: projectId ?? undefined,
    entityType: entityType ?? undefined,
    actorId: params.get("actorId") ?? undefined,
    action: (params.get("action") as AuditAction | null) ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100,
    offset: Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0,
  };

  const [entries, total] = await Promise.all([
    listAuditEntries(query),
    countAuditEntries({ ...query, limit: undefined, offset: undefined }),
  ]);
  return NextResponse.json({ entries, total });
}
