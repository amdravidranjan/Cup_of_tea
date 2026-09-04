import type { DocumentExtraction } from "@/lib/ai/document-intelligence";

export function DocumentInsights({ extraction }: { extraction: DocumentExtraction }) {
  return (
    <details className="group rounded-md border bg-muted/30 text-xs">
      <summary className="cursor-pointer select-none px-2 py-1 font-medium text-brand">
        AI extraction ({Math.round(extraction.overallConfidence * 100)}% confidence · {extraction.method})
      </summary>
      <div className="space-y-1 border-t px-2 py-2">
        {extraction.fields.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="flex items-center gap-1.5 text-right font-medium text-foreground">
              {f.value}
              <span className="text-[10px] font-normal text-muted-foreground">
                {Math.round(f.confidence * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
