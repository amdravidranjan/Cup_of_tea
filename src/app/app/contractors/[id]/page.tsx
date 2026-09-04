import { notFound } from "next/navigation";
import Link from "next/link";
import { getContractorById, listTendersForContractor } from "@/db/tenders";
import { getProject } from "@/db/projects";
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
import { toneBadgeClass, type StatusTone } from "@/lib/status-colors";
import { formatDate } from "@/lib/format";
import type { TenderStatus } from "@/db/tenders";

const STATUS_TONE: Record<TenderStatus, StatusTone> = {
  PUBLISHED: "info",
  AWARDED: "pending",
  IN_PROGRESS: "pending",
  COMPLETED: "success",
};

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contractor = await getContractorById(id);
  if (!contractor) notFound();

  const tenders = await listTendersForContractor(id);
  const tendersWithProject = await Promise.all(
    tenders.map(async (t) => ({ tender: t, project: await getProject(t.projectId) }))
  );
  const completed = tenders.filter((t) => t.status === "COMPLETED").length;
  const totalAwarded = tenders.reduce((sum, t) => sum + (t.awardedValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Contractor
        </p>
        <h2 className="font-heading text-2xl font-semibold text-foreground">{contractor.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reg. {contractor.registrationNumber}
          {contractor.specialization ? ` · ${contractor.specialization}` : ""}
          {contractor.rating ? ` · Rated ${contractor.rating.toFixed(1)}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tenders won
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{tenders.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{completed}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total awarded value
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalAwarded)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Past &amp; current projects</CardTitle>
        </CardHeader>
        <CardContent>
          {tendersWithProject.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenders awarded to this contractor yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tender</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Awarded value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Awarded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tendersWithProject.map(({ tender, project }) => (
                  <TableRow key={tender.id}>
                    <TableCell>
                      <div className="font-medium">{tender.tenderNumber}</div>
                      <div className="text-xs text-muted-foreground">{tender.title}</div>
                    </TableCell>
                    <TableCell>
                      {project ? (
                        <Link href={`/app/projects/${project.id}`} className="hover:underline">
                          {project.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tender.awardedValue ? formatINR(tender.awardedValue) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={toneBadgeClass(STATUS_TONE[tender.status])}>
                        {tender.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tender.awardedDate ? formatDate(tender.awardedDate) : "—"}
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
