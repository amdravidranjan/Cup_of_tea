/**
 * Builds a demo acquisition for any region.
 *
 * `flagship-project.ts` lays out the Tamil Nadu case by hand, because the
 * pitch deck, the video and the shipped demo-kit files are all cut from those
 * exact plots. Every other region is generated instead, from three numbers in
 * `REGIONS`: where the crossing is, which way the river runs, and how wide it
 * is there.
 *
 * The layout follows the flagship's shape — a corridor square to the flow,
 * two ranks of plots either side of it, nothing taken between the abutments —
 * but works in a frame rotated to the river rather than in latitude, so a
 * river running east-west lays out as sensibly as one running north-south.
 *
 * Everything it produces is fiction: survey numbers, titleholders, patta
 * numbers and extents. Only the river and the crossing are real.
 */

import type { LandClassification } from "@/lib/land-records";
import type { DemoRegion } from "@/lib/demo/regions";
import type { FlagshipParcel, FlagshipHolder, SurveyedFamily } from "./flagship-project";

const METRES_PER_DEG_LAT = 110574;
const metresPerDegLon = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

/** A seed that differs per region, so two regions never lay out identically. */
function regionSeed(region: DemoRegion, salt: number): number {
  let h = salt;
  for (const ch of region.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h >>> 0;
}

/**
 * The local frame: `along` runs with the river, `cross` runs with the
 * corridor. Both in metres from the crossing.
 */
function frame(region: DemoRegion) {
  const { lon, lat, bearing } = region.crossing;
  const rad = (bearing * Math.PI) / 180;
  // Unit vectors in metres, as east/north components.
  const along = { e: Math.sin(rad), n: Math.cos(rad) };
  const cross = { e: Math.sin(rad + Math.PI / 2), n: Math.cos(rad + Math.PI / 2) };
  const mLon = metresPerDegLon(lat);

  return {
    toLonLat(a: number, c: number): [number, number] {
      const east = a * along.e + c * cross.e;
      const north = a * along.n + c * cross.n;
      return [round6(lon + east / mLon), round6(lat + north / METRES_PER_DEG_LAT)];
    },
  };
}

/** The river's approximate centreline through the crossing. */
export function regionCentreline(region: DemoRegion): [number, number][] {
  const f = frame(region);
  const rng = mulberry32(regionSeed(region, 0x51a3));
  const points: [number, number][] = [];
  // A river does not run dead straight; wander it a little, but keep the
  // wander small enough that the crossing stays square to the flow.
  for (let a = -1800; a <= 1800; a += 450) {
    const wander = (rng() - 0.5) * 70 + Math.sin(a / 900) * 45;
    points.push(f.toLonLat(a, wander));
  }
  return points;
}

/** The acquisition corridor: approach road, bridge, approach road. */
export function regionAlignment(region: DemoRegion): [number, number][] {
  const f = frame(region);
  const half = 800 + region.crossing.widthM / 2;
  const points: [number, number][] = [];
  for (let c = half; c >= -half; c -= half / 3) points.push(f.toLonLat(0, c));
  return points;
}

/** Where the deck starts and ends — the abutments, on each bank. */
export function regionSpan(region: DemoRegion): { north: [number, number]; south: [number, number] } {
  const f = frame(region);
  const reach = region.crossing.widthM / 2 + 30;
  return { north: f.toLonLat(0, reach), south: f.toLonLat(0, -reach) };
}

/** Distance from a point in the local frame to the river, in metres. */
function distanceToRiver(region: DemoRegion, along: number, cross: number): number {
  // In the local frame the river is the `cross ≈ wander` line, so the
  // perpendicular distance is dominated by the cross offset.
  const wander = Math.sin(along / 900) * 45;
  return Math.abs(cross - wander);
}

export function buildRegionParcels(region: DemoRegion): FlagshipParcel[] {
  const f = frame(region);
  const rng = mulberry32(regionSeed(region, 0x5127a9));
  const parcels: FlagshipParcel[] = [];

  const half = 800 + region.crossing.widthM / 2;
  // No land is taken between the abutments, and a plot must clear the bank
  // rather than merely its centre point, or the acquisition buys riverbed.
  const clear = region.crossing.widthM / 2 + 75;

  const stations: number[] = [];
  for (let c = half; c > -half; c -= 122) {
    if (Math.abs(c) < clear) continue;
    stations.push(c);
  }

  let fieldNumber = 108;
  for (const [index, station] of stations.entries()) {
    const bank: "north" | "south" = station > 0 ? "north" : "south";
    const candidates = region.villages.filter((v) => v.bank === bank);
    const village = candidates[index % candidates.length] ?? region.villages[0];

    for (const side of [-1, 1] as const) {
      for (let rank = 0; rank < 2; rank++) {
        // A first-rank plot fronts the road; a second-rank plot sits behind it
        // and is only partly taken, which is why extents differ so much.
        const innerM = 12 + rank * 46 + rng() * 6;
        const outerM = innerM + 28 + rng() * 24;
        const halfDepthM = 26 + rng() * 16;

        const a0 = side * innerM;
        const a1 = side * outerM;
        const c0 = station - halfDepthM;
        const c1 = station + halfDepthM;

        const corners: [number, number][] = [
          [Math.min(a0, a1), c0],
          [Math.max(a0, a1), c0],
          [Math.max(a0, a1), c1],
          [Math.min(a0, a1), c1],
        ];
        if (corners.some(([a, c]) => distanceToRiver(region, a, c) <= region.crossing.widthM / 2)) {
          continue;
        }

        const widthM = Math.abs(outerM - innerM);
        const extent = round4((widthM * halfDepthM * 2) / 10000);

        const subdivision = side < 0 ? "A" : "B";
        const surveyNumber = rank === 0
          ? `${fieldNumber}/${subdivision}`
          : `${fieldNumber}/${subdivision}${rank + 1}`;

        // Wet land sits nearer the river; dry land on the higher ground.
        const toBank = Math.abs(station) - region.crossing.widthM / 2;
        const landClassification: LandClassification =
          toBank < 190 ? "NANJAI" : rank === 0 && rng() > 0.72 ? "HOUSE_SITE" : "PUNJAI";

        parcels.push({
          surveyNumber,
          village: village.name,
          extent,
          landClassification,
          boundary: corners.map(([a, c]) => f.toLonLat(a, c)) as [number, number][],
          adjoining: [],
        });
      }
    }
    fieldNumber++;
  }

  // Neighbours, now that every plot exists: an FMB sheet identifies a plot by
  // what it touches as much as by its corners.
  for (const [i, parcel] of parcels.entries()) {
    const neighbours = new Set<string>();
    for (const other of parcels) {
      if (other === parcel) continue;
      if (other.village !== parcel.village) continue;
      if (touches(parcel, other)) neighbours.add(other.surveyNumber);
    }
    parcel.adjoining = [...neighbours].slice(0, 4);
    if (parcel.adjoining.length === 0 && parcels[i + 1]) {
      parcel.adjoining = [parcels[i + 1].surveyNumber];
    }
  }

  return parcels;
}

function touches(a: FlagshipParcel, b: FlagshipParcel): boolean {
  const box = (p: FlagshipParcel) => {
    const lons = p.boundary.map(([lon]) => lon);
    const lats = p.boundary.map(([, lat]) => lat);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  };
  const [aMinX, aMinY, aMaxX, aMaxY] = box(a);
  const [bMinX, bMinY, bMaxX, bMaxY] = box(b);
  const pad = 0.00025;
  return aMinX - pad <= bMaxX && aMaxX + pad >= bMinX && aMinY - pad <= bMaxY && aMaxY + pad >= bMinY;
}

export function buildRegionHolders(region: DemoRegion, parcels: FlagshipParcel[]): FlagshipHolder[] {
  const rng = mulberry32(regionSeed(region, 0x9f2b71));
  return parcels.map((parcel, index) => {
    const given = region.given[index % region.given.length];
    const initial = region.initials[(index * 7) % region.initials.length];
    // House sites are where people actually live, so those are the households
    // the project displaces rather than merely deprives of land.
    const displaced = parcel.landClassification === "HOUSE_SITE";

    return {
      pattaNumber: String(1200 + index * 3 + (index % 5)),
      surveyNumber: parcel.surveyNumber,
      name: `${initial}. ${given}`,
      village: parcel.village,
      extent: parcel.extent,
      category: "landowner" as const,
      memberCount: 2 + Math.floor(rng() * 6),
      vulnerable: rng() > 0.72,
      aadhaarMasked: `XXXX-XXXX-${1000 + Math.floor(rng() * 8999)}`,
      rationCard: `${region.rationPrefix}${400000 + index * 137}`,
      phone: `9${String(400000000 + index * 7919 + Math.floor(rng() * 900)).padStart(9, "0")}`,
      displaced,
    };
  });
}

export function buildRegionSurveyedFamilies(
  region: DemoRegion,
  parcels: FlagshipParcel[]
): SurveyedFamily[] {
  const rng = mulberry32(regionSeed(region, 0x31d70c));
  const families: SurveyedFamily[] = [];

  for (const [index, parcel] of parcels.entries()) {
    // Wet land is labour-intensive, so it carries dependent households; dry
    // land far less often.
    const chance =
      parcel.landClassification === "NANJAI" ? 0.62 : parcel.landClassification === "HOUSE_SITE" ? 0.5 : 0.18;
    if (rng() > chance) continue;

    const given = region.given[(index * 11 + 5) % region.given.length];
    const initial = region.initials[(index * 5 + 3) % region.initials.length];
    const isResident = parcel.landClassification === "HOUSE_SITE";

    families.push({
      name: `${initial}. ${given}`,
      village: parcel.village,
      surveyNumber: parcel.surveyNumber,
      category: isResident ? "tenant" : "livelihood-loser",
      entitlementBasis: isResident ? "S3C_VI_URBAN_RESIDENT" : "S3C_II_LIVELIHOOD",
      memberCount: 2 + Math.floor(rng() * 5),
      vulnerable: rng() > 0.55,
      phone: `9${String(500000000 + index * 6301 + Math.floor(rng() * 900)).padStart(9, "0")}`,
      displaced: isResident,
      dependency: isResident
        ? "Resident on the plot for more than three years without title"
        : rng() > 0.5
          ? "Tenant cultivator, two crops a year"
          : "Agricultural labourer dependent on this holding",
    });
  }

  return families;
}
