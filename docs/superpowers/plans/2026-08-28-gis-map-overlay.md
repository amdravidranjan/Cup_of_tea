# GIS Map Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every project a real georeferenced alignment (the physical corridor/footprint a bridge, highway, or other project occupies), a set of geo-tagged parcels, and an interactive map that overlays both — plus a genuinely computed "which parcels fall within the acquisition impact zone" result, not a hardcoded one. This is the feature the user specifically asked for (visualizing where a bridge/road will pass and which land it affects).

**Architecture:** Geometry is stored as GeoJSON (a `LineString` or `Polygon` on the project, `Polygon` per parcel) serialized to text columns — SQLite has no native geo type, and PostGIS was already deferred along with the rest of the Postgres decision. All spatial math (distance, centroid, buffer containment) is hand-rolled in a small pure module (`src/lib/geo.ts`) using a local equirectangular projection — accurate at the scale of a single project's parcels (kilometers, not hundreds of km), which is exactly the scale this app cares about. The map itself is MapLibre GL JS (the stack's locked choice), rendered client-side against the free, keyless `demotiles.maplibre.org` base style so no account/API key is needed. **Important limitation, agreed with the user 2026-08-28:** no browser tooling is available this session, so the map's actual visual rendering cannot be verified by the agent executing this plan — every task's data plumbing (geometry storage, impact computation, API responses) is verified, but Task 8 ends with an explicit ask for the user to confirm the map renders in a real browser.

**Tech Stack:** Adds `maplibre-gl` (client-side map rendering, MIT-licensed, no API key). Everything else is the existing stack — Next.js 16, Drizzle/libsql, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-28-land-acquisition-platform-design.md` (Section 6.3 "GIS & Spatial")

## Global Constraints

- Same as prior plans: RBAC enforced server-side, DB/auth/storage remain stubbed, single Next.js monolith.
- Impact-zone membership is **computed at read time** from the project's current geometry and each parcel's geometry — never stored as a stale boolean. If the alignment changes, the impact result changes on the next read automatically.
- The map component must not crash the page if a project has no geometry yet or zero parcels — both are valid, common states (most proposals start without a finalized alignment).

---

### Task 1: Geometry schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/parcel-status.ts`

**Interfaces:**
- Produces:
  - `projects` table gains two nullable columns: `geometryType: text` (`"LineString" | "Polygon" | null`), `geometryGeoJson: text` (JSON-stringified coordinates array, null until set)
  - `parcels` table: `{ id: text, projectId: text, village: text, areaHectares: real, status: text, geometryGeoJson: text, createdAt: Date }`
  - `PARCEL_STATUSES: readonly ["NOTIFIED", "ACQUIRED", "POSSESSED"]` and `type ParcelStatus`

- [ ] **Step 1: Write `src/lib/parcel-status.ts`**

```ts
export const PARCEL_STATUSES = ["NOTIFIED", "ACQUIRED", "POSSESSED"] as const;
export type ParcelStatus = (typeof PARCEL_STATUSES)[number];
```

- [ ] **Step 2: Modify `src/db/schema.ts`**

Add `real` to the existing `import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";` line, making it:

```ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
```

Add two columns to the existing `projects` table definition, after `updatedAt`:

```ts
  geometryType: text("geometry_type"),
  geometryGeoJson: text("geometry_geo_json"),
```

Add a new table after `documents`:

```ts
export const parcels = sqliteTable("parcels", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  village: text("village").notNull(),
  areaHectares: real("area_hectares").notNull(),
  status: text("status").notNull(),
  geometryGeoJson: text("geometry_geo_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

- [ ] **Step 3: Push the schema change and verify**

Stop the dev server first if running (Windows locks the SQLite file):

```bash
lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
```

Run: `npm run db:push`
Expected: completes without error, adds the two new `projects` columns and creates `parcels`.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/lib/parcel-status.ts
git commit -m "feat: add geometry schema for projects and parcels"
```

---

