"use client";

/**
 * Three.js procedural 3D models rendered as MapLibre custom layers.
 *
 * Each asset type gets a distinct procedural model:
 * - Bridge: deck + pylons + cable stays
 * - Metro: elevated viaduct with station platforms
 * - Solar: tilted panel arrays
 * - Canal: water channel with embankment walls
 * - Rail: track bed with sleepers
 * - Airport: terminal building + control tower
 * - Industrial: warehouse blocks
 * - Expressway: road surface with lane markings
 * - Port: crane structures
 * - Pipeline: pipe sections with valve markers
 *
 * Models are created procedurally using Three.js geometries — no external
 * glTF files needed. Loaded lazily to avoid impacting initial bundle size.
 */

import { MapLibreMap, MercatorCoordinate } from "maplibre-gl";
import type { Position } from "@/lib/geo";
import * as THREE from "three";

type AssetKind =
  | "bridge"
  | "expressway"
  | "metro"
  | "canal"
  | "port-corridor"
  | "rail"
  | "airport"
  | "industrial"
  | "solar"
  | "pipeline";

interface ModelPlacement {
  position: Position; // [lng, lat]
  bearing: number; // degrees
  scale?: number;
}

/**
 * Creates procedural 3D models and adds them as a MapLibre custom layer.
 * Call this after the map's "load" event.
 */
export async function addProceduralModels(
  map: MapLibreMap,
  assetKind: AssetKind,
  placements: ModelPlacement[],
  layerId: string = "3d-models"
): Promise<void> {
  if (placements.length === 0) return;

  const camera = new THREE.Camera();

  interface ModelItem {
    scene: THREE.Scene;
    position: Position;
    bearing: number;
    scale: number;
  }

  const items: ModelItem[] = [];

  for (const placement of placements) {
    const scene = new THREE.Scene();
    const group = createModel(assetKind, placement.scale ?? 1);
    scene.add(group);

    // Warm, natural sunlight with ambient fill — prevents washed out white surfaces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xfff8eb, 0.75);
    dirLight.position.set(100, 150, 200);
    scene.add(dirLight);

    items.push({
      scene,
      position: placement.position,
      bearing: placement.bearing,
      scale: placement.scale ?? 1,
    });
  }

  let renderer: THREE.WebGLRenderer | null = null;

  const customLayer = {
    id: layerId,
    type: "custom" as const,
    renderingMode: "3d" as const,

    onAdd(_map: MapLibreMap, gl: WebGLRenderingContext) {
      renderer = new THREE.WebGLRenderer({
        canvas: _map.getCanvas(),
        context: gl as unknown as WebGL2RenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
    },

    render(_gl: WebGLRenderingContext, options: { defaultProjectionData: { mainMatrix: Float32Array } }) {
      if (!renderer) return;

      const mainMatrix = new THREE.Matrix4().fromArray(
        options.defaultProjectionData.mainMatrix
      );

      renderer.resetState();

      for (const item of items) {
        let elevation = 0;
        if (typeof (map as any).queryTerrainElevation === "function") {
          const elev = (map as any).queryTerrainElevation(item.position);
          if (elev !== null && elev !== undefined && !Number.isNaN(elev)) {
            elevation = elev;
          }
        }

        const coord = MercatorCoordinate.fromLngLat(item.position, elevation);
        const s = coord.meterInMercatorCoordinateUnits() * item.scale;

        const rotZ = new THREE.Matrix4().makeRotationZ(
          -(((item.bearing - 90) * Math.PI) / 180)
        );

        // Precise translation to Mercator coordinate, scale in meters, flip Y
        const l = new THREE.Matrix4()
          .makeTranslation(coord.x, coord.y, coord.z)
          .scale(new THREE.Vector3(s, -s, s))
          .multiply(rotZ);

        camera.projectionMatrix = mainMatrix.clone().multiply(l);
        renderer.render(item.scene, camera);
      }
    },

    onRemove() {
      renderer?.dispose();
    },
  };

  map.addLayer(customLayer as any);
}

/**
 * Creates the appropriate procedural 3D model for an asset type.
 */
function createModel(kind: AssetKind, modelScale: number): THREE.Group {
  const group = new THREE.Group();

  switch (kind) {
    case "bridge":
      createBridgeModel(group, modelScale);
      break;
    case "metro":
      createMetroModel(group, modelScale);
      break;
    case "solar":
      createSolarModel(group, modelScale);
      break;
    case "canal":
      createCanalModel(group, modelScale);
      break;
    case "rail":
      createRailModel(group, modelScale);
      break;
    case "airport":
      createAirportModel(group, modelScale);
      break;
    case "industrial":
      createIndustrialModel(group, modelScale);
      break;
    case "expressway":
      createExpresswayModel(group, modelScale);
      break;
    case "port-corridor":
      createPortModel(group, modelScale);
      break;
    case "pipeline":
      createPipelineModel(group, modelScale);
      break;
  }

  // Ensure every mesh and material across all procedural models has DoubleSide and depth testing
  // so no face is ever culled by backface culling, negative determinant winding, or camera angles
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material) {
      if (Array.isArray(obj.material)) {
        for (const m of obj.material) {
          m.side = THREE.DoubleSide;
          m.depthTest = true;
          m.depthWrite = true;
        }
      } else {
        obj.material.side = THREE.DoubleSide;
        obj.material.depthTest = true;
        obj.material.depthWrite = true;
      }
    }
  });

  return group;
}

