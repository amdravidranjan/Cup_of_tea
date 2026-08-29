import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProject, getStageHistory } from "@/db/projects";
import { getAvailableActions, STAGES, type Stage } from "@/lib/workflow";
import { ProjectActions } from "@/components/project-actions";
import { listDocuments } from "@/db/documents";
import { computeDocumentChecklist } from "@/lib/document-requirements";
import type { DocumentCategory } from "@/lib/document-categories";
import { can } from "@/lib/rbac";
import { DocumentUpload } from "@/components/document-upload";
import { GenerateDocument } from "@/components/generate-document";
import { listParcels } from "@/db/parcels";
import {
  parseStoredGeometry,
  computeParcelsWithImpact,
  IMPACT_BUFFER_METERS,
} from "@/lib/geo";
import { ProjectMap } from "@/components/project-map";
import {
  getCurrentCompensationRate,
  listCompensationRates,
  listCompensationsForProject,
} from "@/db/compensation";
import { resolveCompensationDates } from "@/lib/compensation";
import { CompensationPanel } from "@/components/compensation-panel";
import { getRRStage, getRRHistory } from "@/db/rr";
import { getAvailableRRActions } from "@/lib/rr-workflow";
import { RRPanel } from "@/components/rr-panel";
import { listFamiliesForProject } from "@/db/families";
import { FamiliesPanel } from "@/components/families-panel";
import { ensureInfrastructureChecklist, listInfrastructureChecklist } from "@/db/infrastructure";
import { InfrastructureChecklist } from "@/components/infrastructure-checklist";
import { StageTracker } from "@/components/stage-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneBadgeClass } from "@/lib/status-colors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const history = await getStageHistory(id);
  const currentStage = project.stage as Stage;
  const availableActions = getAvailableActions(currentStage, session.role);
  const docs = await listDocuments(id);
  const canUpload = can(session.role, "document:upload");
  const uploadedCategories = new Set(docs.map((d) => d.category as DocumentCategory));
  const documentChecklist = computeDocumentChecklist(currentStage, uploadedCategories, STAGES);
  const alignment = parseStoredGeometry(project.geometryType, project.geometryGeoJson);
  const parcelList = await listParcels(id);
  const parcelsWithImpact = computeParcelsWithImpact(alignment, parcelList);

  const compensationRate = await getCurrentCompensationRate(project.state, project.district);
  const compensationRateHistory = await listCompensationRates(project.state, project.district);
  const compensationList = await listCompensationsForProject(id);
  const compensationDates = resolveCompensationDates(history);
  const canManageRate = can(session.role, "compensation:manage-rate");
  const canAssessCompensation = can(session.role, "compensation:assess");
  const compensationByParcel = new Map(compensationList.map((c) => [c.parcelId, c]));
  const parcelsWithCompensation = parcelsWithImpact.map((p) => {
    const comp = compensationByParcel.get(p.id);
    return {
      id: p.id,
      village: p.village,
      areaHectares: p.areaHectares,
      compensation: comp ? { id: comp.id, total: comp.total, status: comp.status } : null,
    };
  });

  const showRRPanel = STAGES.indexOf(currentStage) >= STAGES.indexOf("RR_IN_PROGRESS");
  const rrStage = showRRPanel ? await getRRStage(id) : null;
  const rrHistory = showRRPanel ? await getRRHistory(id) : [];
  const rrAvailableActions = showRRPanel ? getAvailableRRActions(rrStage, session.role) : [];
  const families = showRRPanel ? await listFamiliesForProject(id) : [];
  const canManageFamilies = can(session.role, "family:manage");
  const canGrantEntitlements = can(session.role, "entitlement:grant");

  const showInfrastructureChecklist = STAGES.indexOf(currentStage) >= STAGES.indexOf("POSSESSION");
  if (showInfrastructureChecklist) await ensureInfrastructureChecklist(id);
  const infrastructureItems = showInfrastructureChecklist
    ? await listInfrastructureChecklist(id)
    : [];
  const canManageInfrastructure = can(session.role, "infrastructure:manage");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          {project.district}, {project.state}
        </p>
        <h2 className="font-heading text-2xl font-semibold text-foreground">{project.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{project.purpose}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <StageTracker currentStage={currentStage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectActions projectId={project.id} availableActions={availableActions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Map</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectMap alignment={alignment} parcels={parcelsWithImpact} />
          <p className="mt-2 text-xs text-muted-foreground">
            {parcelsWithImpact.filter((p) => p.withinImpact).length} of{" "}
            {parcelsWithImpact.length} parcels within the {IMPACT_BUFFER_METERS}m impact
            buffer of the project alignment.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Compensation</CardTitle>
        </CardHeader>
        <CardContent>
          <CompensationPanel
            projectId={project.id}
            canManageRate={canManageRate}
            canAssess={canAssessCompensation}
            datesResolved={compensationDates !== null}
            currentRate={
              compensationRate
                ? {
                    ratePerHectare: compensationRate.ratePerHectare,
                    multiplier: compensationRate.multiplier,
                  }
                : null
            }
            parcels={parcelsWithCompensation}
            rateHistory={compensationRateHistory.map((r) => ({
              id: r.id,
              ratePerHectare: r.ratePerHectare,
              multiplier: r.multiplier,
              setBy: r.setBy,
              createdAt: r.createdAt,
            }))}
          />
        </CardContent>
      </Card>

      {showRRPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rehabilitation &amp; Resettlement</CardTitle>
          </CardHeader>
          <CardContent>
            <RRPanel
              projectId={project.id}
              stage={rrStage}
              history={rrHistory}
              availableActions={rrAvailableActions}
            />
          </CardContent>
        </Card>
      )}

      {showRRPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Affected Families</CardTitle>
          </CardHeader>
          <CardContent>
            <FamiliesPanel
              projectId={project.id}
              families={families}
              canManage={canManageFamilies}
              canGrant={canGrantEntitlements}
            />
          </CardContent>
        </Card>
      )}

      {showInfrastructureChecklist && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Resettlement Colony Infrastructure (Third Schedule)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfrastructureChecklist
              items={infrastructureItems}
              canManage={canManageInfrastructure}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {history.map((h) => (
              <li key={h.id}>
                {h.fromStage ?? "—"} → {h.toStage} ({h.action}) by {h.actorRole} on{" "}
                {formatDateTime(h.createdAt)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentChecklist.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {documentChecklist.map((req) => (
                <Badge
                  key={req.category}
                  variant="outline"
                  className={toneBadgeClass(req.satisfied ? "success" : "danger")}
                >
                  {req.category} {req.satisfied ? "uploaded" : "missing"}
                </Badge>
              ))}
            </div>
          )}
          {canUpload && <GenerateDocument projectId={project.id} currentStage={currentStage} />}
          {canUpload ? (
            <DocumentUpload projectId={project.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Your role cannot upload documents.
            </p>
          )}
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground/70">No documents uploaded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <a
                        href={`/api/documents/${d.id}/download`}
                        className="font-medium hover:underline"
                      >
                        {d.fileName}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.category} v{d.version}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(d.sizeBytes / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.uploadedBy} on {formatDateTime(d.uploadedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
