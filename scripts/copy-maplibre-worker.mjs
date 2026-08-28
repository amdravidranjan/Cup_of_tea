// maplibre-gl's worker file imports a sibling module ("./maplibre-gl-shared.mjs")
// via a plain relative ESM import. Bundler asset-URL copying (webpack's
// `new URL(..., import.meta.url)`) only copies the worker file itself, not
// that sibling, so the browser 404s resolving the relative import against
// the copied file's hashed URL. Fix: copy both files together into public/
// at a stable path and point setWorkerUrl there directly, bypassing the
// bundler's asset pipeline entirely. Runs on every `npm install` via the
// postinstall script so every teammate gets this without a manual step.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = path.join("node_modules", "maplibre-gl", "dist");
const DEST_DIR = path.join("public", "maplibre-gl");
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

async function main() {
  await mkdir(DEST_DIR, { recursive: true });
  for (const file of FILES) {
    await copyFile(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }
  console.log(`Copied ${FILES.join(", ")} to ${DEST_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
