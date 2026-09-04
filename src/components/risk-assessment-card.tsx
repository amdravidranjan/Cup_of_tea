import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskGauge } from "@/components/risk-gauge";
import type { RiskAssessment } from "@/lib/ai/risk-score";

const BAND_STYLES: Record<RiskAssessment["band"], { badge: string }> = {
  Low: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  Moderate: { badge: "bg-amber-100 text-amber-800 border-amber-200" },
  High: { badge: "bg-orange-100 text-orange-800 border-orange-200" },
  Critical: { badge: "bg-red-100 text-red-800 border-red-200" },
};

export function RiskAssessmentCard({ assessment }: { assessment: RiskAssessment }) {
  const style = BAND_STYLES[assessment.band];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">AI Risk Assessment</CardTitle>
        <Badge variant="outline" className={style.badge}>
          {assessment.band} risk
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
          <RiskGauge score={assessment.score} />
          <p className="text-sm text-muted-foreground">{assessment.summary}</p>
        </div>

        <div className="space-y-2 border-t pt-3">
          {assessment.factors.map((f) => (
            <div key={f.label} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.detail}</p>
              </div>
              <span
                className={`shrink-0 font-mono text-xs font-semibold ${f.points >= 0 ? "text-orange-600" : "text-emerald-600"}`}
              >
                {f.points >= 0 ? "+" : ""}
                {f.points}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/70">
          Computed from this project&apos;s current grievances, SLA status, land possession and
          litigation data.
        </p>
      </CardContent>
    </Card>
  );
}
