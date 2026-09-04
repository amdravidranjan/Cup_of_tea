import { notFound } from "next/navigation";
import Link from "next/link";
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
import { GeometryEditor } from "@/components/geometry-editor";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getElevationProfile } from "@/db/elevation";
import { ElevationProfile } from "@/components/elevation-profile";
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
import { listLegalDisputesForProject } from "@/db/legal-disputes";
import { LegalDisputesPanel } from "@/components/legal-disputes-panel";
import { listTendersForProject, listContractors } from "@/db/tenders";
import { TendersPanel } from "@/components/tenders-panel";
import { listRehabServicesForProject } from "@/db/rehabilitation";
import { RehabilitationPanel } from "@/components/rehabilitation-panel";
import { assessProjectRisk } from "@/lib/ai/risk-score";
import { RiskAssessmentCard } from "@/components/risk-assessment-card";
import { predictLandRate } from "@/lib/ai/land-rate";
import { LandRatePredictionCard } from "@/components/land-rate-prediction-card";
import { extractDocumentFields } from "@/lib/ai/document-intelligence";
import { DocumentInsights } from "@/components/document-insights";
import { computeSLAMetrics } from "@/lib/sla";
import { listGrievances } from "@/db/grievances";
import { StageHeaderBar, type StageHeaderStep } from "@/components/stage-header-bar";
import { listConsultationsForProject } from "@/db/gram-sabha";
import { GramSabhaPanel } from "@/components/gram-sabha-panel";
import { listNotificationsForProject } from "@/db/notifications-log";
import { NotificationsPanel } from "@/components/notifications-panel";
import { listLandBankForProject } from "@/db/land-bank";
import { LandBankPanel } from "@/components/land-bank-panel";
import { listNoticeDraftsForProject } from "@/db/notice-drafts";
import { NoticeDraftsPanel } from "@/components/notice-drafts-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutGrid,
  IndianRupee,
  HeartHandshake,
  HardHat,
  Scale,
  FileSignature,
  Users2,
  FileStack,
} from "lucide-react";
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
import { Bilingual } from "@/components/bilingual";
import { canViewProject } from "@/lib/project-scope";
import { getUserMap, displayName } from "@/db/users";

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
  if (!canViewProject(session, project)) notFound();

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
  const elevationSamples = alignment?.type === "LineString" ? await getElevationProfile(id) : null;
  const canEditGeometry = can(session.role, "project:geometry:edit");

  const compensationRate = await getCurrentCompensationRate(project.state, project.district);
  const compensationRateHistory = await listCompensationRates(project.state, project.district);
  const compensationList = await listCompensationsForProject(id);
  const compensationDates = resolveCompensationDates(history);
  const canManageRate = can(session.role, "compensation:manage-rate");
  const canAssessCompensation = can(session.role, "compensation:assess");
  const compensationByParcel = new Map(compensationList.map((c) => [c.parcelId, c]));
  // Audit columns store user ids; resolve them once so the UI shows people.
  const userMap = await getUserMap();
  // The award breakdown is passed through in full rather than just the total:
  // the compensation table lets a user open any parcel and see exactly how its
  // figure was arrived at (market value x multiplier, assets, solatium,
  // interest), which is the part that has to be defensible to a landowner.
  const parcelsWithCompensation = parcelsWithImpact.map((p) => {
    const comp = compensationByParcel.get(p.id);
    return {
      id: p.id,
      village: p.village,
      areaHectares: p.areaHectares,
      surveyNumber: p.surveyNumber,
      pattaNumber: p.pattaNumber,
      status: p.status,
      withinImpact: p.withinImpact,
      compensation: comp
        ? {
            id: comp.id,
            total: comp.total,
            status: comp.status,
            ratePerHectare: comp.ratePerHectare,
            multiplier: comp.multiplier,
            marketValue: comp.marketValue,
            multipliedMarketValue: comp.multipliedMarketValue,
            assetsValue: comp.assetsValue,
            solatium: comp.solatium,
            interest: comp.interest,
            assessedBy: displayName(userMap, comp.assessedBy),
            assessedAt: comp.assessedAt,
            paidAt: comp.paidAt,
          }
        : null,
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

  const legalDisputes = await listLegalDisputesForProject(id);
  const canManageLegal = can(session.role, "legal-dispute:manage");

  const [tenderList, contractors] = await Promise.all([
    listTendersForProject(id),
    listContractors(),
  ]);
  const contractorsById = new Map(contractors.map((c) => [c.id, c]));
  const tendersWithContractor = tenderList.map((t) => ({
    ...t,
    contractorName: t.contractorId ? contractorsById.get(t.contractorId)?.name : undefined,
  }));
  const canManageTenders = can(session.role, "tender:manage");

  const consultations = await listConsultationsForProject(id);
  const canManageGramSabha = can(session.role, "gram-sabha:manage");

  const landBankEntries = (await listLandBankForProject(id)).map((e) => ({
    ...e,
    village: parcelsWithImpact.find((p) => p.id === e.parcelId)?.village ?? "Unknown village",
  }));
  const canManageLandBank = can(session.role, "land-bank:manage");

  const rehabServices = showRRPanel ? await listRehabServicesForProject(id) : [];
  const familiesById = new Map(families.map((f) => [f.id, f]));
  const rehabServicesWithFamily = rehabServices.map((s) => ({
    ...s,
    familyName: familiesById.get(s.familyId)?.headOfHouseholdName ?? "Unknown family",
  }));
  const canManageRehab = can(session.role, "rehabilitation:manage");

  const notifications = await listNotificationsForProject(id);
  const notificationsWithFamily = notifications.map((n) => ({
    ...n,
    familyName: familiesById.get(n.familyId)?.headOfHouseholdName ?? "Unknown family",
  }));
  const canSendNotifications = can(session.role, "notification:send");

  const noticeDrafts = await listNoticeDraftsForProject(id);
  const canManageNoticeDrafts = can(session.role, "notice-draft:manage");

  const projectGrievances = await listGrievances({ projectId: id });
  const slaMetrics = computeSLAMetrics({
    stageHistory: history,
    compensations: compensationList,
    rrHistory,
    infrastructureItems,
  });
  const riskAssessment = assessProjectRisk({
    openGrievances: projectGrievances.filter((g) => g.status !== "RESOLVED").length,
    totalGrievances: projectGrievances.length,
    slaBreached: slaMetrics.filter((m) => m.status === "breached").length,
    slaAtRisk: slaMetrics.filter((m) => m.status === "at-risk").length,
    slaOnTrack: slaMetrics.filter((m) => m.status === "on-track").length,
    vulnerableFamilies: families.filter((f) => f.vulnerableGroup).length,
    totalFamilies: families.length,
    parcelsPossessed: parcelsWithImpact.filter((p) => p.status === "POSSESSED").length,
    totalParcels: parcelsWithImpact.length,
    openLegalDisputes: legalDisputes.filter((d) => d.status !== "DISPOSED").length,
    stage: currentStage,
  });

  const landRatePrediction = predictLandRate({
    state: project.state,
    district: project.district,
    currentRatePerHectare: compensationRate?.ratePerHectare ?? null,
    lastSetAt: compensationRateHistory[0]?.createdAt ?? null,
    parcelCount: parcelsWithImpact.length,
  });

  const stageLabel = (s: string) =>
    s
      .split("_")
      .map((w) => (w === "RR" || w === "SIA" ? w : w.charAt(0) + w.slice(1).toLowerCase()))
      .join(" ");
  const reachedAtByStage = new Map<string, string>();
  for (const h of history) {
    if (!reachedAtByStage.has(h.toStage)) {
      reachedAtByStage.set(h.toStage, h.createdAt.toISOString());
    }
  }
  const stageSteps: StageHeaderStep[] = STAGES.map((s) => ({
    key: s,
    label: stageLabel(s),
    reachedAt: reachedAtByStage.get(s) ?? null,
  }));
  const currentStageIndex = STAGES.indexOf(currentStage);

  return (
    <div className="-m-6">
      <StageHeaderBar steps={stageSteps} currentIndex={currentStageIndex} />

      <div className="border-b bg-white px-6 py-5">
        <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          {project.district}, {project.state}
        </p>
        <h2 className="font-heading text-3xl leading-tight font-semibold text-foreground">
          {project.name.split("(")[0].trim()}
        </h2>
        {project.name.includes("(") && (
          <p className="font-heading text-lg text-muted-foreground">
            ({project.name.split("(").slice(1).join("(")}
          </p>
        )}
        <p className="mt-1.5 text-sm text-muted-foreground">{project.purpose}</p>
        <div className="mt-4">
          <ProjectActions projectId={project.id} availableActions={availableActions} />
        </div>
      </div>

      <div className="space-y-6 bg-[#edeef2] px-6 py-6">
        <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutGrid className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="compensation">
            <IndianRupee className="size-3.5" />
            Compensation
          </TabsTrigger>
          <TabsTrigger value="rr">
            <HeartHandshake className="size-3.5" />
            R&amp;R &amp; Families
          </TabsTrigger>
          <TabsTrigger value="infrastructure">
            <HardHat className="size-3.5" />
            Infrastructure
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Scale className="size-3.5" />
            Legal
          </TabsTrigger>
          <TabsTrigger value="tenders">
            <FileSignature className="size-3.5" />
            Tenders
          </TabsTrigger>
          <TabsTrigger value="community">
            <Users2 className="size-3.5" />
            Community
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileStack className="size-3.5" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <RiskAssessmentCard assessment={riskAssessment} />
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Map</Bilingual></CardTitle>
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

          {canEditGeometry && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Edit alignment &amp; parcels</Bilingual></CardTitle>
              </CardHeader>
              <CardContent>
                <GeometryEditor
                  projectId={project.id}
                  alignment={alignment}
                  parcels={parcelsWithImpact.map((p) => ({ village: p.village, geometry: p.geometry }))}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Before / after compare</Bilingual></CardTitle>
            </CardHeader>
            <CardContent>
              <BeforeAfterSlider alignment={alignment} parcels={parcelsWithImpact} />
            </CardContent>
          </Card>

          {alignment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>3D terrain view</Bilingual></CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Real elevation terrain draped with satellite imagery, alignment and parcels
                  shown in 3D.
                </p>
                <Button asChild className="mt-3">
                  <Link href={`/app/projects/${project.id}/3d`}>Open 3D view →</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {elevationSamples && elevationSamples.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Elevation profile</Bilingual></CardTitle>
              </CardHeader>
              <CardContent>
                <ElevationProfile samples={elevationSamples} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>History</Bilingual></CardTitle>
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
        </TabsContent>

        <TabsContent value="compensation" className="space-y-6 pt-4">
          <LandRatePredictionCard prediction={landRatePrediction} />
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Compensation</Bilingual></CardTitle>
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
                  setBy: displayName(userMap, r.setBy),
                  createdAt: r.createdAt,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rr" className="space-y-6 pt-4">
          {showRRPanel ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Rehabilitation &amp; Resettlement
                  </CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Affected Families</Bilingual></CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Rehabilitation Facilitation</Bilingual></CardTitle>
                </CardHeader>
                <CardContent>
                  <RehabilitationPanel
                    projectId={project.id}
                    services={rehabServicesWithFamily}
                    families={families.map((f) => ({
                      id: f.id,
                      headOfHouseholdName: f.headOfHouseholdName,
                    }))}
                    canManage={canManageRehab}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              R&amp;R has not started yet — it begins once the project reaches the RR_IN_PROGRESS
              stage.
            </p>
          )}
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6 pt-4">
          {showInfrastructureChecklist ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
          ) : (
            <p className="text-sm text-muted-foreground">
              The infrastructure checklist is created once the project reaches the POSSESSION
              stage.
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Land Bank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LandBankPanel
                projectId={project.id}
                entries={landBankEntries}
                parcels={parcelsWithImpact.map((p) => ({ id: p.id, village: p.village }))}
                canManage={canManageLandBank}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Legal Disputes</Bilingual></CardTitle>
            </CardHeader>
            <CardContent>
              <LegalDisputesPanel
                projectId={project.id}
                disputes={legalDisputes}
                canManage={canManageLegal}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenders" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Tenders &amp; Contractors</Bilingual></CardTitle>
            </CardHeader>
            <CardContent>
              <TendersPanel
                projectId={project.id}
                tenders={tendersWithContractor}
                contractors={contractors}
                canManage={canManageTenders}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Gram Sabha Consultations</Bilingual></CardTitle>
            </CardHeader>
            <CardContent>
              <GramSabhaPanel
                projectId={project.id}
                consultations={consultations}
                canManage={canManageGramSabha}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Notifications to Affected Families</Bilingual></CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationsPanel
                projectId={project.id}
                notifications={notificationsWithFamily}
                families={families.map((f) => ({ id: f.id, headOfHouseholdName: f.headOfHouseholdName }))}
                canSend={canSendNotifications}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"><Bilingual>Documents</Bilingual></CardTitle>
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
                      <>
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
                        <TableRow key={`${d.id}-insights`}>
                          <TableCell colSpan={4} className="py-1">
                            <DocumentInsights
                              extraction={extractDocumentFields({
                                documentId: d.id,
                                fileName: d.fileName,
                                category: d.category,
                                mimeType: d.mimeType,
                                sizeBytes: d.sizeBytes,
                                projectName: project.name,
                                projectPurpose: project.purpose,
                                state: project.state,
                                district: project.district,
                              })}
                            />
                          </TableCell>
                        </TableRow>
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                AI-Drafted Citizen Notices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NoticeDraftsPanel
                projectId={project.id}
                drafts={noticeDrafts}
                families={families.map((f) => ({ id: f.id, headOfHouseholdName: f.headOfHouseholdName }))}
                canManage={canManageNoticeDrafts}
              />
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
