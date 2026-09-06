import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getParcel, updateParcel, type UpdateParcelInput } from "@/db/parcels";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";
import { isNoOpChange } from "@/lib/audit";
import { PARCEL_STATUSES, type ParcelStatus } from "@/lib/parcel-status";
import { LAND_CLASSIFICATIONS } from "@/lib/land-records";

/** The snapshot the audit trail diffs against — the correctable fields only. */
function snapshot(parcel: NonNullable<Awaited<ReturnType<typeof getParcel>>>) {
  return {
    village: parcel.village,
    surveyNumber: parcel.surveyNumber ?? null,
    pattaNumber: parcel.pattaNumber ?? null,
    areaHectares: parcel.areaHectares,
    landClassification: parcel.landClassification ?? null,
    status: parcel.status,
  };
}

/**
 * Corrects a parcel already on the register.
 *
 * A written reason is mandatory. Extent and survey number are what an award
 * is computed from and what a titleholder is matched against, so a silent
 * edit to either is indistinguishable from a fabrication — the reason is the
 * difference between a correction and an unexplained change.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ parcelId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "record:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { parcelId } = await params;
  const parcel = await getParcel(parcelId);
  if (!parcel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(parcel.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as UpdateParcelInput & { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required to change a record already on the file" },
      { status: 400 }
    );
  }

  if (body.areaHectares !== undefined && (!(body.areaHectares > 0) || !Number.isFinite(body.areaHectares))) {
    return NextResponse.json({ error: "Extent must be a positive number of hectares" }, { status: 400 });
  }
  if (body.village !== undefined && !body.village.trim()) {
    return NextResponse.json({ error: "Village cannot be blank" }, { status: 400 });
  }
  if (body.status !== undefined && !PARCEL_STATUSES.includes(body.status as ParcelStatus)) {
    return NextResponse.json({ error: "Invalid parcel status" }, { status: 400 });
  }
  if (
    body.landClassification !== undefined &&
    body.landClassification !== null &&
    !LAND_CLASSIFICATIONS.includes(body.landClassification as (typeof LAND_CLASSIFICATIONS)[number])
  ) {
    return NextResponse.json({ error: "Invalid land classification" }, { status: 400 });
  }

  const update: UpdateParcelInput = {
    village: body.village?.trim(),
    surveyNumber: body.surveyNumber === undefined ? undefined : body.surveyNumber?.trim() || null,
    pattaNumber: body.pattaNumber === undefined ? undefined : body.pattaNumber?.trim() || null,
    areaHectares: body.areaHectares,
    landClassification: body.landClassification,
    status: body.status,
  };

  const before = snapshot(parcel);
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
      entityType: "PARCEL",
      entityId: parcelId,
      projectId: parcel.projectId,
      summary: `Corrected parcel ${parcel.surveyNumber ?? parcel.id} in ${parcel.village}`,
      reason,
      ip: clientIp(request),
      loadBefore: async () => before,
      loadAfter: async () => {
        const updated = await getParcel(parcelId);
        return updated ? snapshot(updated) : null;
      },
    },
    () => updateParcel(parcelId, update)
  );

  return NextResponse.json({ ok: true });
}
