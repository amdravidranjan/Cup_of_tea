import { db } from "./client";
import { users, projects, stageHistory } from "./schema";
import { DEMO_USERS } from "./seed-data";
import { saveFile } from "@/lib/storage";
import { createDocument } from "./documents";
import { setProjectGeometry } from "./projects";
import { createParcel } from "./parcels";
import type { PolygonGeometry } from "@/lib/geo";
import type { ParcelStatus } from "@/lib/parcel-status";

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

  await setProjectGeometry(projectId, {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.716, 18.816],
    ],
  });

  const demoParcels: Array<{
    village: string;
    areaHectares: number;
    status: ParcelStatus;
    geometry: PolygonGeometry;
  }> = [
    {
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [82.7115, 18.8125],
            [82.7115, 18.8135],
            [82.7125, 18.8135],
            [82.7125, 18.8125],
            [82.7115, 18.8125],
          ],
        ],
      },
    },
    {
      village: "Kotpad",
      areaHectares: 0.8,
      status: "ACQUIRED",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [82.7135, 18.8145],
            [82.7135, 18.8155],
            [82.7145, 18.8155],
            [82.7145, 18.8145],
            [82.7135, 18.8145],
          ],
        ],
      },
    },
    {
      village: "Boriguma",
      areaHectares: 2.1,
      status: "NOTIFIED",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [82.76, 18.83],
            [82.76, 18.831],
            [82.761, 18.831],
            [82.761, 18.83],
            [82.76, 18.83],
          ],
        ],
      },
    },
  ];
  for (const p of demoParcels) {
    await createParcel({ projectId, ...p });
  }

  console.log("Seed complete: 5 demo users, 1 demo project.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
