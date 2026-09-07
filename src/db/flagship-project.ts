/**
 * The flagship demo project — one acquisition carried end to end, with a
 * paper trail that is internally consistent because every document is
 * generated from the data in this file.
 *
 * ── Siting ────────────────────────────────────────────────────────────────
 * A bridge belongs over a river, so this one is placed on a real crossing.
 * Sirumugai is a panchayat town in Mettupalayam taluk, Coimbatore district,
 * on the banks of the Bhavani River; the Bhavani rises in the Nilgiris,
 * passes Mettupalayam, and runs east towards Bhavanisagar and its confluence
 * with the Kaveri. The corridor here crosses that river between the two
 * banks, on the road that would carry Sirumugai's traffic towards the
 * Sathyamangalam side.
 *
 * The town's coordinates are as published (11.322250 N, 77.008861 E). The
 * river centreline and the plot boundaries below are **approximate** — laid
 * out to be geographically coherent with that crossing rather than digitised
 * from a survey. They are demo data and must never be treated as a cadastral
 * record.
 *
 * ── Fiction ───────────────────────────────────────────────────────────────
 * The district, taluk, town and river are real so the project sits somewhere
 * defensible on a map. The revenue villages, survey numbers, titleholders,
 * patta numbers and every rupee figure are invented. No part of this
 * describes a real acquisition, a real landholding or a real person.
 */

import type { LandClassification } from "@/lib/land-records";

/** Sirumugai town, as published. The crossing is anchored to it. */
export const SIRUMUGAI = { lon: 77.008861, lat: 11.32225 } as const;

/**
 * The Bhavani's approximate centreline through the crossing, west to east.
 *
 * The river trends east-north-east here, coming down from Mettupalayam and
 * heading towards the Bhavanisagar reach. The bridge therefore runs roughly
 * north-north-west to south-south-east, square to the flow — which is how a
 * crossing is actually set out, to keep the span short and the piers aligned
 * with the current rather than broadside to it.
 */
export const BHAVANI_CENTRELINE: [number, number][] = [
  [76.99110, 11.31610],
  [76.99580, 11.31780],
  [77.00050, 11.31950],
  [77.00480, 11.32090],
  [77.00886, 11.32190],
  [77.01290, 11.32300],
  [77.01720, 11.32440],
  [77.02180, 11.32600],
  [77.02610, 11.32760],
];

/** Bank-to-bank width of the river at the crossing, in metres. */
export const RIVER_WIDTH_M = 210;

/**
 * The acquisition corridor: approach road, bridge, approach road.
 *
 * Runs NNW to SSE across the Bhavani, centred on the crossing just east of
 * Sirumugai. Roughly 1.6 km end to end — the bridge itself is a fraction of
 * that, and the approach embankments either side are what actually take the
 * land, which is the usual shape of a river-crossing acquisition.
 */
export const ALIGNMENT: [number, number][] = [
  [77.00700, 11.33150],
  [77.00760, 11.32860],
  [77.00820, 11.32570],
  [77.00886, 11.32190],
  [77.00950, 11.31810],
  [77.01010, 11.31520],
  [77.01070, 11.31240],
];

/** Where the deck starts and ends — the abutments, on each bank. */
export const BRIDGE_SPAN: { north: [number, number]; south: [number, number] } = {
  north: [77.00830, 11.32320],
  south: [77.00940, 11.32060],
};

export interface FlagshipVillage {
  name: string;
  /** Which bank it lies on. Drives which side of the river its plots sit. */
  bank: "north" | "south";
  /** Revenue-village code, in the shape a TN village code takes. */
  code: string;
}

/** Fictional revenue villages, placed within the real Mettupalayam taluk. */
export const VILLAGES: FlagshipVillage[] = [
  { name: "Kizhakku Sirumugai", bank: "north", code: "CBE-MTP-041" },
  { name: "Alangombu", bank: "south", code: "CBE-MTP-042" },
  { name: "Thenkarai Pudur", bank: "south", code: "CBE-MTP-043" },
];

export interface FlagshipParcel {
  surveyNumber: string;
  village: string;
  /** Hectares, as the FMB sheet states them. */
  extent: number;
  landClassification: LandClassification;
  /** Corner points, longitude then latitude, walking the boundary. */
  boundary: [number, number][];
  adjoining: string[];
}

