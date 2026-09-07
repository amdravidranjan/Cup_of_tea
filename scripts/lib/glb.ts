/**
 * A minimal glTF-binary writer.
 *
 * Written by hand rather than using three's GLTFExporter, which needs a DOM
 * (Blob, FileReader, a canvas for textures) and does not run in a plain Node
 * build script. Everything here is untextured metallic-roughness material, so
 * a few hundred lines of buffer packing is the whole job.
 *
 * Geometry convention matches `three-model-layer.ts`, which places models on
 * the map: **X along the asset, Y across it, Z up, in metres, with z = 0 at
 * ground level.** Getting that wrong lays the bridge on its side.
 */

import { writeFileSync } from "node:fs";

export interface Material {
  name: string;
  /** Linear RGB, 0-1. */
  color: [number, number, number];
  metallic: number;
  roughness: number;
}

type Vec3 = [number, number, number];

interface Group {
  material: Material;
  positions: number[];
  normals: number[];
  indices: number[];
}

/** Accumulates triangles per material, then packs them into one GLB. */
export class MeshBuilder {
  private groups = new Map<string, Group>();

  private group(material: Material): Group {
    let group = this.groups.get(material.name);
    if (!group) {
      group = { material, positions: [], normals: [], indices: [] };
      this.groups.set(material.name, group);
    }
    return group;
  }

  /** A triangle, with a flat normal derived from its winding. */
  triangle(material: Material, a: Vec3, b: Vec3, c: Vec3): void {
    const group = this.group(material);
    const base = group.positions.length / 3;
    const n = normalOf(a, b, c);
    for (const v of [a, b, c]) {
      group.positions.push(v[0], v[1], v[2]);
      group.normals.push(n[0], n[1], n[2]);
    }
    group.indices.push(base, base + 1, base + 2);
  }

  /** A planar quad, wound a→b→c→d. */
  quad(material: Material, a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
    this.triangle(material, a, b, c);
    this.triangle(material, a, c, d);
  }

  /**
   * An axis-aligned box given by its centre and its full extents.
   *
   * Flat-shaded per face, which is what concrete and steel plate should look
   * like — smoothing a box's corners would make a pier cap look inflated.
   */
  box(material: Material, centre: Vec3, size: Vec3): void {
    const [cx, cy, cz] = centre;
    const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2];
    const x0 = cx - hx, x1 = cx + hx;
    const y0 = cy - hy, y1 = cy + hy;
    const z0 = cz - hz, z1 = cz + hz;

