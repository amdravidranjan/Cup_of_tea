import { TrackGrievance } from "@/components/track-grievance";

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Public Portal
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Track a Grievance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the tracking number you received when filing an objection or grievance.
        </p>
      </div>
      <TrackGrievance />
    </div>
  );
}
