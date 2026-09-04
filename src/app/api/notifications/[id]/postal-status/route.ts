import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { updatePostalStatus, getNotificationById, NOTIFICATION_STATUSES } from "@/db/notifications-log";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "notification:send")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const notification = await getNotificationById(id);
  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(notification.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as { postalTrackingId?: string; status?: string };
  if (!body.status || !NOTIFICATION_STATUSES.includes(body.status as (typeof NOTIFICATION_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await updatePostalStatus(id, {
    postalTrackingId: body.postalTrackingId,
    status: body.status as (typeof NOTIFICATION_STATUSES)[number],
  });
  return NextResponse.json({ ok: true });
}
