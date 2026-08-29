import { notFound } from "next/navigation";
import { getPublicProjectDetail } from "@/db/public";
import { ProjectMap } from "@/components/project-map";
import { StageTracker } from "@/components/stage-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toneBadgeClass, slaStatusTone } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";

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