// ── Bridge: elongated deck + river bank abutments + viaduct piers + twin pylons + cable stays ──────────
function createBridgeModel(group: THREE.Group, s: number): void {
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Dark slate concrete / asphalt
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Structural concrete tower
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Steel cable stays
    roughness: 0.4,
    metalness: 0.6,
    side: THREE.DoubleSide,
  });
  const waterPierMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark submerged river piers
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const approachPierMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Concrete approach piers
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const abutmentMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Heavy bank abutments
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const railingMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Steel safety crash barriers
    roughness: 0.4,
    metalness: 0.3,
    side: THREE.DoubleSide,
  });
  const markingMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, // Amber road center line
    side: THREE.DoubleSide,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    side: THREE.DoubleSide,
  });

  // Total span 760m (connecting West bank at -380m to East bank at +380m across the river)
  const totalLength = 760 * s;

  // 1. Bridge deck spanning completely across both banks (760m)
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(totalLength, 24 * s, 5 * s),
    deckMat
  );
  deck.position.set(0, 0, 16 * s);
  group.add(deck);

  // 2. Amber road center divider line (760m)
  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(totalLength, 1.2 * s, 0.4 * s),
    markingMat
  );
  centerLine.position.set(0, 0, 18.7 * s);
  group.add(centerLine);

  // 3. Side safety crash barriers and pedestrian walkways on both sides (760m)
  for (const yRailing of [-11.6 * s, 11.6 * s]) {
    const railing = new THREE.Mesh(
      new THREE.BoxGeometry(totalLength, 0.6 * s, 2.5 * s),
      railingMat
    );
    railing.position.set(0, yRailing, 20 * s);
    group.add(railing);

    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(totalLength, 2 * s, 1 * s),
      deckMat
    );
    sidewalk.position.set(0, yRailing > 0 ? yRailing - 1.2 * s : yRailing + 1.2 * s, 19 * s);
    group.add(sidewalk);
  }

  // 4. Solid concrete abutments anchoring bridge deck onto both river banks
  for (const xAbut of [-380 * s, 380 * s]) {
    // Main abutment block embedded into river bank slopes
    const abutment = new THREE.Mesh(
      new THREE.BoxGeometry(32 * s, 28 * s, 35 * s),
      abutmentMat
    );
    abutment.position.set(xAbut, 0, 4 * s);
    group.add(abutment);

    // Retaining wing walls anchoring into bank hillside
    for (const yWing of [-14 * s, 14 * s]) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(26 * s, 5 * s, 25 * s),
        abutmentMat
      );
      wing.position.set(xAbut > 0 ? xAbut + 8 * s : xAbut - 8 * s, yWing, 4 * s);
      group.add(wing);
    }
  }

  // 5. Approach viaduct piers stepping down valley slopes to the river
  const approachPierOffsets = [-310 * s, -230 * s, -150 * s, 150 * s, 230 * s, 310 * s];
  for (const xPier of approachPierOffsets) {
    // Pier column (tall enough to reach deep ground elevation)
    const pierCol = new THREE.Mesh(
      new THREE.BoxGeometry(10 * s, 16 * s, 35 * s),
      approachPierMat
    );
    pierCol.position.set(xPier, 0, 1 * s);
    group.add(pierCol);

    // Flared pier cap supporting deck
    const pierCap = new THREE.Mesh(
      new THREE.BoxGeometry(14 * s, 24 * s, 4 * s),
      approachPierMat
    );
    pierCap.position.set(xPier, 0, 14 * s);
    group.add(pierCap);
  }

  // 6. Twin Central River Cable-Stayed Pylons (Deep navigation river channel)
  for (const xOff of [-75 * s, 75 * s]) {
    // Massive underwater caisson pier in riverbed
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(20 * s, 28 * s, 42 * s),
      waterPierMat
    );
    pier.position.set(xOff, 0, -3 * s);
    group.add(pier);

    // Twin pylon legs rising on both sides of traffic deck
    for (const yLeg of [-8 * s, 8 * s]) {
      const pylonLeg = new THREE.Mesh(
        new THREE.BoxGeometry(6 * s, 4.5 * s, 74 * s),
        pylonMat
      );
      pylonLeg.position.set(xOff, yLeg, 51 * s);
      group.add(pylonLeg);
    }

    // Lower cross-brace under deck
    const lowerBrace = new THREE.Mesh(
      new THREE.BoxGeometry(5 * s, 16 * s, 4 * s),
      pylonMat
    );
    lowerBrace.position.set(xOff, 0, 14 * s);
    group.add(lowerBrace);

    // Upper cross-beam connecting towers above roadway
    const upperBrace = new THREE.Mesh(
      new THREE.BoxGeometry(5 * s, 16 * s, 4 * s),
      pylonMat
    );
    upperBrace.position.set(xOff, 0, 80 * s);
    group.add(upperBrace);

    // Tower peak aviation warning beacon
    const beacon = new THREE.Mesh(
      new THREE.BoxGeometry(1.5 * s, 1.5 * s, 2.5 * s),
      beaconMat
    );
    beacon.position.set(xOff, 0, 88 * s);
    group.add(beacon);

    // Cable stays fan radiating from tower apex to deck anchors
    const cableOffsets = [-60 * s, -45 * s, -30 * s, -15 * s, 15 * s, 30 * s, 45 * s, 60 * s];
    for (const cOff of cableOffsets) {
      for (const ySide of [-7.5 * s, 7.5 * s]) {
        const cableLength = Math.hypot(cOff, 62 * s);
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35 * s, 0.35 * s, cableLength, 6),
          cableMat
        );
        cable.position.set(xOff + cOff / 2, ySide, 48 * s);
        cable.rotation.z = Math.atan2(cOff, 62 * s);
        group.add(cable);
      }
    }
  }
}

