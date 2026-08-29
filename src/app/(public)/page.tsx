import Link from "next/link";
import {
  listPublicProjects,
  getPublicPortfolioStats,
  listPublicNotices,
} from "@/db/public";
import { DashboardStats } from "@/components/dashboard-stats";
import { PublicProjectSearch } from "@/components/public-project-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function PublicLandingPage() {
  const [projects, stats, notices] = await Promise.all([
    listPublicProjects(),
    getPublicPortfolioStats(),
    listPublicNotices(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notified projects yet.</p>
          ) : (
            <PublicProjectSearch projects={projects} />
          )}
        </div>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent notices</CardTitle>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notices yet.</p>
            ) : (
              <ul className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {notices.map((n) => (
                  <li key={n.id} className="border-b pb-3 text-sm last:border-b-0 last:pb-0">
                    <Link href={`/projects/${n.projectId}`} className="font-medium hover:underline">
                      {n.projectName}
                    </Link>
                    <p className="text-muted-foreground">
                      {n.label} — {formatDate(n.occurredAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
