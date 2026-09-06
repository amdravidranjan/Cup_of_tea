/**
 * Authors the flagship 3D asset: the Bhavani River bridge at Sirumugai.
 *
 * The procedural bridge in `three-model-layer.ts` is boxes — a slab, two
 * pylons, six-sided cable cylinders — and reads as a placeholder from any
 * distance. This builds the real thing instead: a four-span composite girder
 * bridge with the components a bridge actually has, at the dimensions the
 * project drawings state.
 *
 * Dimensions come from the same source as the drawings and the DPR:
 *   248 m overall, four spans of 62 m
 *   12.0 m deck: 7.0 m carriageway, 1.5 m shoulders, 0.75 m crash barriers
 *   Deck soffit 8.4 m above highest flood level
 *   Three river piers on pile caps, with cutwaters facing upstream
 *
 * Output frame is what the map layer expects: X along the bridge, Y across,
 * Z up, metres, z = 0 at riverbed. See `scripts/lib/glb.ts`.
 *
 *   npx tsx scripts/build-bridge-model.ts
 */

import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { MeshBuilder, type Material } from "./lib/glb";

const OUT_DIR = resolve(process.cwd(), "public", "models");
mkdirSync(OUT_DIR, { recursive: true });

/* ── Dimensions ───────────────────────────────────────────────────────── */

const SPAN = 62;
const SPANS = 4;
const LENGTH = SPAN * SPANS; // 248 m
const HALF = LENGTH / 2;

const DECK_WIDTH = 12.0;
const CARRIAGEWAY = 7.0;
const SHOULDER = 1.5;
const BARRIER_WIDTH = 0.75;

const BED_Z = 0; // riverbed
const WATER_Z = 3.2; // normal water level
const SOFFIT_Z = 11.6; // underside of the girders
const GIRDER_DEPTH = 2.2;
const SLAB_THICKNESS = 0.25;
const WEARING_COURSE = 0.08;

const DECK_TOP = SOFFIT_Z + GIRDER_DEPTH + SLAB_THICKNESS + WEARING_COURSE;

const GIRDER_COUNT = 5;
const GIRDER_SPACING = 2.4;

/* ── Materials ────────────────────────────────────────────────────────── */

const M = {
  wearing: mat("wearing-course", "#3f3f46", 0.0, 0.95),
  slab: mat("deck-slab", "#a8a29e", 0.0, 0.85),
  barrier: mat("crash-barrier", "#d6d3d1", 0.0, 0.8),
  girder: mat("steel-girder", "#475569", 0.75, 0.42),
  bracing: mat("cross-bracing", "#334155", 0.75, 0.45),
  pier: mat("pier-concrete", "#9ca3af", 0.0, 0.78),
  pierCap: mat("pier-cap", "#a1a1aa", 0.0, 0.74),
  pileCap: mat("pile-cap", "#6b7280", 0.0, 0.86),
  abutment: mat("abutment", "#94a3b8", 0.0, 0.82),
  bearing: mat("elastomeric-bearing", "#1c1917", 0.0, 0.95),
  railing: mat("railing", "#cbd5e1", 0.65, 0.35),
  lamp: mat("lamp-column", "#52525b", 0.7, 0.4),
  lampHead: mat("lamp-head", "#e2e8f0", 0.35, 0.3),
  markingWhite: mat("marking-white", "#f8fafc", 0.0, 0.7),
  markingYellow: mat("marking-yellow", "#facc15", 0.0, 0.7),
  embankment: mat("embankment", "#a16207", 0.0, 0.95),
  revetment: mat("revetment", "#78716c", 0.0, 0.92),
  joint: mat("expansion-joint", "#27272a", 0.6, 0.5),
  drain: mat("drainage-spout", "#3f3f46", 0.6, 0.5),
  water: mat("water", "#3b82f6", 0.0, 0.15),
} satisfies Record<string, Material>;

function mat(name: string, hex: string, metallic: number, roughness: number): Material {
  const n = parseInt(hex.slice(1), 16);
  // glTF base colour is linear; the hex values above are sRGB as authored.
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const linear = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return { name, color: [linear[0], linear[1], linear[2]], metallic, roughness };
}

/* ── Build ────────────────────────────────────────────────────────────── */

const b = new MeshBuilder();

buildDeck();
buildBarriersAndRailings();
buildRoadMarkings();
buildGirdersAndBracing();
buildExpansionJoints();
buildPiers();
buildAbutmentsAndApproaches();
buildLighting();
buildDrainage();
buildWater();

b.writeGlb(join(OUT_DIR, "bridge-bhavani.glb"), "BhavaniRiverBridge");

