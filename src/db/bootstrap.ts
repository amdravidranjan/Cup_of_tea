import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Picks the database URL, and on a serverless host makes one that can be
 * written to.
 *
 * The demo needs a real database: judges upload records, commit them, record a
 * stay order. A hosted bundle is read-only, so the seeded `local.db` that
 * ships with it is copied into the instance's temp directory once, and libsql
 * opens the copy. Writes then last for the life of that instance — enough for
 * a judge's session, and a fresh instance simply starts from the seeded state
 * again, which for a demo is a feature rather than a loss.
 *
 * Set `DATABASE_URL` (plus `DATABASE_AUTH_TOKEN`) to point at a hosted libsql
 * instead, and none of this runs.
 */
export function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL;
  if (configured) return configured;
  if (!process.env.VERCEL) return "file:local.db";

  const target = path.join("/tmp", "nilams", "local.db");
  if (!existsSync(target)) {
    mkdirSync(path.dirname(target), { recursive: true });
    // Next traces this file into the function bundle; see next.config.ts.
    const seeded = path.join(process.cwd(), "local.db");
    if (existsSync(seeded)) copyFileSync(seeded, target);
  }
  return `file:${target}`;
}