export interface FlagshipHolder {
  pattaNumber: string;
  surveyNumber: string;
  name: string;
  village: string;
  extent: number;
  category: "landowner" | "livelihood-loser" | "tenant";
  memberCount: number;
  vulnerable: boolean;
  /** Already masked — a full Aadhaar is never carried in demo data either. */
  aadhaarMasked: string;
  rationCard: string;
  phone: string;
  /** Set where the household is displaced, not merely losing land. */
  displaced: boolean;
}

/* ── Deterministic layout ─────────────────────────────────────────────── */

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

const METRES_PER_DEG_LAT = 110574;
const metresPerDegLon = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

/**
 * Lays out the plots the corridor passes through.
 *
 * Plots are ranged in two files either side of the centreline, the way
 * holdings actually sit along a road: a strip fronting the alignment, then a
 * second rank behind it. Plots that fall in the river itself are skipped —
 * nobody holds a patta on the riverbed, and a demo that acquired water would
 * be the first thing a judge noticed.
 */
export function buildParcels(): FlagshipParcel[] {
  const rng = mulberry32(0x5127a9);
  const parcels: FlagshipParcel[] = [];

  // Along-corridor stations, skipping the water between the abutments.
  const northEnd = ALIGNMENT[0][1];
  const southEnd = ALIGNMENT[ALIGNMENT.length - 1][1];
  const riverNorth = BRIDGE_SPAN.north[1];
  const riverSouth = BRIDGE_SPAN.south[1];

  // Half the tallest plot, in degrees of latitude. A station must clear the
  // bank by at least this much or the plot drawn around it reaches into the
  // water, and the acquisition would be buying riverbed.
  const maxHalfHeightDeg = 42 / METRES_PER_DEG_LAT;

  const stations: number[] = [];
  for (let lat = northEnd; lat > southEnd; lat -= 0.0011) {
    // The deck spans the water; no land is taken between the abutments.
    if (lat + maxHalfHeightDeg > riverSouth && lat - maxHalfHeightDeg < riverNorth) continue;
    stations.push(lat);
  }

  let fieldNumber = 108;
  for (const [index, lat] of stations.entries()) {
    const bank: "north" | "south" = lat > riverNorth ? "north" : "south";
    const candidates = VILLAGES.filter((v) => v.bank === bank);
    const village = candidates[index % candidates.length];

    // Centre of the corridor at this latitude, interpolated along the line.
    const centreLon = lonAtLat(lat);

    for (const side of [-1, 1] as const) {
      for (let rank = 0; rank < 2; rank++) {
        // A first-rank plot fronts the road; a second-rank plot sits behind
        // it and is only partly taken, which is why extents differ so much.
        const innerM = 12 + rank * 46 + rng() * 6;
        const outerM = innerM + 28 + rng() * 24;
        const halfHeightM = 26 + rng() * 16;

        const mLon = metresPerDegLon(lat);
        const x0 = centreLon + (side * innerM) / mLon;
        const x1 = centreLon + (side * outerM) / mLon;
        const y0 = lat - halfHeightM / METRES_PER_DEG_LAT;
        const y1 = lat + halfHeightM / METRES_PER_DEG_LAT;

        const boundary: [number, number][] = [
          [round6(Math.min(x0, x1)), round6(y0)],
          [round6(Math.max(x0, x1)), round6(y0)],
          [round6(Math.max(x0, x1)), round6(y1)],
          [round6(Math.min(x0, x1)), round6(y1)],
        ];

        // The station check above is only a coarse guard. The river bends
        // across the corridor, so reject the actual footprint if any corner
        // reaches the water corridor.
        if (boundary.some(([lon, pointLat]) => distanceToRiverMeters(lon, pointLat) <= RIVER_WIDTH_M / 2)) {
          continue;
        }

        const widthM = Math.abs(outerM - innerM);
        const extent = round4((widthM * halfHeightM * 2) / 10000);

        const subdivision = side < 0 ? "A" : "B";
        const surveyNumber = rank === 0
          ? `${fieldNumber}/${subdivision}`
          : `${fieldNumber}/${subdivision}${rank + 1}`;

        // Wet land sits nearer the river; dry land on the higher ground.
        const distanceToRiver = Math.abs(lat - (bank === "north" ? riverNorth : riverSouth));
        const landClassification: LandClassification =
          distanceToRiver < 0.0016 ? "NANJAI" : rank === 0 && rng() > 0.72 ? "HOUSE_SITE" : "PUNJAI";

        parcels.push({
          surveyNumber,
          village: village.name,
          extent,
          landClassification,
          boundary,
          adjoining: [],
        });
      }
    }
    fieldNumber++;
  }

  // Neighbours, now that every plot exists. An FMB sheet identifies a plot
  // by what it touches as much as by its corners.
  for (const [i, parcel] of parcels.entries()) {
    const neighbours = new Set<string>();
    for (const other of parcels) {
      if (other === parcel) continue;
      if (other.village !== parcel.village) continue;
      if (touches(parcel, other)) neighbours.add(other.surveyNumber);
    }
    // Keep the list short, as a real sheet does — the abutting plots, not
    // everything in the village.
    parcel.adjoining = [...neighbours].slice(0, 4);
    if (parcel.adjoining.length === 0 && parcels[i + 1]) {
      parcel.adjoining = [parcels[i + 1].surveyNumber];
    }
  }

  return parcels;
}