console.log(
  `public/models/bridge-bhavani.glb — ${b.triangleCount.toLocaleString()} triangles, ` +
    `${b.materialCount} materials, ${LENGTH} m x ${DECK_WIDTH} m`
);

/* ── Components ───────────────────────────────────────────────────────── */

/** Deck slab and the bituminous wearing course on top of it. */
function buildDeck(): void {
  const slabZ = SOFFIT_Z + GIRDER_DEPTH + SLAB_THICKNESS / 2;
  b.box(M.slab, [0, 0, slabZ], [LENGTH, DECK_WIDTH, SLAB_THICKNESS]);

  // The wearing course covers only the trafficked width, not the barriers.
  const paved = CARRIAGEWAY + SHOULDER * 2;
  b.box(
    M.wearing,
    [0, 0, slabZ + SLAB_THICKNESS / 2 + WEARING_COURSE / 2],
    [LENGTH, paved, WEARING_COURSE]
  );

  // Cantilever brackets under the deck overhang, at every third girder bay.
  for (let x = -HALF + 4; x <= HALF - 4; x += 6.2) {
    for (const side of [-1, 1]) {
      const y = side * (DECK_WIDTH / 2 - 0.55);
      b.box(M.slab, [x, y, SOFFIT_Z + GIRDER_DEPTH - 0.35], [0.35, 1.1, 0.5]);
    }
  }
}

/**
 * Crash barriers and the pedestrian railing above them.
 *
 * The barrier is stepped rather than a plain wall, which is what a New
 * Jersey profile looks like in section and what makes it read as a barrier
 * rather than a kerb.
 */
function buildBarriersAndRailings(): void {
  const baseZ = DECK_TOP - WEARING_COURSE;
  for (const side of [-1, 1]) {
    const y = side * (DECK_WIDTH / 2 - BARRIER_WIDTH / 2);

    b.box(M.barrier, [0, y, baseZ + 0.15], [LENGTH, BARRIER_WIDTH, 0.3]);
    b.box(M.barrier, [0, y + side * 0.08, baseZ + 0.48], [LENGTH, BARRIER_WIDTH - 0.16, 0.36]);
    b.box(M.barrier, [0, y + side * 0.14, baseZ + 0.78], [LENGTH, BARRIER_WIDTH - 0.28, 0.24]);

    // Railing: posts at 2.4 m with two horizontal rails, as built.
    const postTop = baseZ + 0.9 + 0.95;
    for (let x = -HALF + 1.2; x <= HALF - 1.2; x += 2.4) {
      b.box(M.railing, [x, y, baseZ + 0.9 + 0.475], [0.09, 0.09, 0.95]);
    }
    b.box(M.railing, [0, y, postTop - 0.06], [LENGTH, 0.12, 0.12]);
    b.box(M.railing, [0, y, postTop - 0.52], [LENGTH, 0.08, 0.08]);
  }
}

/** Lane lines, edge lines and the centre line. */
function buildRoadMarkings(): void {
  const z = DECK_TOP + 0.006;
  const dashLength = 3.0;
  const gap = 6.0;

  // Broken centre line.
  for (let x = -HALF + 2; x < HALF - 2; x += dashLength + gap) {
    b.box(M.markingWhite, [x + dashLength / 2, 0, z], [dashLength, 0.12, 0.012]);
  }
  // Continuous edge lines at the carriageway limits.
  for (const side of [-1, 1]) {
    b.box(M.markingWhite, [0, side * (CARRIAGEWAY / 2), z], [LENGTH, 0.15, 0.012]);
    // Yellow shoulder line at the barrier face.
    b.box(M.markingYellow, [0, side * (CARRIAGEWAY / 2 + SHOULDER - 0.1), z], [LENGTH, 0.1, 0.012]);
  }
}

/**
 * Five longitudinal plate girders per span, with their flanges, plus the
 * cross bracing between them.
 *
 * This is what carries the deck, and it is what you see when you stand under
 * a bridge — the single most conspicuous thing the old box-slab model was
 * missing.
 */
