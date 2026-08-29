import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProject, getStageHistory } from "@/db/projects";
import { getAvailableActions, STAGES, type Stage } from "@/lib/workflow";
import { ProjectActions } from "@/components/project-actions";
import { listDocuments } from "@/db/documents";
import { can } from "@/lib/rbac";
import { DocumentUpload } from "@/components/document-upload";
import { listParcels } from "@/db/parcels";
import {
  parseStoredGeometry,
  computeParcelsWithImpact,
  IMPACT_BUFFER_METERS,
} from "@/lib/geo";
import { ProjectMap } from "@/components/project-map";
import { getCurrentCompensationRate, listCompensationsForProject } from "@/db/compensation";
import { resolveCompensationDates } from "@/lib/compensation";
import { CompensationPanel } from "@/components/compensation-panel";
import { getRRStage, getRRHistory } from "@/db/rr";
import { getAvailableRRActions } from "@/lib/rr-workflow";
import { RRPanel } from "@/components/rr-panel";
import { listFamiliesForProject } from "@/db/families";
import { FamiliesPanel } from "@/components/families-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stageTone, toneBadgeClass } from "@/lib/status-colors";

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
  const currentIndex = STAGES.indexOf(currentStage);
  const docs = await listDocuments(id);
  const canUpload = can(session.role, "document:upload");
  const alignment = parseStoredGeometry(project.geometryType, project.geometryGeoJson);
  const parcelList = await listParcels(id);
  const parcelsWithImpact = computeParcelsWithImpact(alignment, parcelList);

  const compensationRate = await getCurrentCompensationRate(project.state, project.district);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="text-sm text-muted-foreground">{project.purpose}</p>
        <p className="text-sm text-muted-foreground">
          {project.district}, {project.state}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap gap-2">
            {STAGES.map((stage, i) => (
              <li key={stage}>
                <Badge
                  variant="outline"
                  className={
                    i === currentIndex
                      ? toneBadgeClass(stageTone(stage))
                      : i < currentIndex
                        ? "border-muted-foreground/20 bg-muted text-muted-foreground"
                        : "border-dashed text-muted-foreground/60"
                  }
                >
                  {stage}
                </Badge>
              </li>
            ))}
          </ol>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {history.map((h) => (
              <li key={h.id}>
                {h.fromStage ?? "—"} → {h.toStage} ({h.action}) by {h.actorRole} on{" "}
                {h.createdAt.toLocaleString()}
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
                      {d.uploadedBy} on {d.uploadedAt.toLocaleString()}
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
