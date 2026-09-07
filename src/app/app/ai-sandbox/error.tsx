"use client";

/**
 * The sandbox's own error boundary.
 *
 * Lane E's rule is that nothing may show a raw error, and the page whose whole
 * purpose is demonstrating that inputs cannot break the analytics is the last
 * place that may contradict it. Every module underneath already refuses to
 * throw, so if this ever renders, the fault is in the page shell rather than in
 * a formula — which is what the wording says, because a message that blames
 * the visitor's input for a bug in the page sends them hunting in the wrong
 * place.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-prose space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-heading text-base font-semibold text-amber-900">
        The sandbox could not be loaded
      </h2>
      <p className="text-sm text-amber-900">
        This is a fault in the page itself, not in anything you entered — the scoring and
        extraction modules cannot fail on input. Nothing was saved and no record was changed.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
        <a
          href="/app"
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
