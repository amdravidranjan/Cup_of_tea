/**
 * Checks the walkthrough's translations against the step list.
 *
 * Catches the three things that break a language quietly: a missing file, a
 * step with no text (the bubble would fall back to English mid-tour), and a
 * placeholder that was dropped or mistyped in translation, which would leave
 * the sentence talking about nowhere in particular.
 *
 *   npx tsx scripts/check-tour-i18n.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TOUR_LANGUAGES } from "../src/lib/tour/languages";
import { TOUR_STEPS } from "../src/lib/tour/steps";

const DIR = join(process.cwd(), "public", "tour", "i18n");
const reference = JSON.parse(readFileSync(join(DIR, "en.json"), "utf8")) as {
  ui: Record<string, string>;
  steps: Record<string, string>;
};

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

let problems = 0;
for (const lang of TOUR_LANGUAGES) {
  const path = join(DIR, `${lang.code}.json`);
  if (!existsSync(path)) {
    console.log(`${lang.code.padEnd(4)} MISSING ${lang.english}`);
    problems++;
    continue;
  }

  const texts = JSON.parse(readFileSync(path, "utf8")) as typeof reference;
  const issues: string[] = [];

  for (const step of TOUR_STEPS) {
    const text = texts.steps?.[step.id];
    if (!text) {
      issues.push(`no text for step "${step.id}"`);
      continue;
    }
    const want = placeholders(reference.steps[step.id] ?? "");
    const got = placeholders(text);
    if (want.join(",") !== got.join(",")) {
      issues.push(`step "${step.id}" placeholders {${got}} ≠ {${want}}`);
    }
  }

  for (const key of Object.keys(reference.ui)) {
    if (!texts.ui?.[key]) issues.push(`no ui.${key}`);
  }

  if (issues.length === 0) {
    console.log(`${lang.code.padEnd(4)} ok      ${lang.english}`);
  } else {
    problems += issues.length;
    console.log(`${lang.code.padEnd(4)} ${String(issues.length).padStart(2)} issue(s) ${lang.english}`);
    for (const issue of issues) console.log(`      - ${issue}`);
  }
}

console.log(problems === 0 ? "\nAll languages complete." : `\n${problems} problem(s).`);
process.exit(problems === 0 ? 0 : 1);
