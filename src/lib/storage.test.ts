import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { saveFile, readStoredFile } from "./storage";

let testRoot: string | undefined;

afterEach(async () => {
  if (testRoot) {
    await rm(testRoot, { recursive: true, force: true });
    testRoot = undefined;
  }
});

describe("storage", () => {
  it("saves a file and reads it back with matching content and size", async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "la-storage-"));
    const content = Buffer.from("hello world");
    const { storagePath, sizeBytes } = await saveFile(content, {
      projectId: "p-1",
      category: "DPR",
      fileName: "report.pdf",
      root: testRoot,
    });
    expect(sizeBytes).toBe(content.byteLength);
    const readBack = await readStoredFile(storagePath, testRoot);
    expect(readBack.toString()).toBe("hello world");
  });

  it("sanitizes unsafe characters so no path traversal is possible", async () => {
    testRoot = await mkdtemp(path.join(tmpdir(), "la-storage-"));
    const { storagePath } = await saveFile(Buffer.from("x"), {
      projectId: "p-1",
      category: "DPR",
      fileName: "../../etc/passwd",
      root: testRoot,
    });
    expect(storagePath).not.toContain("..");
    expect(storagePath.startsWith(path.join("p-1", "DPR"))).toBe(true);
  });
});