// ── Metro: elevated viaduct with platform ───────────────────────────
function createMetroModel(group: THREE.Group, s: number): void {
  const viaductMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed });
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, transparent: true, opacity: 0.8 });

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(3 * s, 4 * s, 30 * s, 8),
    viaductMat
  );
  column.position.set(0, 0, 15 * s);
  group.add(column);

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(80 * s, 15 * s, 3 * s),
    platformMat
  );
  platform.position.set(0, 0, 31 * s);
  group.add(platform);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(70 * s, 12 * s, 1 * s),
    roofMat
  );
  roof.position.set(0, 0, 40 * s);
  group.add(roof);
}

// ── Solar: tilted panel arrays ──────────────────────────────────────
function createSolarModel(group: THREE.Group, s: number): void {
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, metalness: 0.7, roughness: 0.3 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xa3a3a3 });

  for (let row = -2; row <= 2; row++) {
    for (let col = -3; col <= 3; col++) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(8 * s, 5 * s, 0.2 * s),
        panelMat
      );
      panel.position.set(col * 10 * s, row * 7 * s, 4 * s);
      panel.rotation.x = -0.5;
      group.add(panel);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 4 * s, 6),
        frameMat
      );
      post.position.set(col * 10 * s, row * 7 * s, 2 * s);
      group.add(post);
    }
  }
}