function distanceToRiverMeters(lon: number, lat: number): number {
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < BHAVANI_CENTRELINE.length - 1; i++) {
    const [x1, y1] = BHAVANI_CENTRELINE[i];
    const [x2, y2] = BHAVANI_CENTRELINE[i + 1];
    const scaleX = metresPerDegLon(lat);
    const x = lon * scaleX;
    const y = lat * METRES_PER_DEG_LAT;
    const ax = x1 * scaleX;
    const ay = y1 * METRES_PER_DEG_LAT;
    const bx = x2 * scaleX;
    const by = y2 * METRES_PER_DEG_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
    const distance = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    closest = Math.min(closest, distance);
  }
  return closest;
}

function touches(a: FlagshipParcel, b: FlagshipParcel): boolean {
  const [aMinX, aMinY] = a.boundary[0];
  const [aMaxX, aMaxY] = a.boundary[2];
  const [bMinX, bMinY] = b.boundary[0];
  const [bMaxX, bMaxY] = b.boundary[2];
  const pad = 0.00025;
  return (
    aMinX - pad <= bMaxX && aMaxX + pad >= bMinX && aMinY - pad <= bMaxY && aMaxY + pad >= bMinY
  );
}

/** Longitude of the alignment centreline at a given latitude. */
export function lonAtLat(lat: number): number {
  for (let i = 0; i < ALIGNMENT.length - 1; i++) {
    const [x1, y1] = ALIGNMENT[i];
    const [x2, y2] = ALIGNMENT[i + 1];
    if ((lat <= y1 && lat >= y2) || (lat >= y1 && lat <= y2)) {
      const t = (lat - y1) / (y2 - y1);
      return x1 + t * (x2 - x1);
    }
  }
  return ALIGNMENT[0][0];
}

const GIVEN = [
  "Murugan", "Lakshmi", "Ramasamy", "Kaliyammal", "Selvaraj", "Meenakshi",
  "Palanisamy", "Ponnammal", "Duraisamy", "Saroja", "Kandasamy", "Vasanthi",
  "Chinnadurai", "Amirtham", "Ganesan", "Rajeswari", "Subramani", "Thulasi",
  "Perumal", "Valliammai", "Marimuthu", "Chellammal", "Natarajan", "Pushpa",
  "Sundaram", "Kamatchi", "Velusamy", "Andal", "Arumugam", "Sivagami",
];
const INITIALS = ["R", "K", "M", "S", "P", "V", "N", "T", "C", "A", "G", "D"];

