import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ROOT = path.join(process.cwd(), "uploads");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.\.+/g, "_");
}

export interface SavedFile {
  storagePath: string;
  sizeBytes: number;
}

export async function saveFile(
  buffer: Buffer,
  opts: { projectId: string; category: string; fileName: string; root?: string }
): Promise<SavedFile> {
  const root = opts.root ?? DEFAULT_ROOT;
  const dir = path.join(root, opts.projectId, opts.category);
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${sanitizeFileName(opts.fileName)}`;
  await writeFile(path.join(dir, safeName), buffer);
  const storagePath = path.join(opts.projectId, opts.category, safeName);
  return { storagePath, sizeBytes: buffer.byteLength };
}

export async function readStoredFile(
  storagePath: string,
  root: string = DEFAULT_ROOT
): Promise<Buffer> {
  return readFile(path.join(root, storagePath));
}
