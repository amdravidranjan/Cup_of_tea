/**
 * Prints what each region's demo project generates: plot counts, the size of
 * the kit sheet, and how far the layout drifts from the crossing. Run it after
 * touching `region-project.ts` — a region that lays out badly shows up as a
 * plot count near zero or a drift far larger than the others.
 *
 *   npx tsx scripts/check-regions.ts
 */

import { REGIONS } from "../src/lib/demo/regions";
import { demoProject } from "../src/db/demo-project";
import { kitCounts } from "../src/lib/demo/kit";

for (const region of REGIONS) {
  const demo = demoProject(region);
  const counts = kitCounts(region);
  const lons = demo.parcels.flatMap((p) => p.boundary.map(([lon]) => lon));
  const lats = demo.parcels.flatMap((p) => p.boundary.map(([, lat]) => lat));
  const drift = Math.max(
    Math.abs(Math.max(...lons) - region.crossing.lon),
    Math.abs(Math.max(...lats) - region.crossing.lat)
  );

  console.log(
    region.id.padEnd(6),
    String(demo.parcels.length).padStart(3) + " plots",
    String(counts.plots).padStart(3) + " in kit",
    String(demo.holders.length).padStart(3) + " owners",
    String(demo.families.length).padStart(3) + " surveyed",
    demo.totals.totalHectares.toFixed(2).padStart(7) + " ha",
    "drift " + drift.toFixed(3)
  );
}