function buildGirdersAndBracing(): void {
  const webDepth = GIRDER_DEPTH - 0.12;
  const flangeThickness = 0.06;

  for (let g = 0; g < GIRDER_COUNT; g++) {
    const y = (g - (GIRDER_COUNT - 1) / 2) * GIRDER_SPACING;

    b.box(M.girder, [0, y, SOFFIT_Z + GIRDER_DEPTH / 2], [LENGTH, 0.03, webDepth]);
    b.box(M.girder, [0, y, SOFFIT_Z + flangeThickness / 2], [LENGTH, 0.62, flangeThickness]);
    b.box(M.girder, [0, y, SOFFIT_Z + GIRDER_DEPTH - flangeThickness / 2], [LENGTH, 0.5, flangeThickness]);

    // Web stiffeners, at the spacing plate girders actually use.
    for (let x = -HALF + 2.5; x <= HALF - 2.5; x += 5) {
      b.box(M.girder, [x, y, SOFFIT_Z + GIRDER_DEPTH / 2], [0.05, 0.34, webDepth]);
    }
  }

  // Cross bracing between adjacent girders: a K-frame every 7.75 m, which is
  // a span eighth. Modelled as the diagonals and the bottom strut.
  for (let g = 0; g < GIRDER_COUNT - 1; g++) {
    const y0 = (g - (GIRDER_COUNT - 1) / 2) * GIRDER_SPACING;
    const yMid = y0 + GIRDER_SPACING / 2;

    for (let x = -HALF + SPAN / 8; x < HALF; x += SPAN / 8) {
      const zLow = SOFFIT_Z + 0.28;
      const zHigh = SOFFIT_Z + GIRDER_DEPTH - 0.28;
      const y1 = y0 + GIRDER_SPACING;

      b.box(M.bracing, [x, yMid, zLow], [0.1, GIRDER_SPACING - 0.1, 0.1]);
      b.box(M.bracing, [x, yMid, zHigh], [0.1, GIRDER_SPACING - 0.1, 0.1]);
      // The X of the cross frame: two diagonals corner to corner.
      b.beam(M.bracing, [x, y0, zLow], [x, y1, zHigh], 0.09, 0.14);
      b.beam(M.bracing, [x, y0, zHigh], [x, y1, zLow], 0.09, 0.14);
    }
  }
}

/** Expansion joints over each pier line and at both abutments. */
function buildExpansionJoints(): void {
  const z = DECK_TOP + 0.004;
  for (let i = 0; i <= SPANS; i++) {
    const x = -HALF + i * SPAN;
    b.box(M.joint, [x, 0, z], [0.14, CARRIAGEWAY + SHOULDER * 2, 0.03]);
  }
}

/**
 * The three river piers.
 *
 * Each is a pile cap on the bed, twin columns, a pier cap spanning them, and
 * elastomeric bearings under each girder line. The cutwaters on the upstream
 * face are the detail that says this pier stands in moving water.
 */
function buildPiers(): void {
  for (let i = 1; i < SPANS; i++) {
    const x = -HALF + i * SPAN;

    b.box(M.pileCap, [x, 0, BED_Z + 0.9], [7.2, DECK_WIDTH - 1.2, 1.8]);

    // Twin circular columns, slightly tapered as cast.
    for (const side of [-1, 1]) {
      const y = side * 3.1;
      const columnHeight = SOFFIT_Z - 1.6 - (BED_Z + 1.8);
      b.cylinder(
        M.pier,
        [x, y, BED_Z + 1.8 + columnHeight / 2],
        1.5,
        columnHeight,
        "z",
        24,
        1.25
      );
    }

    // Cutwater: pointed nose upstream, rounded tail downstream. Upstream is
    // -X here, matching the river running past the crossing.
    const noseHeight = WATER_Z + 2.6;
    b.cutwater(M.pier, [x - 1.4, 0, BED_Z + 1.8], 1.6, 2.4, noseHeight, -1);
    b.cylinder(M.pier, [x + 1.4, 0, BED_Z + 1.8 + noseHeight / 2], 1.6, noseHeight, "z", 20);

    // Pier cap, tapered to the columns.
    b.box(M.pierCap, [x, 0, SOFFIT_Z - 1.1], [2.6, DECK_WIDTH - 1.6, 1.0]);
    b.box(M.pierCap, [x, 0, SOFFIT_Z - 1.72], [2.0, DECK_WIDTH - 2.6, 0.32]);

    buildBearings(x);
  }
}

/** Elastomeric bearings and their pedestals, one under each girder. */
function buildBearings(x: number): void {
  for (let g = 0; g < GIRDER_COUNT; g++) {
    const y = (g - (GIRDER_COUNT - 1) / 2) * GIRDER_SPACING;
    b.box(M.pierCap, [x, y, SOFFIT_Z - 0.46], [0.9, 0.8, 0.28]);
    b.box(M.bearing, [x, y, SOFFIT_Z - 0.16], [0.62, 0.55, 0.32]);
  }
}

/**
 * Abutments on both banks, their wing walls, and the approach embankments
 * that actually take the land.
 */
