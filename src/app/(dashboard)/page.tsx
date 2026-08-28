import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listProjects } from "@/db/projects";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stageTone, toneBadgeClass } from "@/lib/status-colors";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const projects = await listProjects();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Projects</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>District, State</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.district}, {p.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={toneBadgeClass(stageTone(p.stage))}>
                      {p.stage}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
