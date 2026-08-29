import { Badge } from "@/components/ui/badge";
import { STAGES, type Stage } from "@/lib/workflow";
import { stageTone, toneBadgeClass } from "@/lib/status-colors";

export function StageTracker({ currentStage }: { currentStage: Stage }) {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STAGES.map((stage, i) => (
        <li key={stage}>
          {i === currentIndex ? (
            <Badge
              variant="outline"
              className={`${toneBadgeClass(stageTone(stage))} font-heading ring-2 ring-brand ring-offset-2 ring-offset-background tracking-wide`}
            >
              {stage}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={
                i < currentIndex
                  ? "border-muted-foreground/20 bg-muted text-muted-foreground"
                  : "border-dashed text-muted-foreground/60"
              }
            >
              {i < currentIndex ? "✓ " : ""}
              {stage}
            </Badge>
          )}
        </li>
      ))}
    </ol>
  );
}
