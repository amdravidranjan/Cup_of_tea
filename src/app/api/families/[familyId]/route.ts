import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getFamilyById, updateFamily, type UpdateFamilyInput } from "@/db/families";
import { getParcel } from "@/db/parcels";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import { isNoOpChange } from "@/lib/audit";
import { FAMILY_CATEGORIES } from "@/lib/entitlements";
import { AFFECTED_FAMILY_BASES, type AffectedFamilyBasis } from "@/lib/land-records";

type Family = NonNullable<Awaited<ReturnType<typeof getFamilyById>>>;

function snapshot(family: Family) {
  return {
    headOfHouseholdName: family.headOfHouseholdName,
    village: family.village,
    category: family.category,
    memberCount: family.memberCount,
    vulnerableGroup: family.vulnerableGroup,
    contactPhone: family.contactPhone ?? null,
    contactEmail: family.contactEmail ?? null,
    parcelId: family.parcelId ?? null,
    entitlementBasis: family.entitlementBasis ?? null,
    rationCardNumber: family.rationCardNumber ?? null,
  };
}

/**
 * Corrects an affected-family record.
 *
 * `entitlementBasis` is the limb of s.3(c) that makes this household an
 * affected family at all, and for a non-titleholder it is the whole
 * justification for their entitlement. Changing it changes what they are
 * owed, which is exactly why it is editable and exactly why the edit has to
 * be explained and recorded.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "record:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { familyId } = await params;
  const family = await getFamilyById(familyId);
  if (!family) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(family.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as UpdateFamilyInput & { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required to change a record already on the file" },
      { status: 400 }
    );
  }

  if (body.headOfHouseholdName !== undefined && !body.headOfHouseholdName.trim()) {
    return NextResponse.json({ error: "Head of household cannot be blank" }, { status: 400 });
  }
  if (
    body.category !== undefined &&
    !FAMILY_CATEGORIES.includes(body.category as (typeof FAMILY_CATEGORIES)[number])
  ) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (body.memberCount !== undefined && (!Number.isInteger(body.memberCount) || body.memberCount < 1)) {
    return NextResponse.json({ error: "Member count must be at least 1" }, { status: 400 });
  }
  if (
    body.entitlementBasis !== undefined &&
    body.entitlementBasis !== null &&
    !AFFECTED_FAMILY_BASES.includes(body.entitlementBasis as AffectedFamilyBasis)
  ) {
    return NextResponse.json({ error: "Invalid entitlement basis" }, { status: 400 });
  }
  // A family can only be attached to a plot on its own project. Without this
  // an edit could quietly link a household to another district's parcel.
  if (body.parcelId) {
    const parcel = await getParcel(body.parcelId);
    if (!parcel || parcel.projectId !== family.projectId) {
      return NextResponse.json(
        { error: "That parcel is not on this project" },
        { status: 400 }
      );
    }
  }

  const update: UpdateFamilyInput = {
    headOfHouseholdName: body.headOfHouseholdName?.trim(),
    village: body.village?.trim(),
    category: body.category,
    memberCount: body.memberCount,
    vulnerableGroup: body.vulnerableGroup,
    contactPhone: body.contactPhone === undefined ? undefined : body.contactPhone?.trim() || null,
    contactEmail: body.contactEmail === undefined ? undefined : body.contactEmail?.trim() || null,
    parcelId: body.parcelId === undefined ? undefined : body.parcelId || null,
    entitlementBasis: body.entitlementBasis,
    rationCardNumber:
      body.rationCardNumber === undefined ? undefined : body.rationCardNumber?.trim() || null,
  };

  const before = snapshot(family);
  const after = { ...before, ...Object.fromEntries(
    Object.entries(update).filter(([, v]) => v !== undefined)
  ) };
  if (isNoOpChange(before, after)) {
    return NextResponse.json({ error: "Nothing was changed" }, { status: 400 });
  }

  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "UPDATE",
      entityType: "FAMILY",
      entityId: familyId,
      projectId: family.projectId,
      summary: `Corrected the record for ${family.headOfHouseholdName} of ${family.village}`,
      reason,
      ip: clientIp(request),
      loadBefore: async () => before,
      loadAfter: async () => {
        const updated = await getFamilyById(familyId);
        return updated ? snapshot(updated) : null;
      },
    },
    () => updateFamily(familyId, update)
  );

  return NextResponse.json({ ok: true });
}
