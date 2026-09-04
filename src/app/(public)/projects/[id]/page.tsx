import { notFound } from "next/navigation";
import { getPublicProjectDetail } from "@/db/public";
import { listLegalDisputesForProject } from "@/db/legal-disputes";
import { ProjectMap } from "@/components/project-map";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getElevationProfile } from "@/db/elevation";
import { ElevationProfile } from "@/components/elevation-profile";
import { StageTracker } from "@/components/stage-tracker";
import { FileGrievanceForm } from "@/components/file-grievance-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toneBadgeClass, slaStatusTone, type StatusTone } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";
import type { DisputeStatus } from "@/db/legal-disputes";

const DISPUTE_TONE: Record<DisputeStatus, StatusTone> = {
  FILED: "info",
  HEARING: "pending",
  STAYED: "danger",
  DISPOSED: "success",
};

function formatLakh(amount: number): string {
  return `₹${(amount / 100000).toFixed(1)}L`;
}

export default async function PublicProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPublicProjectDetail(id);
  if (!detail) notFound();

  const { project } = detail;
  const elevationSamples =
    detail.alignment?.type === "LineString" ? await getElevationProfile(project.id) : null;
  const legalDisputes = await listLegalDisputesForProject(project.id);

  return (
    <div className="space-y-6">
      {project.coverPhotoUrl && (
        <div className="relative -mx-6 -mt-6 h-56 overflow-hidden sm:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element -- external, swappable placeholder photo */}
          <img
            src={project.coverPhotoUrl}
            alt=""
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-x-6 bottom-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
              {project.district}, {project.state}
            </p>
            <h2 className="font-heading text-2xl leading-tight font-semibold text-foreground sm:text-3xl">
              {project.name}
            </h2>
          </div>
        </div>
      )}
      <div className={project.coverPhotoUrl ? "hidden" : undefined}>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          {project.district}, {project.state}
        </p>
        <h2 className="font-heading text-2xl font-semibold text-foreground">{project.name}</h2>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{project.purpose}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <StageTracker currentStage={project.stage} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Area</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {detail.totalAreaHectares.toFixed(1)} ha
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Villages</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{detail.villageCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Parcels</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{detail.parcelCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Compensation paid
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatLakh(detail.compensationPaid)} / {formatLakh(detail.compensationTotal)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">SLA health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {project.metrics.filter((m) => m.status !== "not-applicable").length === 0 ? (
            <p className="text-sm text-muted-foreground">No SLA-tracked milestones yet.</p>
          ) : (
            project.metrics
              .filter((m) => m.status !== "not-applicable")
              .map((m) => (
                <Badge key={m.id} variant="outline" className={toneBadgeClass(slaStatusTone(m.status))}>
                  {m.label}: {m.status}
                </Badge>
              ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Map</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectMap alignment={detail.alignment} parcels={detail.parcels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Before / after compare</CardTitle>
        </CardHeader>
        <CardContent>
          <BeforeAfterSlider alignment={detail.alignment} parcels={detail.parcels} />
        </CardContent>
      </Card>

      {elevationSamples && elevationSamples.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Elevation profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ElevationProfile samples={elevationSamples} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">File an objection or grievance</CardTitle>
        </CardHeader>
        <CardContent>
          <FileGrievanceForm projectId={project.id} />
        </CardContent>
      </Card>

      {legalDisputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Legal disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {legalDisputes.map((d) => (
                <li key={d.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{d.caseNumber}</span>
                    <Badge variant="outline" className={toneBadgeClass(DISPUTE_TONE[d.status])}>
                      {d.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {d.title} — {d.court}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Filed {formatDate(d.filedDate)}
                    {d.nextHearingDate ? ` · Next hearing ${formatDate(d.nextHearingDate)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Notices</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.notices.map((n) => (
                <li key={n.id}>
                  <span className="font-medium">{n.label}</span>{" "}
                  <span className="text-muted-foreground">
                    — {formatDate(n.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