function buildAbutmentsAndApproaches(): void {
  const approachLength = 90;

  for (const end of [-1, 1] as const) {
    const x = end * (HALF + 1.6);

    b.box(M.abutment, [x, 0, (SOFFIT_Z - 0.6) / 2], [3.2, DECK_WIDTH, SOFFIT_Z - 0.6]);
    b.box(M.abutment, [x, 0, SOFFIT_Z - 0.35], [3.6, DECK_WIDTH + 0.4, 0.5]);
    b.box(M.abutment, [x + end * 1.9, 0, SOFFIT_Z + 1.2], [0.5, DECK_WIDTH, 2.6]);
    buildBearings(x);

    // Wing walls, splayed back into the embankment.
    for (const side of [-1, 1]) {
      const y = side * (DECK_WIDTH / 2 + 0.3);
      b.taperedBox(
        M.abutment,
        [x + end * 5.5, y, 0],
        11,
        0.6,
        0.6,
        end > 0 ? SOFFIT_Z - 0.6 : DECK_TOP - 2.2,
        end > 0 ? DECK_TOP - 2.2 : SOFFIT_Z - 0.6
      );
    }

    // Approach embankment: wide at the base, narrowing to the road above.
    const embankmentCentre = x + end * (approachLength / 2 + 3);
    b.taperedBox(
      M.embankment,
      [embankmentCentre, 0, BED_Z],
      approachLength,
      end > 0 ? DECK_WIDTH + 4 : 30,
      end > 0 ? 30 : DECK_WIDTH + 4,
      end > 0 ? DECK_TOP - 1.4 : DECK_TOP - 5.5,
      end > 0 ? DECK_TOP - 5.5 : DECK_TOP - 1.4
    );

    // Approach carriageway and its markings, running off the deck.
    b.box(
      M.wearing,
      [embankmentCentre, 0, DECK_TOP - 0.04],
      [approachLength, CARRIAGEWAY + SHOULDER * 2, 0.08]
    );
    for (let d = 0; d < approachLength - 4; d += 9) {
      const mx = x + end * (5 + d);
      b.box(M.markingWhite, [mx, 0, DECK_TOP + 0.01], [3, 0.12, 0.012]);
    }
    for (const side of [-1, 1]) {
      b.box(
        M.markingWhite,
        [embankmentCentre, side * (CARRIAGEWAY / 2), DECK_TOP + 0.01],
        [approachLength, 0.15, 0.012]
      );
    }

    // Stone revetment protecting the embankment toe from scour.
    for (const side of [-1, 1]) {
      b.box(
        M.revetment,
        [x + end * 9, side * (DECK_WIDTH / 2 + 3.4), BED_Z + 1.1],
        [16, 1.4, 2.2]
      );
    }
  }
}

/** Lamp columns along both edges, staggered as they are on a real deck. */
function buildLighting(): void {
  const baseZ = DECK_TOP - WEARING_COURSE + 0.9;
  let index = 0;
  for (let x = -HALF + 12; x <= HALF - 12; x += 24) {
    const side = index % 2 === 0 ? -1 : 1;
    const y = side * (DECK_WIDTH / 2 - BARRIER_WIDTH - 0.1);

    b.box(M.lamp, [x, y, baseZ + 0.15], [0.42, 0.42, 0.3]);
    b.cylinder(M.lamp, [x, y, baseZ + 4.4], 0.11, 8.2, "z", 12, 0.08);
    // The arm reaches out over the carriageway, as a street lamp does.
    b.box(M.lamp, [x, y - side * 0.9, baseZ + 8.5], [0.12, 1.8, 0.12]);
    b.box(M.lampHead, [x, y - side * 1.75, baseZ + 8.4], [0.7, 0.34, 0.16]);
    index++;
  }
}

/** Drainage spouts through the deck overhang, every 12 m. */
function buildDrainage(): void {
  for (let x = -HALF + 6; x <= HALF - 6; x += 12) {
    for (const side of [-1, 1]) {
      const y = side * (DECK_WIDTH / 2 - 0.35);
      b.cylinder(M.drain, [x, y, SOFFIT_Z + GIRDER_DEPTH - 0.6], 0.11, 1.4, "z", 10);
      b.cylinder(M.drain, [x, y, SOFFIT_Z + GIRDER_DEPTH - 1.25], 0.09, 0.9, "z", 10);
    }
  }
}

/**
 * A water plane through the piers.
 *
 * Kept narrower than the deck so it reads as the river surface the piers
 * stand in rather than a slab under the whole model, and only between the
 * abutments — the approaches are on dry land.
 */
function buildWater(): void {
  b.box(M.water, [0, 0, WATER_Z], [LENGTH - 6, 46, 0.12]);
}
