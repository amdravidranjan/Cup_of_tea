/**
 * Skeleton for the sandbox.
 *
 * The page awaits the project list, so there is a real gap to fill. Blocks
 * rather than a spinner: a spinner tells someone to wait, a skeleton tells
 * them what they are waiting for.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the analytics sandbox">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-6 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-prose animate-pulse rounded bg-muted" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-14 animate-pulse rounded bg-muted/60" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