    this.quad(material, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); // top
    this.quad(material, [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]); // bottom
    this.quad(material, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]); // -Y
    this.quad(material, [x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]); // +Y
    this.quad(material, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]); // +X
    this.quad(material, [x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]); // -X
  }

  /**
   * A box tapered along X — wider at one end than the other. Used for wing
   * walls and embankment sides, which are never parallel-sided.
   */
  taperedBox(
    material: Material,
    centre: Vec3,
    length: number,
    widthAtMinX: number,
    widthAtMaxX: number,
    heightAtMinX: number,
    heightAtMaxX: number
  ): void {
    const [cx, cy, cz] = centre;
    const x0 = cx - length / 2, x1 = cx + length / 2;
    const w0 = widthAtMinX / 2, w1 = widthAtMaxX / 2;
    const h0 = heightAtMinX, h1 = heightAtMaxX;

    const a0: Vec3 = [x0, cy - w0, cz], b0: Vec3 = [x0, cy + w0, cz];
    const a1: Vec3 = [x1, cy - w1, cz], b1: Vec3 = [x1, cy + w1, cz];
    const a0t: Vec3 = [x0, cy - w0, cz + h0], b0t: Vec3 = [x0, cy + w0, cz + h0];
    const a1t: Vec3 = [x1, cy - w1, cz + h1], b1t: Vec3 = [x1, cy + w1, cz + h1];

    this.quad(material, a0t, a1t, b1t, b0t);
    this.quad(material, b0, b1, a1, a0);
    this.quad(material, a0, a1, a1t, a0t);
    this.quad(material, b1, b0, b0t, b1t);
    this.quad(material, a1, b1, b1t, a1t);
    this.quad(material, b0, a0, a0t, b0t);
  }

  /**
   * A cylinder along one axis.
   *
   * Smooth-shaded around the barrel (normals point radially), flat on the
   * caps — so a pier column reads as round rather than faceted.
   */
  cylinder(
    material: Material,
    centre: Vec3,
    radius: number,
    length: number,
    axis: "x" | "y" | "z",
    segments = 20,
    radiusTop = radius
  ): void {
    const group = this.group(material);
    const half = length / 2;

    const place = (angle: number, along: number, r: number): Vec3 => {
      const c = Math.cos(angle) * r;
      const s = Math.sin(angle) * r;
      if (axis === "x") return [centre[0] + along, centre[1] + c, centre[2] + s];
      if (axis === "y") return [centre[0] + c, centre[1] + along, centre[2] + s];
      return [centre[0] + c, centre[1] + s, centre[2] + along];
    };
    const radial = (angle: number): Vec3 => {
      const c = Math.cos(angle), s = Math.sin(angle);
      if (axis === "x") return [0, c, s];
      if (axis === "y") return [c, 0, s];
      return [c, s, 0];
    };

    const base = group.positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const n = radial(angle);
      const bottom = place(angle, -half, radius);
      const top = place(angle, half, radiusTop);
      group.positions.push(bottom[0], bottom[1], bottom[2]);
      group.normals.push(n[0], n[1], n[2]);
      group.positions.push(top[0], top[1], top[2]);
      group.normals.push(n[0], n[1], n[2]);
    }
    for (let i = 0; i < segments; i++) {
      const a = base + i * 2;
      group.indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }

    // Caps, as fans with flat normals.
    for (const [along, r, sign] of [
      [-half, radius, -1],
      [half, radiusTop, 1],
    ] as const) {
      const centrePoint = place(0, along, 0);
      const capBase = group.positions.length / 3;
      const n = radial(0);
      const capNormal: Vec3 =
        axis === "x" ? [sign, 0, 0] : axis === "y" ? [0, sign, 0] : [0, 0, sign];
      void n;
      group.positions.push(centrePoint[0], centrePoint[1], centrePoint[2]);
      group.normals.push(capNormal[0], capNormal[1], capNormal[2]);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const p = place(angle, along, r);
        group.positions.push(p[0], p[1], p[2]);
        group.normals.push(capNormal[0], capNormal[1], capNormal[2]);
      }
      for (let i = 0; i < segments; i++) {
        if (sign > 0) group.indices.push(capBase, capBase + 1 + i, capBase + 2 + i);
        else group.indices.push(capBase, capBase + 2 + i, capBase + 1 + i);
      }
    }
  }

  /**
   * A straight member between two points, of the given cross-section.
   *
   * This is what a diagonal brace or a stay actually is. Approximating one by
   * stepping little axis-aligned boxes along its length both looks wrong up
   * close and costs an order of magnitude more triangles than the single
   * oriented box it should be.
   */
  beam(material: Material, from: Vec3, to: Vec3, width: number, height: number): void {
    const dir: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
    const length = Math.hypot(dir[0], dir[1], dir[2]);
    if (length < 1e-6) return;
    const u: Vec3 = [dir[0] / length, dir[1] / length, dir[2] / length];

    // Any reference not parallel to the member gives a stable frame; Z is
    // the natural choice except for a member that is itself vertical.
    const reference: Vec3 = Math.abs(u[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1];
    const w = normalize(cross(u, reference));
    const v = normalize(cross(w, u));

    const hw = width / 2;
    const hh = height / 2;
    const corner = (end: Vec3, sw: number, sv: number): Vec3 => [
      end[0] + w[0] * hw * sw + v[0] * hh * sv,
      end[1] + w[1] * hw * sw + v[1] * hh * sv,
      end[2] + w[2] * hw * sw + v[2] * hh * sv,
    ];

    const a0 = corner(from, -1, -1), b0 = corner(from, 1, -1);
    const c0 = corner(from, 1, 1), d0 = corner(from, -1, 1);
    const a1 = corner(to, -1, -1), b1 = corner(to, 1, -1);
    const c1 = corner(to, 1, 1), d1 = corner(to, -1, 1);

    this.quad(material, a1, b1, c1, d1);
    this.quad(material, d0, c0, b0, a0);
    this.quad(material, a0, b0, b1, a1);
    this.quad(material, c0, d0, d1, c1);
    this.quad(material, b0, c0, c1, b1);
    this.quad(material, d0, a0, a1, d1);
  }

  /**
   * A horizontal prism with a triangular plan — the cutwater nose that lets a
   * river pier part the current instead of standing broadside to it.
   */
  cutwater(material: Material, centre: Vec3, halfWidth: number, nose: number, height: number, direction: 1 | -1): void {
    const [cx, cy, cz] = centre;
    const tip: Vec3 = [cx + direction * nose, cy, cz];
    const left: Vec3 = [cx, cy - halfWidth, cz];
    const right: Vec3 = [cx, cy + halfWidth, cz];
    const tipT: Vec3 = [tip[0], tip[1], cz + height];
    const leftT: Vec3 = [left[0], left[1], cz + height];
    const rightT: Vec3 = [right[0], right[1], cz + height];

    if (direction > 0) {
      this.triangle(material, leftT, tipT, rightT);
      this.triangle(material, left, right, tip);
      this.quad(material, left, tip, tipT, leftT);
      this.quad(material, tip, right, rightT, tipT);
    } else {
      this.triangle(material, rightT, tipT, leftT);
      this.triangle(material, right, left, tip);
      this.quad(material, tip, left, leftT, tipT);
      this.quad(material, right, tip, tipT, rightT);
    }
  }

  get triangleCount(): number {
    let total = 0;
    for (const g of this.groups.values()) total += g.indices.length / 3;
    return total;
  }

  get materialCount(): number {
    return this.groups.size;
  }

  /** Packs everything into a .glb and writes it. */
  writeGlb(path: string, sceneName: string): void {
    const buffers: Buffer[] = [];
    const bufferViews: object[] = [];
    const accessors: object[] = [];
    const materials: object[] = [];
    const meshPrimitives: object[] = [];
    let offset = 0;

    const pushView = (data: Buffer, target: number): number => {
      // Accessor offsets must be four-byte aligned.
      const padding = (4 - (offset % 4)) % 4;
      if (padding) {
        buffers.push(Buffer.alloc(padding));
        offset += padding;
      }
      buffers.push(data);
      bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length, target });
      offset += data.length;
      return bufferViews.length - 1;
    };

    for (const group of this.groups.values()) {
      const positions = new Float32Array(group.positions);
      const normals = new Float32Array(group.normals);
      const indices = new Uint32Array(group.indices);

      const positionView = pushView(Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength), 34962);
      const normalView = pushView(Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength), 34962);
      const indexView = pushView(Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength), 34963);

      const min: Vec3 = [Infinity, Infinity, Infinity];
      const max: Vec3 = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < group.positions.length; i += 3) {
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], group.positions[i + axis]);
          max[axis] = Math.max(max[axis], group.positions[i + axis]);
        }
      }

      accessors.push({
        bufferView: positionView, componentType: 5126, count: positions.length / 3,
        type: "VEC3", min, max,
      });
      accessors.push({
        bufferView: normalView, componentType: 5126, count: normals.length / 3, type: "VEC3",
      });
      accessors.push({
        bufferView: indexView, componentType: 5125, count: indices.length, type: "SCALAR",
      });

      const m = group.material;
      materials.push({
        name: m.name,
        pbrMetallicRoughness: {
          baseColorFactor: [...m.color, 1],
          metallicFactor: m.metallic,
          roughnessFactor: m.roughness,
        },
        doubleSided: false,
      });

      meshPrimitives.push({
        attributes: { POSITION: accessors.length - 3, NORMAL: accessors.length - 2 },
        indices: accessors.length - 1,
        material: materials.length - 1,
      });
    }

    const binary = Buffer.concat(buffers);
    const gltf = {
      asset: { version: "2.0", generator: "NILAMS flagship model builder" },
      scene: 0,
      scenes: [{ name: sceneName, nodes: [0] }],
      nodes: [{ name: sceneName, mesh: 0 }],
      meshes: [{ name: sceneName, primitives: meshPrimitives }],
      materials,
      accessors,
      bufferViews,
      buffers: [{ byteLength: binary.length }],
    };

    let json = Buffer.from(JSON.stringify(gltf), "utf-8");
    const jsonPad = (4 - (json.length % 4)) % 4;
    if (jsonPad) json = Buffer.concat([json, Buffer.alloc(jsonPad, 0x20)]);
    const binPad = (4 - (binary.length % 4)) % 4;
    const bin = binPad ? Buffer.concat([binary, Buffer.alloc(binPad)]) : binary;

    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0); // "glTF"
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);

    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(json.length, 0);
    jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(bin.length, 0);
    binHeader.writeUInt32LE(0x004e4942, 4); // "BIN"

    writeFileSync(path, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
  }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function normalOf(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}
