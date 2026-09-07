import { spawn } from "node:child_process";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

function runDrizzlePush(): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npx";
    const args =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "npx drizzle-kit push"]
        : ["drizzle-kit", "push"];
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`drizzle-kit push failed${signal ? ` with ${signal}` : ` with exit code ${code}`}`));
    });
  });
}

async function main() {
  await runDrizzlePush();
  await db.delete(schema.auditLog);
  console.log("Audit trail reset after schema push.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
