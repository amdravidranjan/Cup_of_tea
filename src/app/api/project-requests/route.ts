import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createProjectRequest, listProjectRequests } from "@/db/project-requests";

interface CreateBody {
  title?: string;
  purpose?: string;
  description?: string;
  state?: string;
  district?: string;
  village?: string;
  requesterName?: string;
  requesterContact?: string;
}

// No session required — any member of the public can request that a
// project be taken up, the same way the reference GLMS treats "Public"
// as one of its own stakeholder categories.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateBody;
  if (
    !body.title ||
    !body.purpose ||
    !body.description ||
    !body.state ||
    !body.district ||
    !body.requesterName
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const id = await createProjectRequest({
    title: body.title,
    purpose: body.purpose,
    description: body.description,
    state: body.state,
    district: body.district,
    village: body.village,
    requesterName: body.requesterName,
    requesterContact: body.requesterContact,
  });
  return NextResponse.json({ trackingNumber: id }, { status: 201 });
}

// Internal review queue — scoped like grievances.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project-request:review")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const filter =
    session.role === "state"
      ? { state: session.state }
      : session.role === "district"
        ? { district: session.district }
        : undefined;
  const requests = await listProjectRequests(filter);
  return NextResponse.json({ requests });
}
