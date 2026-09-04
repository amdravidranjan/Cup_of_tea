import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RatePrediction } from "@/lib/ai/land-rate";

function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function LandRatePredictionCard({ prediction }: { prediction: RatePrediction }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">AI Land Rate Prediction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {formatINR(prediction.predictedRatePerHectare)}{" "}
            <span className="text-sm font-normal text-muted-foreground">/ hectare</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Likely range {formatINR(prediction.low)} – {formatINR(prediction.high)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{prediction.basisLabel}</p>
        <div className="space-y-1.5 border-t pt-2">
          {prediction.factors.map((f) => (
            <div key={f.label} className="flex items-start justify-between gap-3 text-xs">
              <div>
                <p className="font-medium text-foreground">{f.label}</p>
                <p className="text-muted-foreground">{f.detail}</p>
              </div>
              {f.adjustmentPercent !== 0 && (
                <span
                  className={`shrink-0 font-semibold ${f.adjustmentPercent > 0 ? "text-orange-600" : "text-emerald-600"}`}
                >
                  {f.adjustmentPercent > 0 ? "+" : ""}
                  {f.adjustmentPercent}%
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
