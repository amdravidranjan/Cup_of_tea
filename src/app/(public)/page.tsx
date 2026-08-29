import Link from "next/link";
import {
  listPublicProjects,
  getPublicPortfolioStats,
  listPublicNotices,
} from "@/db/public";
import { DashboardStats } from "@/components/dashboard-stats";
import { PublicProjectSearch } from "@/components/public-project-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent notices</CardTitle>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notices yet.</p>
            ) : (
              <ul className="space-y-3">
                {notices.map((n) => (
                  <li key={n.id} className="text-sm">
                    <Link href={`/projects/${n.projectId}`} className="font-medium hover:underline">
                      {n.projectName}
                    </Link>
                    <p className="text-muted-foreground">
                      {n.label} — {n.occurredAt.toLocaleDateString()}
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
