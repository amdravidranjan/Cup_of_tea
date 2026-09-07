/**
 * The shape of "show me the arithmetic".
 *
 * NOVELTY.md stakes the project's defensibility on the analytics being a
 * spreadsheet you could hand to an auditor rather than a model you have to
 * trust. That claim only holds if the arithmetic is actually on screen, so
 * every scoring and prediction module in this folder returns one of these
 * alongside its answer: the formula as written, the numbers substituted into
 * it, and the result of that line.
 *
 * A judge who changes an input and watches one substitution line change has
 * verified the claim themselves. That is a stronger demo than any accuracy
 * figure we could quote, and it is the only kind of accuracy figure we would
 * be entitled to quote.
 */

export interface FormulaStep {
  /** What this line is computing, in the user's words. */
  label: string;
  /** The formula in symbols, e.g. `open ÷ total × 20`. */
  formula: string;
  /** The same formula with the actual numbers in, e.g. `7 ÷ 12 × 20`. */
  substitution: string;
  /** The line's result, already rounded the way the module rounds it. */
  result: string;
  /** Where the rule comes from — an Act section, or the weight table. */
  basis?: string;
}

export interface FormulaTrace {
  title: string;
  /** One line per contributing term, in the order they are applied. */
  steps: FormulaStep[];
  /** The final line: what all the steps add up to. */
  totalLabel: string;
  total: string;
  /** A sentence naming what kind of computation this is. */
  method: string;
  /** Statutory or policy anchor for the whole computation, when there is one. */
  basis?: string;
}

/**
 * A trace as plain text, for the copy-to-clipboard button and for pasting into
 * a file note. An officer defending a number in front of the LARR Authority
 * needs it in a form they can attach to a reply, not a screenshot.
 */
export function renderTraceText(trace: FormulaTrace): string {
  const lines: string[] = [trace.title, "=".repeat(trace.title.length), ""];
  lines.push(`Method: ${trace.method}`);
  if (trace.basis) lines.push(`Basis:  ${trace.basis}`);
  lines.push("");
  for (const step of trace.steps) {
    lines.push(`${step.label}`);
    lines.push(`  formula      ${step.formula}`);
    lines.push(`  substituted  ${step.substitution}`);
    lines.push(`  result       ${step.result}`);
    if (step.basis) lines.push(`  basis        ${step.basis}`);
    lines.push("");
  }
  lines.push(`${trace.totalLabel}: ${trace.total}`);
  lines.push("");
  lines.push(
    "Computed by a fixed formula, not a trained model. The same inputs always produce the same result."
  );
  return lines.join("\n");
}

/** Convenience for building a step where the formula and result are numbers. */
export function step(
  label: string,
  formula: string,
  substitution: string,
  result: string,
  basis?: string
): FormulaStep {
  return { label, formula, substitution, result, basis };
}