/** The titleholders, one per plot, as a chitta would list them. */
export function buildHolders(parcels: FlagshipParcel[]): FlagshipHolder[] {
  const rng = mulberry32(0x9f2b71);
  return parcels.map((parcel, index) => {
    const given = GIVEN[index % GIVEN.length];
    const initial = INITIALS[(index * 7) % INITIALS.length];
    // House sites are where people actually live, so those are the
    // households the project displaces rather than merely deprives of land.
    const displaced = parcel.landClassification === "HOUSE_SITE";

    return {
      pattaNumber: String(1200 + index * 3 + (index % 5)),
      surveyNumber: parcel.surveyNumber,
      name: `${initial}. ${given}`,
      village: parcel.village,
      extent: parcel.extent,
      // Everyone in this list holds a patta. Tenants, labourers and
      // artisans are affected families too, but a record of rights cannot
      // find them - only the SIA census can, which is what
      // `buildSurveyedFamilies` below represents.
      category: "landowner",
      memberCount: 2 + Math.floor(rng() * 6),
      vulnerable: rng() > 0.72,
      aadhaarMasked: `XXXX-XXXX-${1000 + Math.floor(rng() * 8999)}`,
      rationCard: `TN${400000 + index * 137}`,
      // Distinct, and each a valid Indian mobile number.
      phone: `9${String(400000000 + index * 7919 + Math.floor(rng() * 900)).padStart(9, "0")}`,
      displaced,
    };
  });
}

/** A household found by the SIA census rather than by any land record. */
export interface SurveyedFamily {
  name: string;
  village: string;
  /** The plot they live or work on. They hold no patta over it. */
  surveyNumber: string;
  category: "livelihood-loser" | "tenant";
  /** The limb of s.3(c) that makes them an affected family. */
  entitlementBasis: "S3C_II_LIVELIHOOD" | "S3C_VI_URBAN_RESIDENT";
  memberCount: number;
  vulnerable: boolean;
  phone: string;
  displaced: boolean;
  /** What they do on the land — the fact the entitlement rests on. */
  dependency: string;
}

/**
 * Non-titleholder affected families.
 *
 * These are the people the patta extract cannot produce: tenant cultivators,
 * agricultural labourers dependent on the acquired land, and families living
 * on plots they do not own. Under s.3(c)(ii)-(vi) they are affected families
 * with entitlements of their own, and the only way they enter the record is
 * a physical census. Roughly a third again on top of the titleholders, which
 * is the sort of ratio a real SIA turns up in irrigated farmland.
 */
export function buildSurveyedFamilies(parcels: FlagshipParcel[]): SurveyedFamily[] {
  const rng = mulberry32(0x31d70c);
  const families: SurveyedFamily[] = [];

  for (const [index, parcel] of parcels.entries()) {
    // Wet land is labour-intensive, so it carries dependent households;
    // dry land far less often.
    const chance = parcel.landClassification === "NANJAI" ? 0.62 : parcel.landClassification === "HOUSE_SITE" ? 0.5 : 0.18;
    if (rng() > chance) continue;

    const given = GIVEN[(index * 11 + 5) % GIVEN.length];
    const initial = INITIALS[(index * 5 + 3) % INITIALS.length];
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
          ? "Tenant cultivator, paddy, two crops a year"
          : "Agricultural labourer dependent on this holding",
    });
  }

  return families;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/** Headline figures, computed rather than asserted, for the project record. */
export function flagshipTotals(
  parcels: FlagshipParcel[],
  holders: FlagshipHolder[],
  surveyed: SurveyedFamily[] = []
) {
  return {
    parcelCount: parcels.length,
    totalHectares: round4(parcels.reduce((sum, p) => sum + p.extent, 0)),
    titleholderCount: holders.length,
    surveyedCount: surveyed.length,
    // The Act's "affected families" figure is both groups together. Reporting
    // only titleholders is the mistake that leaves tenants out of R&R.
    affectedFamilyCount: holders.length + surveyed.length,
    displacedCount:
      holders.filter((h) => h.displaced).length + surveyed.filter((f) => f.displaced).length,
    villages: [...new Set(parcels.map((p) => p.village))],
  };
}

export const FLAGSHIP = {
  id: "p-tn-bhavani-bridge",
  name: "Bhavani River Bridge & Approach Road, Sirumugai",
  purpose:
    "A two-lane high-level bridge across the Bhavani at Sirumugai with approach roads on both banks, replacing the low-level causeway that is overtopped and impassable through the north-east monsoon.",
  state: "Tamil Nadu",
  district: "Coimbatore",
  taluk: "Mettupalayam",
  assetKind: "bridge" as const,
  requiringBody: "Highways Department, Government of Tamil Nadu",
  dprNumber: "TNHD/CBE/MTP/2025/BR-14",
} as const;
