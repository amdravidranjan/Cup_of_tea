/**
 * Timing marks for the demo recording.
 *
 * Cutting a narrated video against `setTimeout` guesses drifts: a page that
 * takes three seconds to hydrate on one run takes eight on another, and by the
 * end the voice is describing the screen before last. So the app says, out
 * loud on the console, exactly when each thing actually happened — when a page
 * finished loading, when the guide's click landed, when the step it was
 * waiting for completed — and the recorder cuts against those.
 *
 * The format is one line, easy to parse from Playwright's console events:
 *
 *   [nilams] 1758663012345 page:ready /app/projects/p-demo-1234 (+812ms)
 *
 * The first number is epoch milliseconds, which is comparable across
 * navigations; the bracketed delta is time since this page started, which is
 * what you want when reading the log by eye. Left in the production build on
 * purpose: it is diagnostic, carries no data about the visitor, and is the
 * only reason the video's subtitles line up.
 */

const started = typeof performance !== "undefined" ? performance.now() : 0;

export type MarkKind =
  | "page:ready"
  | "step:shown"
  | "step:target"
  | "step:action"
  | "step:done"
  | "tour:language"
  | "tour:finished";

export function mark(kind: MarkKind, detail = ""): number {
  const now = Date.now();
  if (typeof console !== "undefined") {
    const since = typeof performance !== "undefined" ? Math.round(performance.now() - started) : 0;
    console.info(`[nilams] ${now} ${kind} ${detail} (+${since}ms)`);
  }
  return now;
}
