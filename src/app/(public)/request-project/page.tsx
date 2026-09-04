import { RequestProjectForm } from "@/components/request-project-form";

export default function RequestProjectPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Public Portal
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Request a Project</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If your area needs infrastructure that would require acquiring land — a road, a bridge,
          a public facility — you can request that it be taken up for consideration. A district or
          state officer will review your request.
        </p>
      </div>
      <RequestProjectForm />
    </div>
  );
}
