import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { sendNotification, listNotificationsForProject, NOTIFICATION_CHANNELS } from "@/db/notifications-log";
import { getFamilyById } from "@/db/families";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const notifications = await listNotificationsForProject(id);
  return NextResponse.json({ notifications });
}

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
  const project = await getProject(id);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    familyId?: string;
    channel?: string;
    postalDocumentId?: string;
    note?: string;
  };
  if (
    !body.familyId ||
    !body.channel ||
    !NOTIFICATION_CHANNELS.includes(body.channel as (typeof NOTIFICATION_CHANNELS)[number])
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  const family = await getFamilyById(body.familyId);
  if (!family || family.projectId !== id) {
    return NextResponse.json({ error: "Family not found on this project" }, { status: 404 });
  }
  const notificationId = await sendNotification({
    familyId: body.familyId,
    projectId: id,
    channel: body.channel as (typeof NOTIFICATION_CHANNELS)[number],
    postalDocumentId: body.postalDocumentId,
    note: body.note,
    sentBy: session.userId,
  });
  return NextResponse.json({ id: notificationId }, { status: 201 });
}