### Task 2: Geometry utilities (pure, tested)

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`

**Interfaces:**
- Produces:
  - `type Position = [number, number]` (`[lng, lat]`)
  - `interface LineGeometry { type: "LineString"; coordinates: Position[] }`
  - `interface PolygonGeometry { type: "Polygon"; coordinates: Position[][] }`
  - `type Geometry = LineGeometry | PolygonGeometry`
  - `function haversineDistanceMeters(a: Position, b: Position): number`
  - `function polygonCentroid(polygon: PolygonGeometry): Position`
  - `function distancePointToLineMeters(point: Position, line: LineGeometry): number` — true point-to-segment distance, minimized over every segment, clamped to segment endpoints (not just distance to vertices).
  - `function isParcelWithinBuffer(parcel: PolygonGeometry, alignment: Geometry, bufferMeters: number): boolean`
  - `function parseStoredGeometry(geometryType: string | null, geometryGeoJson: string | null): Geometry | null` — reconstructs a `Geometry` from the two DB columns from Task 1.
  - `IMPACT_BUFFER_METERS: number` (500)
  - `function computeParcelsWithImpact<T extends { geometry: PolygonGeometry }>(alignment: Geometry | null, parcelList: T[]): (T & { withinImpact: boolean })[]`
  - All of the above are used by the parcels API route (Task 6) and the project detail page (Task 8).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/geo.test.ts
import { describe, it, expect } from "vitest";
import {
  haversineDistanceMeters,
  polygonCentroid,
  distancePointToLineMeters,
  isParcelWithinBuffer,
  parseStoredGeometry,
  computeParcelsWithImpact,
  type LineGeometry,
  type PolygonGeometry,
} from "./geo";

describe("haversineDistanceMeters", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineDistanceMeters([82.71, 18.81], [82.71, 18.81])).toBeCloseTo(0, 3);
  });

  it("returns a plausible distance for two points ~1km apart", () => {
    const d = haversineDistanceMeters([82.71, 18.81], [82.71, 18.819]);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });
});

describe("polygonCentroid", () => {
  it("computes the centroid of a square", () => {
    const square: PolygonGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 2],
          [2, 2],
          [2, 0],
          [0, 0],
        ],
      ],
    };
    const [lng, lat] = polygonCentroid(square);
    expect(lng).toBeCloseTo(1, 5);
    expect(lat).toBeCloseTo(1, 5);
  });
});

describe("distancePointToLineMeters", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.71, 18.818],
    ],
  };

  it("is near zero for a point on the line", () => {
    expect(distancePointToLineMeters([82.71, 18.814], line)).toBeLessThan(1);
  });

  it("is large for a point far from the line", () => {
    expect(distancePointToLineMeters([82.76, 18.814], line)).toBeGreaterThan(4000);
  });

  it("clamps to the nearest endpoint for a point beyond the segment", () => {
    const beyondNorth = distancePointToLineMeters([82.71, 18.83], line);
    const toEndpoint = haversineDistanceMeters([82.71, 18.83], [82.71, 18.818]);
    expect(Math.abs(beyondNorth - toEndpoint) / toEndpoint).toBeLessThan(0.05);
  });
});

describe("isParcelWithinBuffer", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.71, 18.818],
    ],
  };

  it("flags a parcel centered on the line as within a small buffer", () => {
    const parcel: PolygonGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [82.7095, 18.8135],
          [82.7095, 18.8145],
          [82.7105, 18.8145],
          [82.7105, 18.8135],
          [82.7095, 18.8135],
        ],
      ],
    };
    expect(isParcelWithinBuffer(parcel, line, 200)).toBe(true);
  });

  it("does not flag a distant parcel within a small buffer", () => {
    const parcel: PolygonGeometry = {
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
    };
    expect(isParcelWithinBuffer(parcel, line, 200)).toBe(false);
  });
});

describe("parseStoredGeometry", () => {
  it("returns null when either column is null", () => {
    expect(parseStoredGeometry(null, null)).toBeNull();
    expect(parseStoredGeometry("LineString", null)).toBeNull();
  });

  it("reconstructs a LineString", () => {
    const parsed = parseStoredGeometry(
      "LineString",
      JSON.stringify([
        [82.71, 18.81],
        [82.716, 18.816],
      ])
    );
    expect(parsed).toEqual({
      type: "LineString",
      coordinates: [
        [82.71, 18.81],
        [82.716, 18.816],
      ],
    });
  });
});

describe("computeParcelsWithImpact", () => {
  const line: LineGeometry = {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.71, 18.818],
    ],
  };
  const near: PolygonGeometry = {
    type: "Polygon",
    coordinates: [
      [
        [82.7095, 18.8135],
        [82.7095, 18.8145],
        [82.7105, 18.8145],
        [82.7105, 18.8135],
        [82.7095, 18.8135],
      ],
    ],
  };

  it("marks parcels within the default buffer as withinImpact", () => {
    const result = computeParcelsWithImpact(line, [{ id: "p1", geometry: near }]);
    expect(result[0].withinImpact).toBe(true);
  });

  it("marks every parcel as not-within-impact when there is no alignment", () => {
    const result = computeParcelsWithImpact(null, [{ id: "p1", geometry: near }]);
    expect(result[0].withinImpact).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: FAIL — `Cannot find module './geo'`.

- [ ] **Step 3: Write `src/lib/geo.ts`**

```ts
export type Position = [number, number];

