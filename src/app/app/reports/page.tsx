import { getSession } from "@/lib/auth";
import { getProjectReportRows } from "@/db/reports";
import { ReportBuilder } from "@/components/report-builder";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) return null;

  const filter = session.role === "state" ? { state: session.state } : undefined;
  const rows = await getProjectReportRows(filter);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          MIS Report Builder
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Cross-Project Comparison &amp; Export
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the fields you need, compare every project side by side, and export to CSV.
        </p>
      </div>
      <ReportBuilder
        rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
      />
    </div>
  );
}
