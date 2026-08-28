import { db } from "./client";
import { users, projects, stageHistory } from "./schema";
import { DEMO_USERS } from "./seed-data";
import { saveFile } from "@/lib/storage";
import { createDocument } from "./documents";

async function main() {
  for (const user of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        role: user.role,
        district: user.district ?? null,
        state: user.state ?? null,
      })
      .onConflictDoNothing();
  }

  const now = new Date();
  const projectId = "p-demo-bridge-1";

  await db
    .insert(projects)
    .values({
      id: projectId,
      name: "Koraput River Bridge Project",
      purpose: "Construction of a 2-lane bridge connecting Koraput town to NH-26",
      state: "Odisha",
      district: "Koraput",
      stage: "DRAFT",
      createdBy: "u-agency-1",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db.insert(stageHistory).values({
    id: crypto.randomUUID(),
    projectId,
    fromStage: null,
    toStage: "DRAFT",
    action: "CREATE",
    actorId: "u-agency-1",
    actorRole: "agency",
    createdAt: now,
  });

  const dprContent = Buffer.from(
    "Detailed Project Report (demo)\nKoraput River Bridge Project\nPublic purpose: NH-26 connectivity.\n"
  );
  const { storagePath, sizeBytes } = await saveFile(dprContent, {
    projectId,
    category: "DPR",
    fileName: "koraput-bridge-dpr.txt",
  });
  await createDocument({
    projectId,
    category: "DPR",
    fileName: "koraput-bridge-dpr.txt",
    mimeType: "text/plain",
    sizeBytes,
    storagePath,
    uploadedBy: "u-agency-1",
  });

  console.log("Seed complete: 5 demo users, 1 demo project.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