// ── Canal: water channel with embankment ────────────────────────────
function createCanalModel(group: THREE.Group, s: number): void {
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9, transparent: true, opacity: 0.7,
  });
  const embankmentMat = new THREE.MeshStandardMaterial({ color: 0x78716c });

  const water = new THREE.Mesh(
    new THREE.BoxGeometry(100 * s, 15 * s, 1 * s),
    waterMat
  );
  water.position.set(0, 0, 1 * s);
  group.add(water);

  for (const yOff of [9 * s, -9 * s]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(100 * s, 2 * s, 4 * s),
      embankmentMat
    );
    wall.position.set(0, yOff, 2 * s);
    group.add(wall);
  }
}

// ── Rail: track bed with sleepers ───────────────────────────────────
function createRailModel(group: THREE.Group, s: number): void {
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.8 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x78716c });
  const ballastMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e });

  const ballast = new THREE.Mesh(
    new THREE.BoxGeometry(100 * s, 8 * s, 1.5 * s),
    ballastMat
  );
  ballast.position.set(0, 0, 0.75 * s);
  group.add(ballast);

  for (const yOff of [-2 * s, 2 * s]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(100 * s, 0.5 * s, 1 * s),
      railMat
    );
    rail.position.set(0, yOff, 2 * s);
    group.add(rail);
  }

  for (let i = -15; i <= 15; i++) {
    const sleeper = new THREE.Mesh(
      new THREE.BoxGeometry(1 * s, 6 * s, 0.5 * s),
      sleeperMat
    );
    sleeper.position.set(i * 3 * s, 0, 1.7 * s);
    group.add(sleeper);
  }
}

// ── Airport: terminal + control tower ───────────────────────────────
function createAirportModel(group: THREE.Group, s: number): void {
  const terminalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb, transparent: true, opacity: 0.65, metalness: 0.6,
  });
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  const terminal = new THREE.Mesh(
    new THREE.BoxGeometry(120 * s, 40 * s, 20 * s),
    terminalMat
  );
  terminal.position.set(0, 0, 10 * s);
  group.add(terminal);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(118 * s, 0.5 * s, 15 * s),
    glassMat
  );
  glass.position.set(0, 20.5 * s, 12 * s);
  group.add(glass);

  const towerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(5 * s, 6 * s, 35 * s, 12),
    towerMat
  );
  towerBase.position.set(70 * s, 25 * s, 17.5 * s);
  group.add(towerBase);

  const cab = new THREE.Mesh(
    new THREE.CylinderGeometry(8 * s, 6 * s, 8 * s, 12),
    glassMat
  );
  cab.position.set(70 * s, 25 * s, 39 * s);
  group.add(cab);
}

// ── Industrial: warehouse blocks ────────────────────────────────────
function createIndustrialModel(group: THREE.Group, s: number): void {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x78716c });

  for (let i = 0; i < 3; i++) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(50 * s, 25 * s, 15 * s),
      wallMat
    );
    wall.position.set(i * 55 * s - 55 * s, 0, 7.5 * s);
    group.add(wall);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(52 * s, 27 * s, 2 * s),
      roofMat
    );
    roof.position.set(i * 55 * s - 55 * s, 0, 16 * s);
    group.add(roof);
  }
}

// ── Expressway: road with lane markings ─────────────────────────────
function createExpresswayModel(group: THREE.Group, s: number): void {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x374151 });
  const markingMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(150 * s, 20 * s, 1 * s),
    roadMat
  );
  road.position.set(0, 0, 2 * s);
  group.add(road);

  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(150 * s, 0.5 * s, 2 * s),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af })
  );
  divider.position.set(0, 0, 3.5 * s);
  group.add(divider);

  for (let i = -20; i <= 20; i++) {
    for (const yOff of [5 * s, -5 * s]) {
      const marking = new THREE.Mesh(
        new THREE.BoxGeometry(3 * s, 0.3 * s, 0.1 * s),
        markingMat
      );
      marking.position.set(i * 5 * s, yOff, 2.6 * s);
      group.add(marking);
    }
  }
}

// ── Port: crane structures ──────────────────────────────────────────
function createPortModel(group: THREE.Group, s: number): void {
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x6b7280 });

  for (let i = 0; i < 3; i++) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8 * s, 15 * s, 5 * s),
      baseMat
    );
    base.position.set(i * 40 * s - 40 * s, 0, 2.5 * s);
    group.add(base);

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(4 * s, 4 * s, 50 * s),
      craneMat
    );
    tower.position.set(i * 40 * s - 40 * s, 0, 30 * s);
    group.add(tower);

    const boom = new THREE.Mesh(
      new THREE.BoxGeometry(60 * s, 3 * s, 3 * s),
      craneMat
    );
    boom.position.set(i * 40 * s - 10 * s, 0, 52 * s);
    group.add(boom);
  }
}

