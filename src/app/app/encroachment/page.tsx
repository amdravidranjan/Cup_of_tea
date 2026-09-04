import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listProjects } from "@/db/projects";
import { listParcels } from "@/db/parcels";
import { checkParcelEncroachment } from "@/lib/ai/encroachment";
import { getStageHistory } from "@/db/projects";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function EncroachmentPage() {
  const session = await getSession();
  if (!session) return null;
  if (!can(session.role, "encroachment:review")) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role does not have access to encroachment monitoring.
      </p>
    );
  }

  const projects = await listProjects();
  const flagged: {
    projectId: string;
    projectName: string;
    parcelId: string;
    village: string;
    confidence: number;
    reason: string;
  }[] = [];

  for (const project of projects) {
    const [parcels, history] = await Promise.all([
      listParcels(project.id),
      getStageHistory(project.id),
    ]);
    const possessedEntry = history.find((h) => h.toStage === "POSSESSION");
    for (const parcel of parcels) {
      const check = checkParcelEncroachment({
        parcelId: parcel.id,
        status: parcel.status,
        withinImpact: false,
        possessedAt: possessedEntry?.createdAt ?? null,
      });
      if (check.flagged) {
        flagged.push({
          projectId: project.id,
          projectName: project.name,
          parcelId: parcel.id,
          village: parcel.village,
          confidence: check.confidence,
          reason: check.reason,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          AI Monitoring
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Encroachment Monitoring
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Possessed parcels where the latest satellite imagery comparison shows a change from the
          baseline recorded at possession — flagged for field verification.
        </p>
      </div>
      {flagged.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parcels currently flagged.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Village</TableHead>
              <TableHead>Finding</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flagged.map((f) => (
              <TableRow key={f.parcelId}>
                <TableCell>
                  <Link href={`/app/projects/${f.projectId}`} className="font-medium hover:underline">
                    {f.projectName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{f.village}</TableCell>
                <TableCell className="text-muted-foreground">{f.reason}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
                    {Math.round(f.confidence * 100)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
