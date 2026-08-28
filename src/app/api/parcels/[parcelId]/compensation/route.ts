import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getParcel } from "@/db/parcels";
import { getProject, getStageHistory } from "@/db/projects";
import { getCurrentCompensationRate, createCompensation } from "@/db/compensation";
import { calculateCompensation, resolveCompensationDates } from "@/lib/compensation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ parcelId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "compensation:assess")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { parcelId } = await params;
  const body = (await request.json()) as { projectId?: string; assetsValue?: number };
  if (!body.projectId || typeof body.assetsValue !== "number") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const parcel = await getParcel(parcelId);
  if (!parcel || parcel.projectId !== body.projectId) {
    return NextResponse.json({ error: "Parcel not found for this project" }, { status: 404 });
  }
  const project = await getProject(body.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const history = await getStageHistory(body.projectId);
  const dates = resolveCompensationDates(history);
  if (!dates) {
    return NextResponse.json(
      { error: "Project has not reached the AWARDED stage yet" },
      { status: 400 }
    );
  }

  const rate = await getCurrentCompensationRate(project.state, project.district);
  if (!rate) {
    return NextResponse.json(
      { error: "No compensation rate set for this district" },
      { status: 400 }
    );
  }

  const breakdown = calculateCompensation({
    areaHectares: parcel.areaHectares,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue: body.assetsValue,
    sIANotificationDate: dates.sIANotificationDate,
    awardDate: dates.awardDate,
  });

  const id = await createCompensation({
    parcelId,
    projectId: body.projectId,
    ratePerHectare: rate.ratePerHectare,
    multiplier: rate.multiplier,
    assetsValue: body.assetsValue,
    marketValue: breakdown.marketValue,
    multipliedMarketValue: breakdown.multipliedMarketValue,
    solatium: breakdown.solatium,
    interest: breakdown.interest,
    total: breakdown.total,
    assessedBy: session.userId,
  });
  return NextResponse.json({ id, breakdown }, { status: 201 });
}
