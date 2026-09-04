function Endpoint({
  method,
  path,
  description,
  responseShape,
}: {
  method: string;
  path: string;
  description: string;
  responseShape: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-secondary-foreground">
          {method}
        </span>
        <code className="font-mono text-sm">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">
        <code>{responseShape}</code>
      </pre>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Open Data
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Developer API</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only, unauthenticated JSON endpoints for the public transparency data — the same
          data the public portal itself shows, for anyone building on top of it: researchers,
          students, journalists, or another government system. No API key, no rate-limit
          registration required for this demo. Nothing here ever includes family names,
          grievance details, or any other personal data — that stays internal, same as the public
          portal.
        </p>
      </div>

      <Endpoint
        method="GET"
        path="/api/public/projects"
        description="Every notified project, with its stage, area, villages, and compensation totals."
        responseShape={`{ "projects": [ { "id", "name", "purpose", "state",\n    "district", "stage", "areaHectares", "villageCount",\n    "compensationPaid", "compensationTotal" }, ... ] }`}
      />
      <Endpoint
        method="GET"
        path="/api/public/projects/{id}"
        description="Full public detail for one project: stage history, SLA status, parcel-status breakdown, notices."
        responseShape={`{ "project": {...}, "slaMetrics": [...],\n  "parcelStatusCounts": {...}, "notices": [...] }`}
      />
      <Endpoint
        method="GET"
        path="/api/public/stats"
        description="Portfolio-wide aggregate stats plus the most recent public notices across every project."
        responseShape={`{ "stats": { "projectCount", "totalAreaHectares",\n    "compensationPaid", "compensationTotal", "slaCounts" },\n  "notices": [...] }`}
      />

      <div className="rounded-lg border bg-secondary/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">A note on scope</p>
        <p className="mt-1">
          This is a read-only data API for public transparency data. It intentionally does not
          expose anything from the internal side of the system (compensation records for
          individual families, grievance contents, documents, legal case files) — for that, a
          government body would need to request access through the internal interoperability
          layer, not this open endpoint.
        </p>
      </div>
    </div>
  );
}
