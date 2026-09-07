import { eq } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { downloadProjectThumbnails } from "./project-thumbnails";

async function main() {
  const cvg = "p-tn-cvg-canal";
  const thumbnails = await downloadProjectThumbnails();
  const coverPhotos: Record<string, string> = {
    "p-demo-bridge-1": thumbnails.bridge,
    "p-tn-chennai-salem": thumbnails.expressway,
    "p-tn-chennai-metro": thumbnails.metro,
    "p-tn-cvg-canal": thumbnails.canal,
    "p-tn-ennore-kattupalli": thumbnails.port,
    "p-tn-coimbatore-bypass": thumbnails.expressway,
    "p-tn-sipcot-perambalur": thumbnails.industrial,
    "p-ka-bengaluru-prr": thumbnails.expressway,
    "p-tn-madurai-metro": thumbnails.metro,
    "p-tn-trichy-airport": thumbnails.airport,
    "p-tn-tuticorin-rail": thumbnails.rail,
    "p-tn-salem-steel": thumbnails.industrial,
    "p-tn-vellore-water": thumbnails.water,
    "p-tn-thanjavur-solar": thumbnails.solar,
    "p-tn-kanchipuram-it": thumbnails.industrial,
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
