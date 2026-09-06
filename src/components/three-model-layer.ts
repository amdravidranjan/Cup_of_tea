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

import type { MapLibreMap } from "maplibre-gl";
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

// Mercator math for placing Three.js objects on a MapLibre map
const MERCATOR_A = 6378137.0;
function lngLatToMercator(lng: number, lat: number): [number, number] {
  const x = (lng * Math.PI * MERCATOR_A) / 180;
  const y = MERCATOR_A * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  // Create models for each placement
  for (const placement of placements) {
    const group = createModel(assetKind, placement.scale ?? 1);
    const [mx, my] = lngLatToMercator(placement.position[0], placement.position[1]);
    group.userData.mercatorX = mx;
    group.userData.mercatorY = my;
    group.userData.bearing = placement.bearing;
    scene.add(group);
  }

  // Ambient + directional light for realistic shading
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(100, 200, 150);
  scene.add(dirLight);

  // Create a custom layer
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

      const projMatrix = new THREE.Matrix4().fromArray(
        options.defaultProjectionData.mainMatrix
      );

      // Position each model group in Mercator coordinates
      for (const child of scene.children) {
        if (child.userData.mercatorX !== undefined) {
          const worldSize = (1 << Math.round(map.getZoom())) * 512;
          const scale = worldSize / (Math.PI * 2 * MERCATOR_A);
          const x = child.userData.mercatorX * scale;
          const y = -child.userData.mercatorY * scale;

          child.position.set(x, y, 0);
          child.rotation.z = -((child.userData.bearing * Math.PI) / 180);
          child.scale.setScalar(scale * 0.8);
        }
      }

      camera.projectionMatrix = projMatrix;

      renderer.resetState();
      renderer.render(scene, camera);
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

  return group;
}

// ── Bridge: deck + pylons + cable stays ─────────────────────────────
function createBridgeModel(group: THREE.Group, s: number): void {
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xa3a3a3 });

  // Bridge deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(200 * s, 20 * s, 5 * s),
    deckMat
  );
  deck.position.set(0, 0, 15 * s);
  group.add(deck);

  // Pylons
  for (const xOff of [-60 * s, 60 * s]) {
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(8 * s, 8 * s, 40 * s),
      pylonMat
    );
    pylon.position.set(xOff, 0, 20 * s);
    group.add(pylon);

    // Cable stays
    for (let i = -3; i <= 3; i++) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 50 * s, 4),
        cableMat
      );
      cable.position.set(xOff + i * 10 * s, 0, 30 * s);
      cable.rotation.z = i * 0.1;
      group.add(cable);
    }
  }
}

// ── Metro: elevated viaduct with platform ───────────────────────────
function createMetroModel(group: THREE.Group, s: number): void {
  const viaductMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed });
  const platformMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, transparent: true, opacity: 0.7 });

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
  const terminalMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa, transparent: true, opacity: 0.5, metalness: 0.6,
  });
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

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
