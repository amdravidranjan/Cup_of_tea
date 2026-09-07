import { eq } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";

// Neutral placeholder photos (picsum.photos, seeded so they're stable and
// deterministic) standing in for real site-survey/drone photography until
// real photos are uploaded. Swap these for actual project photos before
// any real deployment or demo that claims to show real sites.
async function main() {
  const cvg = "p-tn-cvg-canal";
  const coverPhotos: Record<string, string> = {
    "p-demo-bridge-1": "/project-thumbnails/bridge.svg",
    "p-tn-chennai-salem": "/project-thumbnails/expressway.svg",
    "p-tn-chennai-metro": "/project-thumbnails/metro.svg",
    "p-tn-cvg-canal": "/project-thumbnails/canal.svg",
    "p-tn-ennore-kattupalli": "/project-thumbnails/port.svg",
    "p-tn-coimbatore-bypass": "/project-thumbnails/expressway.svg",
    "p-tn-sipcot-perambalur": "/project-thumbnails/industrial.svg",
    "p-ka-bengaluru-prr": "/project-thumbnails/expressway.svg",
    "p-tn-madurai-metro": "/project-thumbnails/metro.svg",
    "p-tn-trichy-airport": "/project-thumbnails/airport.svg",
    "p-tn-tuticorin-rail": "/project-thumbnails/rail.svg",
    "p-tn-salem-steel": "/project-thumbnails/industrial.svg",
    "p-tn-vellore-water": "/project-thumbnails/water.svg",
    "p-tn-thanjavur-solar": "/project-thumbnails/solar.svg",
    "p-tn-kanchipuram-it": "/project-thumbnails/industrial.svg",
  };

  for (const [projectId, coverPhotoUrl] of Object.entries(coverPhotos)) {
    await db
      .update(schema.projects)
      .set({ coverPhotoUrl })
      .where(eq(schema.projects.id, projectId));
  }

  const cvgParcels = await db.select().from(schema.parcels).where(eq(schema.parcels.projectId, cvg));
  for (const [i, p] of cvgParcels.slice(0, 6).entries()) {
    await db
      .update(schema.parcels)
      .set({ sitePhotoUrl: `https://picsum.photos/seed/parcel-${p.id.slice(0, 6)}-${i}/600/450` })
      .where(eq(schema.parcels.id, p.id));
  }

  const cvgInfra = await db
    .select()
    .from(schema.infrastructureItems)
    .where(eq(schema.infrastructureItems.projectId, cvg));
  for (const item of cvgInfra.filter((i) => i.status === "COMPLETE")) {
    await db
      .update(schema.infrastructureItems)
      .set({ completionPhotoUrl: `https://picsum.photos/seed/infra-${item.id.slice(0, 6)}/600/450` })
      .where(eq(schema.infrastructureItems.id, item.id));
  }

  console.log("Placeholder site photos added (swap for real photos before any real deployment).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
