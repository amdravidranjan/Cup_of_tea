import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { awardTender, getTenderById, createContractor, getContractorById } from "@/db/tenders";
import { getProject } from "@/db/projects";
import { canViewProject } from "@/lib/project-scope";
import { withAudit } from "@/db/audit";
import { clientIp } from "@/lib/request-context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "tender:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const tender = await getTenderById(id);
  if (!tender) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await getProject(tender.projectId);
  if (!project || !canViewProject(session, project)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    contractorId?: string;
    newContractorName?: string;
    newContractorRegistration?: string;
    awardedValue?: number;
  };
  if (typeof body.awardedValue !== "number" || body.awardedValue <= 0) {
    return NextResponse.json({ error: "Awarded value must be a positive number" }, { status: 400 });
  }
  let contractorId = body.contractorId;
  if (!contractorId && body.newContractorName && body.newContractorRegistration) {
    contractorId = await createContractor({
      name: body.newContractorName,
      registrationNumber: body.newContractorRegistration,
    });
  }
  if (!contractorId) {
    return NextResponse.json({ error: "A contractor must be selected or created" }, { status: 400 });
  }
  const contractor = await getContractorById(contractorId);
  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }
  const awardedValue = body.awardedValue;
  const winner = contractorId;
  await withAudit(
    {
      actor: { userId: session.userId, role: session.role },
      action: "APPROVE",
      entityType: "TENDER",
      entityId: id,
      projectId: tender.projectId,
      summary: `Awarded tender "${tender.title}" to ${contractor.name} at ${awardedValue}`,
      ip: clientIp(request),
      loadBefore: async () => ({
        status: tender.status,
        contractorId: tender.contractorId ?? null,
        awardedValue: tender.awardedValue ?? null,
      }),
      loadAfter: async () => {
        const updated = await getTenderById(id);
        return {
          status: updated?.status ?? null,
          contractorId: updated?.contractorId ?? winner,
          awardedValue: updated?.awardedValue ?? awardedValue,
        };
      },
    },
    () => awardTender(id, { contractorId: winner, awardedValue })
  );
  return NextResponse.json({ ok: true });
}