export interface LineGeometry {
  type: "LineString";
  coordinates: Position[];
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}

export type Geometry = LineGeometry | PolygonGeometry;

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(a: Position, b: Position): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

function toLocalMeters(point: Position, origin: Position): { x: number; y: number } {
  const [lng, lat] = point;
  const [lng0, lat0] = origin;
  const x = toRad(lng - lng0) * EARTH_RADIUS_M * Math.cos(toRad(lat0));
  const y = toRad(lat - lat0) * EARTH_RADIUS_M;
  return { x, y };
}

function pointToSegmentDistanceMeters(
  point: Position,
  segA: Position,
  segB: Position
): number {
  const origin = segA;
  const p = toLocalMeters(point, origin);
  const a = { x: 0, y: 0 };
  const b = toLocalMeters(segB, origin);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: a.x + t * abx, y: a.y + t * aby };
  const dx = p.x - closest.x;
  const dy = p.y - closest.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function polygonCentroid(polygon: PolygonGeometry): Position {
  const ring = polygon.coordinates[0];
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const points = closed ? ring.slice(0, -1) : ring;
  const sum = points.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 }
  );
  return [sum.lng / points.length, sum.lat / points.length];
}

export function distancePointToLineMeters(point: Position, line: LineGeometry): number {
  const coords = line.coordinates;
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) return haversineDistanceMeters(point, coords[0]);
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    min = Math.min(min, pointToSegmentDistanceMeters(point, coords[i], coords[i + 1]));
  }
  return min;
}

export function isParcelWithinBuffer(
  parcel: PolygonGeometry,
  alignment: Geometry,
  bufferMeters: number
): boolean {
  const centroid = polygonCentroid(parcel);
  if (alignment.type === "LineString") {
    return distancePointToLineMeters(centroid, alignment) <= bufferMeters;
  }
  const alignmentCentroid = polygonCentroid(alignment);
  return haversineDistanceMeters(centroid, alignmentCentroid) <= bufferMeters;
}

export function parseStoredGeometry(
  geometryType: string | null,
  geometryGeoJson: string | null
): Geometry | null {
  if (!geometryType || !geometryGeoJson) return null;
  const coordinates = JSON.parse(geometryGeoJson);
  if (geometryType === "LineString") return { type: "LineString", coordinates };
  if (geometryType === "Polygon") return { type: "Polygon", coordinates };
  return null;
}

export const IMPACT_BUFFER_METERS = 500;

