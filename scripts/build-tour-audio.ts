/**
 * Renders the walkthrough's narration with edge-tts.
 *
 * The bubble text carries placeholders — {district}, {river}, {plots} — and
 * the guide fills them from the sandbox. Each language maps to exactly one
 * region, so the same values can be baked into the audio: the Kannada clip
 * says Mandya because Kannada always gets Mandya. Fill the text the same way
 * the client does, or the voice and the bubble drift apart.
 *
 * Languages that borrow another language's audio (Punjabi, Odia and Santali,
 * which have no voice at all) are skipped here; the guide plays Hindi for
 * them and says so on screen.
 *
 *   python -m pip install edge-tts
 *   npx tsx scripts/build-tour-audio.ts          # only what is missing
 *   npx tsx scripts/build-tour-audio.ts --force  # re-render everything
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { TOUR_LANGUAGES } from "../src/lib/tour/languages";
import { TOUR_STEPS } from "../src/lib/tour/steps";
import { regionForLang, highCourtFor } from "../src/lib/demo/regions";
import { kitCounts } from "../src/lib/demo/kit";

const run = promisify(execFile);
const force = process.argv.includes("--force");
const only = process.argv.find((a) => a.startsWith("--lang="))?.split("=")[1];

const I18N = join(process.cwd(), "public", "tour", "i18n");
const AUDIO = join(process.cwd(), "public", "tour", "audio");

/** The same substitution the guide makes in the browser. */
function fillFor(code: string, text: string): string {
  const region = regionForLang(code);
  const counts = kitCounts(region);
  const native = code !== "en";
  const vars: Record<string, string> = {
    district: native ? region.districtNative : region.district,
    state: native ? region.stateNative : region.state,
    river: native ? region.riverNative : region.river,
    town: native ? region.townNative : region.town,
    village: native ? region.villages[0].native : region.villages[0].name,
    project: native ? region.projectNameNative : region.projectName,
    court: highCourtFor(region),
    plots: String(counts.plots),
    owners: String(counts.owners),
  };
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

let made = 0;
let skipped = 0;
let failed = 0;

async function main() {
for (const lang of TOUR_LANGUAGES) {
  if (only && lang.code !== only) continue;
  if (lang.audioFrom) {
    console.log(`${lang.code.padEnd(4)} — borrows ${lang.audioFrom} audio, nothing to render`);
    continue;
  }
  if (!lang.voice) continue;

  const path = join(I18N, `${lang.code}.json`);
  if (!existsSync(path)) {
    console.log(`${lang.code.padEnd(4)} — no translation file, skipped`);
    continue;
  }
  const texts = JSON.parse(readFileSync(path, "utf8")) as { steps: Record<string, string> };
  const dir = join(AUDIO, lang.code);
  mkdirSync(dir, { recursive: true });

  for (const step of TOUR_STEPS) {
    const out = join(dir, `${step.id}.mp3`);
    if (!force && existsSync(out) && statSync(out).size > 1000) {
      skipped++;
      continue;
    }
    const text = fillFor(lang.code, texts.steps[step.id] ?? "");
    if (!text.trim()) continue;

    try {
      await run("python", [
        "-m", "edge_tts",
        "--voice", lang.voice,
        // `--rate -4%` would be read as a flag; the equals form is required.
        "--rate=-4%",
        "--text", text,
        "--write-media", out,
      ]);
      made++;
      process.stdout.write(`\r${lang.code.padEnd(4)} ${step.id.padEnd(14)} ${made} rendered  `);
    } catch (error) {
      failed++;
      console.log(`\n${lang.code} ${step.id}: ${(error as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`\r${lang.code.padEnd(4)} done (${lang.voice})${" ".repeat(20)}`);
}

console.log(`\n${made} clips rendered, ${skipped} already present, ${failed} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
