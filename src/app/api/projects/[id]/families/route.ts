import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createFamily, listFamiliesForProject } from "@/db/families";
import { FAMILY_CATEGORIES } from "@/lib/entitlements";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const families = await listFamiliesForProject(id);
  return NextResponse.json({ families });
}

interface CreateFamilyBody {
  headOfHouseholdName?: string;
  village?: string;
  category?: string;
  memberCount?: number;
  vulnerableGroup?: boolean;
  contactPhone?: string;
  parcelId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "family:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as CreateFamilyBody;

  if (!body.headOfHouseholdName || !body.village || !body.category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!FAMILY_CATEGORIES.includes(body.category as (typeof FAMILY_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!body.memberCount || body.memberCount < 1) {
    return NextResponse.json({ error: "Member count must be at least 1" }, { status: 400 });
  }

  const familyId = await createFamily({
    projectId: id,
    parcelId: body.parcelId,
    headOfHouseholdName: body.headOfHouseholdName,
    village: body.village,
    category: body.category,
    memberCount: body.memberCount,
    vulnerableGroup: body.vulnerableGroup ?? false,
    contactPhone: body.contactPhone,
    surveyedBy: session.userId,
  });
  return NextResponse.json({ familyId });
}