export function computeParcelsWithImpact<T extends { geometry: PolygonGeometry }>(
  alignment: Geometry | null,
  parcelList: T[]
): (T & { withinImpact: boolean })[] {
  return parcelList.map((p) => ({
    ...p,
    withinImpact: alignment
      ? isParcelWithinBuffer(p.geometry, alignment, IMPACT_BUFFER_METERS)
      : false,
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts
git commit -m "feat: add pure geometry utilities for GIS impact computation"
```

---

### Task 3: Parcels data access layer (tested against in-memory DB)

**Files:**
- Create: `src/db/parcels.ts`
- Test: `src/db/parcels.test.ts`

**Interfaces:**
- Consumes: `parcels` table (Task 1), `ParcelStatus` (Task 1), `PolygonGeometry` (Task 2)
- Produces:
  - `interface Parcel { id: string; projectId: string; village: string; areaHectares: number; status: ParcelStatus; geometry: PolygonGeometry; createdAt: Date }`
  - `interface CreateParcelInput { projectId: string; village: string; areaHectares: number; status: ParcelStatus; geometry: PolygonGeometry }`
  - `async function createParcelWith(database, input): Promise<string>`
  - `async function listParcelsWith(database, projectId): Promise<Parcel[]>` — reconstructs `geometry` from the stored JSON string.
  - Zero-arg convenience wrappers `createParcel`, `listParcels` — used by the API routes (Task 6) and the seed script (Task 7).

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/parcels.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let testDb: ReturnType<typeof drizzle>;

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await testDb.run(sql`
    CREATE TABLE parcels (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, village TEXT NOT NULL,
      area_hectares REAL NOT NULL, status TEXT NOT NULL,
      geometry_geo_json TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
});

const square = {
  type: "Polygon" as const,
  coordinates: [
    [
      [82.71, 18.81],
      [82.71, 18.812],
      [82.712, 18.812],
      [82.712, 18.81],
      [82.71, 18.81],
    ],
  ],
};

describe("parcels data layer", () => {
  it("creates a parcel and reconstructs its geometry on read", async () => {
    const { createParcelWith, listParcelsWith } = await import("./parcels");
    await createParcelWith(testDb, {
      projectId: "p-1",
      village: "Similiguda",
      areaHectares: 1.2,
      status: "NOTIFIED",
      geometry: square,
    });
    const list = await listParcelsWith(testDb, "p-1");
    expect(list).toHaveLength(1);
    expect(list[0].village).toBe("Similiguda");
    expect(list[0].status).toBe("NOTIFIED");
    expect(list[0].geometry).toEqual(square);
  });

  it("scopes parcels to their project", async () => {
    const { createParcelWith, listParcelsWith } = await import("./parcels");
    await createParcelWith(testDb, {
      projectId: "p-1",
      village: "A",
      areaHectares: 1,
      status: "NOTIFIED",
      geometry: square,
    });
    await createParcelWith(testDb, {
      projectId: "p-2",
      village: "B",
      areaHectares: 1,
      status: "NOTIFIED",
      geometry: square,
    });
    const listP1 = await listParcelsWith(testDb, "p-1");
    expect(listP1).toHaveLength(1);
    expect(listP1[0].village).toBe("A");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/parcels.test.ts`
Expected: FAIL — `Cannot find module './parcels'`.

- [ ] **Step 3: Write `src/db/parcels.ts`**

```ts
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { parcels } from "./schema";
import * as schema from "./schema";
import type { ParcelStatus } from "@/lib/parcel-status";
import type { PolygonGeometry } from "@/lib/geo";

type Db = LibSQLDatabase<typeof schema>;

export interface CreateParcelInput {
  projectId: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  geometry: PolygonGeometry;
}

export interface Parcel {
  id: string;
  projectId: string;
  village: string;
  areaHectares: number;
  status: ParcelStatus;
  geometry: PolygonGeometry;
  createdAt: Date;
}

function toParcel(row: {
  id: string;
  projectId: string;
  village: string;
  areaHectares: number;
  status: string;
  geometryGeoJson: string;
  createdAt: Date;
}): Parcel {
  return {
    id: row.id,
    projectId: row.projectId,
    village: row.village,
    areaHectares: row.areaHectares,
    status: row.status as ParcelStatus,
    geometry: { type: "Polygon", coordinates: JSON.parse(row.geometryGeoJson) },
    createdAt: row.createdAt,
  };
}

export async function createParcelWith(
  database: Db,
  input: CreateParcelInput
): Promise<string> {
  const id = crypto.randomUUID();
  await database.insert(parcels).values({
    id,
    projectId: input.projectId,
    village: input.village,
    areaHectares: input.areaHectares,
    status: input.status,
    geometryGeoJson: JSON.stringify(input.geometry.coordinates),
    createdAt: new Date(),
  });
  return id;
}

export async function listParcelsWith(database: Db, projectId: string): Promise<Parcel[]> {
  const rows = await database.select().from(parcels).where(eq(parcels.projectId, projectId));
  return rows.map(toParcel);
}

export const createParcel = (input: CreateParcelInput) => createParcelWith(defaultDb, input);
export const listParcels = (projectId: string) => listParcelsWith(defaultDb, projectId);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/parcels.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/db/parcels.ts src/db/parcels.test.ts
git commit -m "feat: add parcels data access layer"
```

---

### Task 4: Project geometry setter (tested)

**Files:**
- Modify: `src/db/projects.ts`
- Modify: `src/db/projects.test.ts`

**Interfaces:**
- Consumes: `Geometry` type (Task 2)
- Produces: `async function setProjectGeometryWith(database, projectId, geometry: Geometry): Promise<void>` and its `setProjectGeometry` convenience wrapper — used by the geometry API route (Task 6) and the seed script (Task 7).

- [ ] **Step 1: Add the failing test** (append to the existing `describe("projects data layer", ...)` block in `src/db/projects.test.ts`)

```ts
it("stores and retrieves project geometry", async () => {
  const { createProjectWith, setProjectGeometryWith, getProjectWith } = await import(
    "./projects"
  );
  const id = await createProjectWith(testDb, {
    name: "Test Bridge",
    purpose: "Testing",
    state: "Odisha",
    district: "Koraput",
    createdBy: "u-agency-1",
  });
  await setProjectGeometryWith(testDb, id, {
    type: "LineString",
    coordinates: [
      [82.71, 18.81],
      [82.712, 18.815],
    ],
  });
  const project = await getProjectWith(testDb, id);
  expect(project?.geometryType).toBe("LineString");
  expect(JSON.parse(project!.geometryGeoJson!)).toEqual([
    [82.71, 18.81],
    [82.712, 18.815],
  ]);
});
```

Also update `projects.test.ts`'s `beforeEach` block: add the two new columns to the raw `CREATE TABLE projects` statement, since `setProjectGeometryWith`'s `UPDATE` will fail against a table that doesn't have them:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT NOT NULL,
  state TEXT NOT NULL, district TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'DRAFT',
  created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  geometry_type TEXT, geometry_geo_json TEXT
);
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `npx vitest run src/db/projects.test.ts`
Expected: FAIL — `setProjectGeometryWith is not a function`.

- [ ] **Step 3: Implement in `src/db/projects.ts`**

Add `Geometry` to the existing `import { transitionProject, type Action, type Role, type Stage } from "@/lib/workflow";` — no, `Geometry` lives in `geo.ts`, so add a new import line:

```ts
import type { Geometry } from "@/lib/geo";
```

Add after `applyProjectTransitionWith`:

```ts
export async function setProjectGeometryWith(
  database: Db,
  projectId: string,
  geometry: Geometry
): Promise<void> {
  await database
    .update(projects)
    .set({
      geometryType: geometry.type,
      geometryGeoJson: JSON.stringify(geometry.coordinates),
    })
    .where(eq(projects.id, projectId));
}
```

Add alongside the other convenience wrappers:

```ts
export const setProjectGeometry = (projectId: string, geometry: Geometry) =>
  setProjectGeometryWith(defaultDb, projectId, geometry);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/projects.test.ts`
Expected: PASS, 6 tests (5 existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/db/projects.ts src/db/projects.test.ts
git commit -m "feat: add project geometry setter"
```

---

### Task 5: `project:geometry:edit` RBAC permission (tested)

**Files:**
- Modify: `src/lib/rbac.ts`
- Modify: `src/lib/rbac.test.ts`

**Interfaces:**
- Produces: `Permission` gains `"project:geometry:edit"`, granted to `agency` and `district` only (the roles that prepare a proposal's spatial extent — mirrors `project:create`). Used by the geometry and parcel-creation API routes (Task 6).

- [ ] **Step 1: Add the failing tests** (append to the existing `describe("can", ...)` block)

```ts
it("allows agency and district to edit project geometry", () => {
  expect(can("agency", "project:geometry:edit")).toBe(true);
  expect(can("district", "project:geometry:edit")).toBe(true);
});

it("does not allow state, central, or field to edit project geometry", () => {
  expect(can("state", "project:geometry:edit")).toBe(false);
  expect(can("central", "project:geometry:edit")).toBe(false);
  expect(can("field", "project:geometry:edit")).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: FAIL — assertion mismatch (permission not yet granted to anyone).

- [ ] **Step 3: Update `src/lib/rbac.ts`**

```ts
export type Permission =
  | "project:create"
  | "project:view:own"
  | "project:view:all"
  | "project:transition"
  | "document:upload"
  | "project:geometry:edit";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  agency: [
    "project:create",
    "project:view:own",
    "project:transition",
    "document:upload",
    "project:geometry:edit",
  ],
  district: [
    "project:create",
    "project:view:own",
    "project:transition",
    "document:upload",
    "project:geometry:edit",
  ],
  state: ["project:view:all", "project:transition"],
  central: ["project:view:all", "project:transition"],
  field: ["project:view:own", "document:upload"],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: PASS, 9 tests (7 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac.ts src/lib/rbac.test.ts
git commit -m "feat: add project:geometry:edit permission"
```

---

### Task 6: Geometry and parcels API routes

**Files:**
- Create: `src/app/api/projects/[id]/geometry/route.ts`
- Create: `src/app/api/projects/[id]/parcels/route.ts`

**Interfaces:**
- Consumes: `getSession`, `can`, `setProjectGeometry` (Task 4), `createParcel`/`listParcels` (Task 3), `getProject` (existing), `parseStoredGeometry`/`computeParcelsWithImpact` (Task 2), `PARCEL_STATUSES` (Task 1)
- Produces:
  - `PATCH /api/projects/[id]/geometry` — body `{ type: "LineString"|"Polygon", coordinates: [...] }` → `{ ok: true }` (401/403 as elsewhere; 400 for an invalid shape)
  - `GET /api/projects/[id]/parcels` → `{ parcels: (Parcel & { withinImpact: boolean })[] }` — impact computed fresh against the project's current geometry on every call
  - `POST /api/projects/[id]/parcels` — body `{ village, areaHectares, status, geometry: PolygonGeometry }` → `{ id: string }`, 201

- [ ] **Step 1: Write `src/app/api/projects/[id]/geometry/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { setProjectGeometry } from "@/db/projects";
import type { Geometry } from "@/lib/geo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:geometry:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as Partial<Geometry>;
  if (
    (body.type !== "LineString" && body.type !== "Polygon") ||
    !Array.isArray(body.coordinates)
  ) {
    return NextResponse.json({ error: "Invalid geometry" }, { status: 400 });
  }
  await setProjectGeometry(id, body as Geometry);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write `src/app/api/projects/[id]/parcels/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createParcel, listParcels } from "@/db/parcels";
import { getProject } from "@/db/projects";
import {
  computeParcelsWithImpact,
  parseStoredGeometry,
  type PolygonGeometry,
} from "@/lib/geo";
import { PARCEL_STATUSES, type ParcelStatus } from "@/lib/parcel-status";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  const alignment = project
    ? parseStoredGeometry(project.geometryType, project.geometryGeoJson)
    : null;
  const parcelList = await listParcels(id);
  const withImpact = computeParcelsWithImpact(alignment, parcelList);
  return NextResponse.json({ parcels: withImpact });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.role, "project:geometry:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as {
    village?: string;
    areaHectares?: number;
    status?: ParcelStatus;
    geometry?: { type?: string; coordinates?: unknown };
  };
  if (
    !body.village ||
    typeof body.areaHectares !== "number" ||
    !body.status ||
    !PARCEL_STATUSES.includes(body.status) ||
    body.geometry?.type !== "Polygon" ||
    !Array.isArray(body.geometry.coordinates)
  ) {
    return NextResponse.json({ error: "Invalid parcel" }, { status: 400 });
  }
  const parcelId = await createParcel({
    projectId: id,
    village: body.village,
    areaHectares: body.areaHectares,
    status: body.status,
    geometry: {
      type: "Polygon",
      coordinates: body.geometry.coordinates as PolygonGeometry["coordinates"],
    },
  });
  return NextResponse.json({ id: parcelId }, { status: 201 });
}
```

- [ ] **Step 3: Manually verify with the dev server**

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null

echo "--- set geometry ---"
curl -s -i -b /tmp/c.txt -X PATCH http://localhost:3000/api/projects/p-demo-bridge-1/geometry \
  -H "Content-Type: application/json" \
  -d '{"type":"LineString","coordinates":[[82.71,18.81],[82.716,18.816]]}'

echo "--- create a parcel near the line ---"
curl -s -i -b /tmp/c.txt -X POST http://localhost:3000/api/projects/p-demo-bridge-1/parcels \
  -H "Content-Type: application/json" \
  -d '{"village":"Test Village","areaHectares":1.5,"status":"NOTIFIED","geometry":{"type":"Polygon","coordinates":[[[82.7115,18.8125],[82.7115,18.8135],[82.7125,18.8135],[82.7125,18.8125],[82.7115,18.8125]]]}}'

echo "--- list parcels with computed impact ---"
curl -s -b /tmp/c.txt http://localhost:3000/api/projects/p-demo-bridge-1/parcels
```

Expected: geometry PATCH returns `200 {"ok":true}`; parcel POST returns `201` with an id; the list response includes `"withinImpact":true` for the parcel near the line.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/projects/[id]/geometry" "src/app/api/projects/[id]/parcels"
git commit -m "feat: add geometry and parcels API routes with computed impact"
```

---

### Task 7: Seed alignment and demo parcels

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `setProjectGeometry` (Task 4), `createParcel` (Task 3)
- Produces: the seeded demo project now has a real `LineString` alignment and 3 parcels (2 within the impact buffer, 1 outside it) — so the map has real, meaningfully-differentiated data on first load.

- [ ] **Step 1: Add to `src/db/seed.ts`**

Add imports:

```ts
import { setProjectGeometry } from "./projects";
import { createParcel } from "./parcels";
import type { PolygonGeometry } from "@/lib/geo";
import type { ParcelStatus } from "@/lib/parcel-status";
```

Add before the final `console.log` line in `main()`:

```ts
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
```

- [ ] **Step 2: Re-seed and verify**

```bash
lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
rm -f local.db local.db-*
rm -rf uploads
npm run db:push
npm run db:seed
```

Expected: `Seed complete: 5 demo users, 1 demo project.` with no errors. Verify with a throwaway script (delete after running):

```ts
// scratch-verify.ts
import { listParcels } from "./src/db/parcels";
import { getProject } from "./src/db/projects";
import { parseStoredGeometry, computeParcelsWithImpact } from "./src/lib/geo";
async function main() {
  const project = await getProject("p-demo-bridge-1");
  const alignment = parseStoredGeometry(project!.geometryType, project!.geometryGeoJson);
  const parcels = await listParcels("p-demo-bridge-1");
  console.log(JSON.stringify(computeParcelsWithImpact(alignment, parcels).map((p) => [p.village, p.withinImpact])));
}
main();
```

Run: `npx tsx scratch-verify.ts`
Expected: `[["Similiguda",true],["Kotpad",true],["Boriguma",false]]`. Delete `scratch-verify.ts` afterward.

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: seed alignment and demo parcels for the sample project"
```

---

### Task 8: Map UI on the project detail page

**Files:**
- Create: `src/components/project-map.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`
- Modify: `package.json` (new dependency)

**Interfaces:**
- Consumes: `maplibre-gl` (new dependency), `Geometry`/`PolygonGeometry` (Task 2), `listParcels` (Task 3), `parseStoredGeometry`/`computeParcelsWithImpact` (Task 2)
- Produces: a "Map" section on the project detail page rendering the alignment and every parcel, color-coded by `withinImpact`, plus a one-line summary stat ("N of M parcels within the 500m impact buffer").

**Verification limitation (see plan header):** no browser tooling this session. Steps 3–4 verify the data plumbing only. Step 5 is an explicit ask for the user to confirm the map actually renders.

- [ ] **Step 1: Install the dependency**

```bash
npm install maplibre-gl
```

- [ ] **Step 2: Write `src/components/project-map.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geometry, PolygonGeometry } from "@/lib/geo";

interface ParcelFeature {
  id: string;
  village: string;
  status: string;
  areaHectares: number;
  withinImpact: boolean;
  geometry: PolygonGeometry;
}

export function ProjectMap({
  alignment,
  parcels,
}: {
  alignment: Geometry | null;
  parcels: ParcelFeature[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] =
      alignment?.type === "LineString"
        ? alignment.coordinates[0]
        : parcels[0]
          ? parcels[0].geometry.coordinates[0][0]
          : [82.71, 18.81];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center,
      zoom: 12,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (alignment) {
        map.addSource("alignment", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: alignment },
        });
        map.addLayer({
          id: "alignment-line",
          type: "line",
          source: "alignment",
          paint: { "line-color": "#2563eb", "line-width": 4 },
        });
      }

      map.addSource("parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: parcels.map((p) => ({
            type: "Feature",
            properties: {
              village: p.village,
              status: p.status,
              areaHectares: p.areaHectares,
              withinImpact: p.withinImpact,
            },
            geometry: p.geometry,
          })),
        },
      });
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": ["case", ["get", "withinImpact"], "#f97316", "#22c55e"],
          "fill-opacity": 0.5,
        },
      });
      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: { "line-color": "#1f2937", "line-width": 1 },
      });

      map.on("click", "parcels-fill", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as {
          village: string;
          status: string;
          areaHectares: number;
          withinImpact: boolean;
        };
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${props.village}</strong><br/>Status: ${props.status}<br/>Area: ${props.areaHectares} ha<br/>${
              props.withinImpact ? "Within impact buffer" : "Outside impact buffer"
            }`
          )
          .addTo(map);
      });
      map.on("mouseenter", "parcels-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [alignment, parcels]);

  return (
    <div
      ref={containerRef}
      className="h-96 w-full rounded-md border border-gray-200"
    />
  );
}
```

- [ ] **Step 3: Modify `src/app/(dashboard)/projects/[id]/page.tsx`**

Add imports:

```ts
import { listParcels } from "@/db/parcels";
import { parseStoredGeometry, computeParcelsWithImpact, IMPACT_BUFFER_METERS } from "@/lib/geo";
import { ProjectMap } from "@/components/project-map";
```

Add alongside the existing `docs`/`canUpload` fetches:

```ts
  const alignment = parseStoredGeometry(project.geometryType, project.geometryGeoJson);
  const parcelList = await listParcels(id);
  const parcelsWithImpact = computeParcelsWithImpact(alignment, parcelList);
```

Add this section (placing it after "Actions" and before "History" reads well, but exact position doesn't matter):

```tsx
      <div>
        <h3 className="mb-2 text-sm font-medium">Map</h3>
        <ProjectMap alignment={alignment} parcels={parcelsWithImpact} />
        <p className="mt-2 text-xs text-gray-500">
          {parcelsWithImpact.filter((p) => p.withinImpact).length} of{" "}
          {parcelsWithImpact.length} parcels within the {IMPACT_BUFFER_METERS}m impact
          buffer of the project alignment.
        </p>
      </div>
```

- [ ] **Step 4: Verify data plumbing (not visual rendering) via curl**

```bash
lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
npm run dev > /tmp/nextdev-gis.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 > /tmp/detail-gis.html
grep -o "of 3 parcels within the 500m impact buffer" /tmp/detail-gis.html
grep -o "Similiguda" /tmp/detail-gis.html
grep -aiE "error" /tmp/nextdev-gis.log | grep -v "Warning: Next.js ignored package-lock"
```

Expected: the summary-stat text and at least one seeded village name are present in the server-rendered payload (confirming the geometry/parcel data reached the client component as props), and no server-side errors. This does **not** confirm the WebGL canvas actually paints — only that the correct data was handed to it.

- [ ] **Step 5: Run the type checker**

Turbopack's dev server transpiles without full type-checking, so a `maplibre-gl` type mismatch wouldn't surface in Step 4. Catch it explicitly:

```bash
npx tsc --noEmit
```

Expected: no errors. If `maplibre-gl`'s bundled GeoJSON types conflict with this project's `Geometry`/`PolygonGeometry` types, fix inline (likely a cast at the `map.addSource` call sites) before proceeding.

- [ ] **Step 6: Ask the user to visually confirm**

Report to the user: "Data plumbing verified — the map component receives the correct alignment and parcel geometry, and the page renders with no server errors. I cannot confirm the MapLibre canvas actually paints without browser tooling. Please open `http://localhost:3000/projects/p-demo-bridge-1` (as District or Agency) and confirm: a map appears with a blue line and three colored parcel polygons (two orange/within-buffer, one green/outside), pan/zoom works, and clicking a parcel shows a popup." Do not mark this task complete in the user-facing sense until they confirm — commit the code regardless (Step 7), since committing and "confirmed working" are separate concerns.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/components/project-map.tsx "src/app/(dashboard)/projects/[id]/page.tsx"
git commit -m "feat: add MapLibre map with alignment and parcel impact overlay"
```

---

## What this plan does not cover

- Editing geometry/parcels through a UI (this plan only wires the API + seed data; a "draw the alignment" or "add a parcel" form is future work)
- Before/after imagery slider, elevation profile, or the flagship 3D visualization (spec 6.3, all deferred)
- QR codes per parcel, geo-tagged field photos (spec 6.3, deferred)
- Swapping SQLite/text-column geometry storage for PostGIS, if Postgres is ever provisioned
