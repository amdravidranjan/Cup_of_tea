import { eq } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";

// Neutral placeholder photos (picsum.photos, seeded so they're stable and
// deterministic) standing in for real site-survey/drone photography until
// real photos are uploaded. Swap these for actual project photos before
// any real deployment or demo that claims to show real sites.
async function main() {
  const cvg = "p-tn-cvg-canal";
  const bridge = "p-demo-bridge-1";
  const metro = "p-tn-chennai-metro";

  await db
    .update(schema.projects)
    .set({ coverPhotoUrl: "https://picsum.photos/seed/cvg-canal-site/1200/500" })
    .where(eq(schema.projects.id, cvg));
  await db
    .update(schema.projects)
    .set({ coverPhotoUrl: "https://picsum.photos/seed/koraput-bridge-site/1200/500" })
    .where(eq(schema.projects.id, bridge));
  await db
    .update(schema.projects)
    .set({ coverPhotoUrl: "https://picsum.photos/seed/chennai-metro-site/1200/500" })
    .where(eq(schema.projects.id, metro));

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