// ── Pipeline: pipe sections ─────────────────────────────────────────
function createPipelineModel(group: THREE.Group, s: number): void {
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xa3a3a3, metalness: 0.7 });
  const valveMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });

  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(2 * s, 2 * s, 100 * s, 12),
    pipeMat
  );
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, 0, 3 * s);
  group.add(pipe);

  for (const xOff of [-30 * s, 0, 30 * s]) {
    const valve = new THREE.Mesh(
      new THREE.TorusGeometry(3 * s, 0.5 * s, 8, 16),
      valveMat
    );
    valve.position.set(xOff, 0, 3 * s);
    valve.rotation.y = Math.PI / 2;
    group.add(valve);
  }
}

/**
 * Computes model placements along a LineString alignment.
 * Places models at regular intervals, oriented to follow direction.
 */
export function computeLinePlacements(
  coords: Position[],
  spacingMeters: number = 500,
  modelScale: number = 1
): ModelPlacement[] {
  if (coords.length < 2) return [];

  const placements: ModelPlacement[] = [];

  // Compute cumulative distances
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const [x1, y1] = coords[i - 1];
    const [x2, y2] = coords[i];
    const d = Math.sqrt(
      ((x2 - x1) * Math.cos(((y1 + y2) / 2 * Math.PI) / 180)) ** 2 +
      (y2 - y1) ** 2
    ) * 111320;
    cumDist.push(cumDist[i - 1] + d);
  }
  const totalDist = cumDist[cumDist.length - 1];
  if (totalDist === 0) return [];

  for (let along = spacingMeters / 2; along < totalDist; along += spacingMeters) {
    let segIdx = 0;
    for (let i = 1; i < cumDist.length; i++) {
      if (cumDist[i] >= along) {
        segIdx = i - 1;
        break;
      }
    }

    const segLen = cumDist[segIdx + 1] - cumDist[segIdx];
    const t = segLen === 0 ? 0 : (along - cumDist[segIdx]) / segLen;
    const [x1, y1] = coords[segIdx];
    const [x2, y2] = coords[segIdx + 1];
    const lng = x1 + (x2 - x1) * t;
    const lat = y1 + (y2 - y1) * t;

    // Bearing
    const dLng = ((x2 - x1) * Math.PI) / 180;
    const lat1Rad = (y1 * Math.PI) / 180;
    const lat2Rad = (y2 * Math.PI) / 180;
    const y_b = Math.sin(dLng) * Math.cos(lat2Rad);
    const x_b = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    const bearing = ((Math.atan2(y_b, x_b) * 180) / Math.PI + 360) % 360;

    placements.push({ position: [lng, lat], bearing, scale: modelScale });
  }

  return placements;
}

/**
 * Computes a single model placement at the centroid of a polygon.
 */
export function computePolygonPlacement(
  coords: Position[],
  modelScale: number = 1
): ModelPlacement {
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return {
    position: [sumLng / coords.length, sumLat / coords.length],
    bearing: 0,
    scale: modelScale,
  };
}

/**
 * Computes a bridge model placement centered at the river crossing midpoint of the alignment.
 */
export function computeBridgePlacements(
  coords: Position[],
  modelScale: number = 1.2
): ModelPlacement[] {
  if (coords.length < 2) return [];
  const midIdx = Math.floor(coords.length / 2);
  const p1 = coords[Math.max(0, midIdx - 1)];
  const p2 = coords[Math.min(coords.length - 1, midIdx + 1)];
  const midLng = (coords[0][0] + coords[coords.length - 1][0]) / 2;
  const midLat = (coords[0][1] + coords[coords.length - 1][1]) / 2;

  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const lat1Rad = (p1[1] * Math.PI) / 180;
  const lat2Rad = (p2[1] * Math.PI) / 180;
  const y_b = Math.sin(dLng) * Math.cos(lat2Rad);
  const x_b =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const bearing = ((Math.atan2(y_b, x_b) * 180) / Math.PI + 360) % 360;

  return [{ position: [midLng, midLat], bearing, scale: modelScale }];
}

