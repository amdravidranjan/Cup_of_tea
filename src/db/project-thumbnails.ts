import { mkdir, access, writeFile } from "node:fs/promises";
import path from "node:path";

const THUMBNAIL_SOURCES: Record<string, string> = {
  bridge: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=82",
  expressway: "https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=1200&q=82",
  metro: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=1200&q=82",
  canal: "https://images.unsplash.com/photo-1533050487297-09b450131914?auto=format&fit=crop&w=1200&q=82",
  port: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=82",
  industrial: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=1200&q=82",
  airport: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=82",
  rail: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=82",
  water: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=1200&q=82",
  solar: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=82",
};

const thumbnailDir = path.join(process.cwd(), "public", "project-thumbnails");

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads real project-related photography once during seeding. The app
 * serves the cached local files afterward, so the public UI never depends on
 * Unsplash being reachable.
 */
export async function downloadProjectThumbnails(): Promise<Record<string, string>> {
  await mkdir(thumbnailDir, { recursive: true });
  const localPaths: Record<string, string> = {};

  for (const [kind, sourceUrl] of Object.entries(THUMBNAIL_SOURCES)) {
    const fileName = `${kind}.jpg`;
    const filePath = path.join(thumbnailDir, fileName);
    if (!(await fileExists(filePath))) {
      const response = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "NILAMS demo seed/1.0" },
      });
      if (!response.ok) {
        throw new Error(`Could not download ${kind} thumbnail: HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`Could not download ${kind} thumbnail: response was not an image`);
      }
      await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
      console.log(`  downloaded ${fileName}`);
    } else {
      console.log(`  using cached ${fileName}`);
    }
    localPaths[kind] = `/project-thumbnails/${fileName}`;
  }

  return localPaths;
}
