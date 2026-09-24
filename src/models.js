import * as THREE from 'three';

// A small, hand-built hard-surface kit. All objects use metres and +Y is up.
const M = {
  stone: new THREE.MeshStandardMaterial({ color: 0xa58459, roughness: 0.94 }),
  stoneLight: new THREE.MeshStandardMaterial({ color: 0xc0a477, roughness: 0.98 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x786246, roughness: 0.98 }),
  stoneEdge: new THREE.MeshStandardMaterial({ color: 0x9b805a, roughness: 0.88 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x131b1a, roughness: 0.86 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x474a40, metalness: 0.6, roughness: 0.58 }),
  metalLight: new THREE.MeshStandardMaterial({ color: 0x8b8b71, metalness: 0.72, roughness: 0.43 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x796043, metalness: 0.5, roughness: 0.74 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x6f6a51, side: THREE.DoubleSide, roughness: 1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x030706, roughness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x3d6667, metalness: 0.7, roughness: 0.16, clearcoat: 1, transparent: true, opacity: 0.91 }),
  blade: new THREE.MeshPhysicalMaterial({ color: 0x3c4946, metalness: 0.64, roughness: 0.48, transparent: true, opacity: 0.64, side: THREE.DoubleSide, depthWrite: false }),
  blue: new THREE.MeshStandardMaterial({ color: 0x7bccdd, emissive: 0x419fbc, emissiveIntensity: 1.3, roughness: 0.4 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xffb044, emissive: 0xff7f23, emissiveIntensity: 1.4, roughness: 0.45 }),
  spice: new THREE.MeshStandardMaterial({ color: 0xf6a535, emissive: 0xc64b0b, emissiveIntensity: 0.55, metalness: 0.32, roughness: 0.38 }),
  worm: new THREE.MeshStandardMaterial({ color: 0x786245, roughness: 0.95 }),
  wormRidge: new THREE.MeshStandardMaterial({ color: 0x9b845e, roughness: 0.94 }),
  wormInside: new THREE.MeshStandardMaterial({ color: 0x29221c, side: THREE.DoubleSide, roughness: 1 }),
  tooth: new THREE.MeshStandardMaterial({ color: 0xc9b78c, roughness: 0.76 }),
};

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const FORWARD = V(0, 0, 1);
const TAU = Math.PI * 2;

function seeded(seed) {
  let s = seed | 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
}

function cylinder(parent, top, bottom, height, material, x = 0, y = 0, z = 0, sides = 12) {
  return mesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), material, x, y, z);
}

function sphere(parent, radius, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = mesh(parent, new THREE.SphereGeometry(radius, 12, 8), material, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function rod(parent, a, b, radius, material = M.metal, sides = 8) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const m = cylinder(parent, radius, radius, direction.length(), material, 0, 0, 0, sides);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, direction.normalize());
  return m;
}

function torus(parent, major, minor, material, x = 0, y = 0, z = 0, sides = 32) {
  return mesh(parent, new THREE.TorusGeometry(major, minor, 6, sides), material, x, y, z);
}

function bevelBox(parent, w, h, d, material, x = 0, y = 0, z = 0, bevel = 0.06) {
  const b = Math.min(bevel, w / 5, h / 5, d / 5);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + b, -h / 2);
  shape.lineTo(w / 2 - b, -h / 2);
  shape.lineTo(w / 2, -h / 2 + b);
  shape.lineTo(w / 2, h / 2 - b);
  shape.lineTo(w / 2 - b, h / 2);
  shape.lineTo(-w / 2 + b, h / 2);
  shape.lineTo(-w / 2, h / 2 - b);
  shape.lineTo(-w / 2, -h / 2 + b);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - b * 2, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: b, bevelThickness: b });
  g.translate(0, 0, -d / 2 + b);
  return mesh(parent, g, material, x, y, z);
}

function surface(parent, vertices, triangles, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(triangles);
  geo.computeVertexNormals();
  return mesh(parent, geo, material);
}

function pipe(parent, points, radius, material = M.metal) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, radius, 6, false), material);
}

// Keep tiny bolts and mechanical ribs visually rich without paying a draw call for each.
// Animated pivots are explicitly retained; the geometry beneath each pivot is batched.
function batchStatics(group, excluded = []) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const skip = new Set(excluded);
  const buckets = new Map();
  const visit = node => {
    if (skip.has(node)) return;
    if (node.isMesh && !Array.isArray(node.material)) {
      let bucket = buckets.get(node.material);
      if (!bucket) {
        bucket = { meshes: [], count: 0, positions: [], normals: [], uvs: [] };
        buckets.set(node.material, bucket);
      }
      const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld));
      const count = geometry.attributes.position.count;
      bucket.positions.push(geometry.attributes.position.array.slice());
      bucket.normals.push(geometry.attributes.normal?.array.slice() ?? new Float32Array(count * 3));
      bucket.uvs.push(geometry.attributes.uv?.array.slice() ?? new Float32Array(count * 2));
      bucket.count += count;
      bucket.meshes.push(node);
      geometry.dispose();
    }
    node.children.forEach(visit);
  };
  group.children.forEach(visit);
  for (const [material, bucket] of buckets) {
    if (bucket.meshes.length < 2) continue;
    const geometry = new THREE.BufferGeometry();
    for (const [name, chunks, stride] of [['position', bucket.positions, 3], ['normal', bucket.normals, 3], ['uv', bucket.uvs, 2]]) {
      const data = new Float32Array(bucket.count * stride);
      let offset = 0;
      chunks.forEach(chunk => { data.set(chunk, offset); offset += chunk.length; });
      geometry.setAttribute(name, new THREE.BufferAttribute(data, stride));
    }
    for (const source of bucket.meshes) {
      source.removeFromParent();
      source.geometry.dispose();
    }
    mesh(group, geometry, material);
  }
}

function vent(parent, width, height, x, y, z, rotation = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotation;
  parent.add(g);
  bevelBox(g, width + 0.12, height + 0.12, 0.1, M.stoneEdge);
  box(g, width, height, 0.115, M.dark);
  const count = Math.max(3, Math.floor(height / 0.105));
  for (let i = 0; i < count; i++) {
    const slat = box(g, width - 0.05, 0.035, 0.1, M.metal, 0, -height / 2 + 0.055 + (height - 0.11) * i / (count - 1), 0.07);
    slat.rotation.x = -0.2;
  }
  return g;
}

export function createOutpost() {
  const g = new THREE.Group();
  g.name = 'Sietch relay station';
  // Heavy, battered octagonal shell, stepped foundations and deep cooling roof.
  const foundation = cylinder(g, 3.65, 4.15, 0.55, M.stoneDark, 0, 0.22, 0, 8);
  foundation.rotation.y = Math.PI / 8;
  const main = cylinder(g, 3.12, 3.65, 4.35, M.stone, 0, 2.55, 0, 8);
  main.rotation.y = Math.PI / 8;
  const lowerDrum = cylinder(g, 3.58, 3.81, 1.18, M.stone, 0, 0.98, 0, 8);
  lowerDrum.rotation.y = Math.PI / 8;
  const lowerLip = cylinder(g, 3.59, 3.66, 0.11, M.stoneDark, 0, 1.6, 0, 8);
  lowerLip.rotation.y = Math.PI / 8;
  for (const [height, radius] of [[2.65, 3.425], [3.72, 3.29]]) {
    const seam = cylinder(g, radius - 0.008, radius + 0.015, 0.038, M.stoneDark, 0, height, 0, 8);
    seam.rotation.y = Math.PI / 8;
  }
  const collar = cylinder(g, 3.22, 3.36, 0.24, M.stoneEdge, 0, 4.66, 0, 8);
  collar.rotation.y = Math.PI / 8;
  const cap = cylinder(g, 2.8, 3.17, 0.37, M.stoneLight, 0, 4.95, 0, 8);
  cap.rotation.y = Math.PI / 8;
  cylinder(g, 1.18, 1.48, 0.64, M.stoneDark, -0.45, 5.42, -0.2, 12);
  cylinder(g, 1.28, 1.3, 0.16, M.metal, -0.45, 5.79, -0.2, 16);
  cylinder(g, 1.03, 1.14, 0.12, M.dark, -0.45, 5.9, -0.2, 16);
  for (let i = 0; i < 10; i++) {
    const a = TAU * i / 10;
    const slat = box(g, 0.11, 0.38, 0.44, M.metalLight, -0.45 + Math.sin(a) * 1.12, 5.42, -0.2 + Math.cos(a) * 1.12);
    slat.rotation.y = a;
  }

  // Radial buttresses leave the central approach readable from an isometric camera.
  for (const i of [-3, -2, -1, 1, 2, 3, 4]) {
    const a = i * Math.PI / 4;
    const wall = new THREE.Group();
    wall.position.set(Math.sin(a) * 3.14, 0, Math.cos(a) * 3.14);
    wall.rotation.y = a;
    g.add(wall);
    bevelBox(wall, 0.4, 3.45, 0.58, M.stoneEdge, 0, 2.06, 0.17, 0.085);
    bevelBox(wall, 0.64, 0.65, 0.8, M.stoneDark, 0, 0.62, 0.18, 0.085);
    box(wall, 0.21, 2.53, 0.045, M.stoneDark, 0, 2.14, 0.493);
    if (i !== 4) vent(wall, 0.62, 0.59, 0.67, 3.38, -0.025);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    const band = new THREE.Group();
    band.position.set(Math.sin(a) * 3.2, 0, Math.cos(a) * 3.2);
    band.rotation.y = a;
    g.add(band);
    box(band, 1.83, 0.075, 0.08, M.stoneDark, 0, 3.93, 0);
    if (i !== 0 && i !== 7) {
      bevelBox(band, 1.02, 1.18, 0.11, M.stoneLight, 0.08, 2.3, 0.27, 0.04);
      box(band, 0.055, 1.0, 0.13, M.stoneDark, -0.27, 2.3, 0.28);
    }
  }

  // A thick trapezoidal vestibule creates a dark recess and a strong entry silhouette.
  bevelBox(g, 3.32, 2.88, 1.66, M.stoneDark, 0, 1.65, 3.01, 0.16);
  bevelBox(g, 2.83, 2.56, 0.3, M.stoneLight, 0, 1.63, 3.88, 0.12);
  const door = new THREE.Shape();
  door.moveTo(-0.87, 0); door.lineTo(0.87, 0); door.lineTo(0.87, 1.78);
  door.lineTo(0.59, 2.17); door.lineTo(-0.59, 2.17); door.lineTo(-0.87, 1.78); door.closePath();
  mesh(g, new THREE.ShapeGeometry(door), M.black, 0, 0.35, 4.045);
  box(g, 0.06, 1.83, 0.04, M.metalLight, -0.8, 1.31, 4.066);
  box(g, 0.06, 1.83, 0.04, M.metalLight, 0.8, 1.31, 4.066);
  box(g, 0.038, 1.87, 0.035, M.dark, 0, 1.31, 4.07);
  bevelBox(g, 2.35, 0.23, 0.65, M.stoneEdge, 0, 2.97, 3.77);
  box(g, 0.61, 0.048, 0.04, M.amber, 0, 2.93, 4.115);
  bevelBox(g, 0.22, 0.37, 0.11, M.metal, 1.13, 1.49, 4.06, 0.025);
  box(g, 0.1, 0.12, 0.025, M.blue, 1.13, 1.53, 4.13);
  for (let i = 0; i < 3; i++) {
    bevelBox(g, 2.82 + i * 0.17, 0.17, 0.6, i === 2 ? M.stoneDark : M.stoneEdge, 0, 0.3 - i * 0.09, 4.1 + i * 0.4, 0.035);
  }

  // Service hardware: fin banks, exposed elbow pipes, tanks and panel fasteners.
  const service = new THREE.Group();
  service.position.set(-3.3, 0, 0.27);
  service.rotation.y = -0.42;
  g.add(service);
  bevelBox(service, 1.24, 2.5, 1.14, M.metal, 0, 1.68, 0, 0.08);
  for (let i = 0; i < 8; i++) box(service, 1.45, 0.09, 1.37, M.stoneDark, 0, 0.67 + i * 0.28, 0);
  for (const dx of [-0.4, 0.4]) pipe(g, [V(-2.55 + dx, 4.87, -0.4), V(-3.1 + dx, 4.63, -0.4), V(-3.61 + dx, 3.1, -0.4), V(-3.61 + dx, 2.6, 0.1)], 0.08, M.rust);
  for (let i = 0; i < 2; i++) {
    const x = 2.6 + i * 0.82;
    cylinder(g, 0.4, 0.43, 1.78, M.metal, x, 1.15, 2.23);
    sphere(g, 0.4, M.metal, x, 2.04, 2.23, 1, 0.5, 1);
    for (const y of [0.47, 1.49, 1.97]) {
      const ring = torus(g, 0.422, 0.035, M.rust, x, y, 2.23, 20);
      ring.rotation.x = Math.PI / 2;
    }
    box(g, 0.1, 0.33, 0.038, M.stoneLight, x, 1.16, 2.653);
    pipe(g, [V(x, 2.22, 2.23), V(x, 2.48, 2.17), V(x - 0.2, 2.48, 1.8)], 0.05);
  }
  vent(g, 0.94, 0.75, 1.95, 3.34, 2.8, 0.42);
  const utility = bevelBox(g, 0.63, 0.8, 0.21, M.metal, -1.93, 1.12, 3.36, 0.04);
  utility.rotation.y = -0.3;
  for (let i = 0; i < 4; i++) cylinder(g, 0.07, 0.07, 0.18, M.metalLight, -2.15 + i * 0.14, 1.71, 3.16);

  // Roof antenna, cup anemometer and a tiny signal beacon.
  cylinder(g, 0.08, 0.12, 1.52, M.metal, 1.49, 5.55, -1.34, 8);
  rod(g, V(1.49, 6.12, -1.34), V(2.12, 6.12, -1.34), 0.04);
  cylinder(g, 0.06, 0.09, 0.19, M.amber, 1.49, 6.39, -1.34, 8);
  for (const z of [-1.62, -1.07]) rod(g, V(1.17, 5.35, z), V(1.8, 5.35, z), 0.027, M.metalLight);
  rod(g, V(1.49, 5.24, -1.34), V(2.37, 4.98, -1.84), 0.018, M.rust);
  const dish = mesh(g, new THREE.SphereGeometry(0.58, 16, 8, 0, TAU, 0, 0.64), M.metalLight, -1.66, 5.23, -1.15);
  dish.rotation.z = -0.6;
  rod(g, V(-1.66, 5.23, -1.15), V(-1.34, 5.85, -1.15), 0.025);

  // Sagging sun cloth over the side yard. Its structural poles are visible underneath.
  const clothVertices = [], clothIndices = [];
  for (let j = 0; j <= 5; j++) {
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, v = j / 5;
      clothVertices.push(-3.3 - u * 2.6, 2.85 - Math.sin(u * Math.PI) * 0.3 - Math.sin(v * Math.PI) * 0.17 - u * 0.2, 1.48 + v * 3.26);
      if (i < 8 && j < 5) { const n = j * 9 + i; clothIndices.push(n, n + 9, n + 1, n + 1, n + 9, n + 10); }
    }
  }
  const canopy = surface(g, clothVertices, clothIndices, M.cloth);
  canopy.name = 'Wind-worn sun canopy';
  for (const z of [1.48, 4.74]) {
    rod(g, V(-5.91, 0, z), V(-5.91, 2.73, z), 0.045, M.rust);
    rod(g, V(-3.3, 2.9, z), V(-5.91, 2.73, z), 0.024, M.metal);
    rod(g, V(-5.91, 2.7, z), V(-6.5, 0.1, z + (z > 3 ? 0.75 : -0.75)), 0.012, M.cloth);
  }
  g.userData = { doorPosition: V(0, 0, 4.6), canopy };
  batchStatics(g, [canopy]);
  return g;
}

function createWing(sign, sweep) {
  const g = new THREE.Group();
  const vertices = [];
  const outline = [[0, -0.14], [1.05, -0.31], [3.8, -0.21 + sweep * 0.55], [6.45, sweep - 0.035], [6.54, sweep + 0.07], [3.5, 0.54 + sweep * 0.55], [0.7, 0.44], [0, 0.15]];
  outline.forEach(([x, z]) => vertices.push(sign * x, 0, z));
  surface(g, vertices, [0, 1, 7, 1, 6, 7, 1, 2, 6, 2, 5, 6, 2, 3, 5, 3, 4, 5], M.blade);
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    rod(g, V(sign * a[0], 0.009, a[1]), V(sign * b[0], 0.009, b[1]), i < 3 ? 0.028 : 0.016, M.metal);
  }
  rod(g, V(0, 0.025, 0), V(sign * 6.48, 0.025, sweep), 0.025, M.metalLight);
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const x = t * 6.45;
    const width = 0.33 * Math.sin(t * Math.PI) + 0.075;
    const z = sweep * t;
    rod(g, V(sign * x, 0.02, z - width * 0.65), V(sign * x, 0.02, z + width), 0.009, M.metal);
    if (i < 8) rod(g, V(sign * x, 0.02, z - width * 0.55), V(sign * (x + 0.64), 0.02, sweep * (t + 0.1) + width * 0.9), 0.006, M.rust);
  }
  bevelBox(g, 1.12, 0.12, 0.29, M.metal, sign * 0.45, -0.025, 0, 0.04);
  g.userData.restRotation = 0;
  return g;
}

export function createOrnithopter() {
  const g = new THREE.Group();
  g.name = 'Four-wing desert ornithopter';
  // Pod sections run along Z, narrowing to an articulated tail.
  const stations = [
    [-3.5, 0.2, 0.23, 1.52], [-2.8, 0.45, 0.4, 1.72], [-1.7, 0.81, 0.6, 1.89],
    [-0.2, 0.9, 0.7, 1.95], [1.15, 0.76, 0.68, 1.89], [2.4, 0.52, 0.43, 1.73], [3.1, 0.18, 0.21, 1.57],
  ];
  const vertices = [], indices = [];
  stations.forEach(([z, rx, ry, y]) => {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + Math.PI / 8;
      vertices.push(Math.cos(a) * rx, y + Math.sin(a) * ry, z);
    }
  });
  for (let s = 0; s < stations.length - 1; s++) for (let i = 0; i < 8; i++) {
    const a = s * 8 + i, b = s * 8 + (i + 1) % 8;
    indices.push(a, b, a + 8, b, b + 8, a + 8);
  }
  surface(g, vertices, indices, M.metal);
  bevelBox(g, 0.74, 0.28, 2.33, M.metalLight, 0, 2.54, -0.55, 0.1);
  bevelBox(g, 0.37, 0.16, 1.61, M.rust, 0, 2.73, -0.55, 0.05);
  for (const x of [-0.89, 0.89]) {
    bevelBox(g, 0.22, 0.58, 2.39, M.dark, x, 1.88, -0.43, 0.08);
    for (let i = 0; i < 7; i++) box(g, 0.24, 0.43, 0.055, M.metalLight, x * 1.025, 1.85, -1.32 + i * 0.27);
    pipe(g, [V(x, 1.56, -2.4), V(x * 1.03, 1.5, -1.4), V(x * 0.94, 1.54, 0.72)], 0.054, M.rust);
    for (const z of [-1.55, 0.45]) sphere(g, 0.17, M.metalLight, x * 1.01, 2.23, z, 1, 0.8, 1);
  }

  // Angular wraparound cockpit glazing, with thick external ribs.
  const cv = [
    -0.58, 2.14, 0.7, 0.58, 2.14, 0.7, -0.46, 2.54, 1.0, 0.46, 2.54, 1.0,
    -0.32, 2.25, 2.36, 0.32, 2.25, 2.36, -0.36, 1.69, 2.68, 0.36, 1.69, 2.68,
  ];
  surface(g, cv, [0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 4, 6, 5, 5, 6, 7, 0, 6, 2, 2, 6, 4, 1, 3, 7, 3, 5, 7], M.glass);
  const cockpitPoint = i => V(cv[i * 3], cv[i * 3 + 1], cv[i * 3 + 2]);
  [[0, 2], [2, 4], [4, 6], [1, 3], [3, 5], [5, 7], [2, 3], [4, 5], [6, 7], [0, 6], [1, 7]].forEach(([a, b]) => rod(g, cockpitPoint(a), cockpitPoint(b), 0.035, M.metalLight));
  rod(g, V(0, 2.56, 1), V(0, 2.27, 2.36), 0.035);
  rod(g, V(0, 2.27, 2.36), V(0, 1.71, 2.7), 0.035);
  box(g, 0.11, 0.055, 0.13, M.blue, -0.37, 1.79, 2.73);
  box(g, 0.11, 0.055, 0.13, M.blue, 0.37, 1.79, 2.73);
  bevelBox(g, 0.5, 0.27, 0.6, M.metalLight, 0, 1.38, 2.52, 0.08);
  sphere(g, 0.105, M.black, 0, 1.31, 2.79);

  const wings = [];
  for (const sign of [-1, 1]) {
    for (const [z, sweep] of [[0.49, 1.0], [-1.5, -1.48]]) {
      const root = new THREE.Group();
      root.position.set(sign * 0.89, 2.31, z);
      g.add(root);
      const hinge = cylinder(root, 0.21, 0.21, 0.5, M.rust, sign * 0.18, 0, 0, 10);
      hinge.rotation.z = Math.PI / 2;
      const wing = createWing(sign, sweep);
      wing.position.x = sign * 0.34;
      wing.rotation.z = sign * 0.032;
      wing.userData.side = sign;
      wing.userData.restRotation = wing.rotation.z;
      root.add(wing);
      wings.push(wing);
      rod(root, V(sign * 0.1, -0.17, 0.08), V(sign * 0.95, -0.05, 0.2), 0.048, M.metalLight);
    }
  }
  // Four splayed hydraulic landing legs and long sand skids.
  for (const sign of [-1, 1]) for (const z of [-1.6, 1.14]) {
    const ankle = V(sign * 1.35, 0.22, z + 0.16);
    const knee = V(sign * 1.29, 0.83, z - 0.16);
    rod(g, V(sign * 0.63, 1.49, z), knee, 0.083, M.metal);
    rod(g, knee, ankle, 0.062, M.metalLight);
    rod(g, V(sign * 0.53, 1.19, z + 0.28), V(sign * 1.28, 0.43, z + 0.2), 0.036, M.metalLight);
    sphere(g, 0.12, M.rust, knee.x, knee.y, knee.z);
    bevelBox(g, 0.28, 0.15, 0.94, M.dark, ankle.x, 0.13, ankle.z + 0.11, 0.07);
  }
  // Exhausts, tail fin and small painted identification bars.
  for (const x of [-0.29, 0.29]) {
    const exhaust = cylinder(g, 0.19, 0.22, 0.69, M.rust, x, 1.76, -2.88);
    exhaust.rotation.x = Math.PI / 2;
    const opening = cylinder(g, 0.15, 0.15, 0.014, M.black, x, 1.76, -3.234);
    opening.rotation.x = Math.PI / 2;
    torus(g, 0.19, 0.028, M.metalLight, x, 1.76, -3.23, 16);
  }
  surface(g, [-0.045, 1.77, -2.6, 0.045, 1.77, -2.6, -0.03, 2.75, -3.27, 0.03, 2.75, -3.27, -0.025, 1.52, -3.69, 0.025, 1.52, -3.69], [0, 2, 4, 1, 5, 3, 0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4], M.metalLight);
  rod(g, V(0, 2.62, -1.83), V(0, 3.34, -2.25), 0.022, M.metal);
  for (let i = 0; i < 3; i++) box(g, 0.048, 0.07, 0.38, M.stoneLight, -0.48 + i * 0.12, 2.507, -0.8);
  g.userData = { wings };
  batchStatics(g, wings);
  wings.forEach(wing => batchStatics(wing));
  return g;
}

export function createTraveller({ color = 0x343f3d, scarf = 0xb09b73 } = {}) {
  const g = new THREE.Group();
  g.name = 'Desert traveller';
  const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.93 });
  const fabric = new THREE.MeshStandardMaterial({ color: scarf, roughness: 1, side: THREE.DoubleSide });
  const seam = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(1.42), roughness: 0.87 });
  const legs = [], arms = [];
  bevelBox(g, 0.47, 0.51, 0.29, suit, 0, 1.16, 0, 0.06);
  bevelBox(g, 0.43, 0.26, 0.31, M.dark, 0, 0.87, 0, 0.035);
  bevelBox(g, 0.47, 0.055, 0.34, M.rust, 0, 0.96, 0.018, 0.012);
  box(g, 0.09, 0.065, 0.025, M.metalLight, 0.03, 0.96, 0.202);
  // Chest pressure channels and crossed water reclaim tubes.
  for (const x of [-0.13, 0, 0.13]) box(g, 0.036, 0.31, 0.055, seam, x, 1.19, 0.164);
  pipe(g, [V(-0.13, 1.47, 0.1), V(-0.21, 1.29, 0.22), V(-0.16, 1.07, 0.21), V(0.12, 0.96, 0.19)], 0.021, M.dark);
  pipe(g, [V(0.12, 1.5, 0.14), V(0.22, 1.36, 0.2), V(0.17, 1.19, 0.22)], 0.017, M.rust);
  for (const sign of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.137, 0.84, 0);
    g.add(leg);
    cylinder(leg, 0.102, 0.092, 0.36, suit, 0, -0.17, 0, 8);
    cylinder(leg, 0.077, 0.073, 0.34, suit, 0, -0.53, 0.012, 8);
    bevelBox(leg, 0.145, 0.15, 0.1, M.dark, 0, -0.35, 0.083, 0.026);
    box(leg, 0.031, 0.23, 0.025, seam, 0, -0.59, 0.088);
    bevelBox(leg, 0.176, 0.15, 0.32, M.dark, 0, -0.752, 0.073, 0.035);
    box(leg, 0.183, 0.035, 0.327, M.rust, 0, -0.82, 0.073);
    legs.push(leg);

    const arm = new THREE.Group();
    arm.position.set(sign * 0.3, 1.37, 0);
    arm.rotation.z = sign * 0.11;
    g.add(arm);
    sphere(arm, 0.135, suit, 0, -0.015, 0, 0.88, 1, 1);
    cylinder(arm, 0.077, 0.069, 0.27, suit, 0, -0.18, 0, 8);
    cylinder(arm, 0.068, 0.065, 0.24, seam, 0, -0.43, 0.015, 8);
    bevelBox(arm, 0.104, 0.11, 0.098, M.dark, 0, -0.565, 0.02, 0.023);
    box(arm, 0.109, 0.062, 0.117, M.rust, 0, -0.446, 0.01);
    arms.push(arm);
    bevelBox(g, 0.1, 0.17, 0.15, fabric, sign * 0.258, 0.94, 0.06, 0.02);
  }
  cylinder(g, 0.088, 0.1, 0.16, suit, 0, 1.47, 0, 8);
  sphere(g, 0.208, fabric, 0, 1.662, -0.017, 0.92, 1.04, 0.91);
  sphere(g, 0.155, M.dark, 0, 1.657, 0.083, 0.96, 0.88, 0.7);
  bevelBox(g, 0.265, 0.07, 0.07, M.black, 0, 1.696, 0.195, 0.018);
  for (const sign of [-1, 1]) {
    box(g, 0.05, 0.018, 0.011, M.blue, sign * 0.064, 1.699, 0.233);
  }
  bevelBox(g, 0.145, 0.111, 0.104, suit, 0, 1.587, 0.179, 0.022);
  for (const x of [-0.039, 0, 0.039]) box(g, 0.014, 0.061, 0.013, M.rust, x, 1.586, 0.239);
  pipe(g, [V(0.061, 1.58, 0.2), V(0.152, 1.56, 0.157), V(0.18, 1.43, 0.13)], 0.022, M.dark);
  const collar = torus(g, 0.173, 0.062, fabric, 0, 1.448, 0.015, 16);
  collar.rotation.x = Math.PI / 2;
  bevelBox(g, 0.3, 0.44, 0.17, M.dark, 0, 1.21, -0.229, 0.05);
  for (const x of [-0.1, 0.1]) cylinder(g, 0.049, 0.049, 0.35, M.rust, x, 1.24, -0.341, 8);

  const cape = new THREE.Group();
  cape.position.set(0, 1.43, -0.172);
  g.add(cape);
  const vertices = [], indices = [];
  for (let row = 0; row <= 7; row++) for (let col = 0; col <= 8; col++) {
    const u = col / 8, v = row / 7;
    const width = 0.58 + v * 0.15;
    vertices.push((u - 0.5) * width, -v * 1.02 + Math.sin(u * Math.PI * 3) * 0.025 * v, -0.13 - v * 0.19 + Math.cos(u * Math.PI * 6) * (0.026 + v * 0.047));
    if (row < 7 && col < 8) { const n = row * 9 + col; indices.push(n, n + 9, n + 1, n + 1, n + 9, n + 10); }
  }
  surface(cape, vertices, indices, fabric);
  // The crysknife sheath provides an asymmetric, recognisable profile.
  const sheath = bevelBox(g, 0.064, 0.46, 0.066, M.dark, -0.27, 0.83, -0.092, 0.01);
  sheath.rotation.z = -0.2;
  cylinder(g, 0.027, 0.025, 0.14, M.tooth, -0.32, 1.115, -0.092, 6);
  g.userData = { legs, arms, cape };
  batchStatics(g, [...legs, ...arms, cape]);
  [...legs, ...arms].forEach(part => batchStatics(part));
  return g;
}

export function createWorm() {
  const g = new THREE.Group();
  g.name = 'Shai-Hulud';
  const path = new THREE.CatmullRomCurve3([
    V(0, -1.6, -3.8), V(0.12, 1.2, -3.5), V(0.25, 4.35, -2.6), V(0.05, 7.7, -0.9), V(-0.24, 9.9, 1.55),
  ]);
  mesh(g, new THREE.TubeGeometry(path, 45, 2.06, 40, false), M.worm);
  const ringCount = 39;
  for (let i = 0; i < ringCount; i++) {
    const t = i / (ringCount - 1);
    const p = path.getPoint(t);
    const tangent = path.getTangent(t).normalize();
    const radius = 2.13 + Math.sin(t * Math.PI) * 0.16;
    const ring = torus(g, radius, i > 34 ? 0.14 : 0.155, i % 3 === 0 ? M.worm : M.wormRidge, p.x, p.y, p.z, 40);
    ring.quaternion.setFromUnitVectors(FORWARD, tangent);
    ring.scale.z = 0.75;
    if (i % 2 === 0 && i < 35) {
      for (let j = 0; j < 10; j++) {
        const a = j / 10 * TAU + (i % 4 ? 0.09 : 0);
        const plate = bevelBox(ring, 0.23, 0.29, 0.18, M.worm, Math.cos(a) * radius, Math.sin(a) * radius, 0, 0.025);
        plate.rotation.z = a - Math.PI / 2;
      }
    }
  }
  const mouth = new THREE.Group();
  mouth.position.copy(path.getPoint(1));
  mouth.quaternion.setFromUnitVectors(FORWARD, path.getTangent(1).normalize());
  g.add(mouth);
  // A long black throat lies behind concentric, inward-pointing teeth.
  const throat = mesh(mouth, new THREE.ConeGeometry(1.92, 3.5, 48, 1, true), M.wormInside, 0, 0, -1.6);
  throat.rotation.x = -Math.PI / 2;
  const blackDisc = mesh(mouth, new THREE.CircleGeometry(1.8, 48), M.black, 0, 0, -1.72);
  blackDisc.receiveShadow = false;
  for (let lip = 0; lip < 3; lip++) {
    const part = mesh(mouth, new THREE.TorusGeometry(2.11, 0.27, 10, 20, TAU / 3 - 0.085), M.wormRidge);
    part.rotation.z = lip * TAU / 3 + 0.05;
    part.position.z = 0.09;
    const outer = mesh(mouth, new THREE.TorusGeometry(2.28, 0.072, 6, 20, TAU / 3 - 0.1), M.worm);
    outer.rotation.z = lip * TAU / 3 + 0.05;
    outer.position.z = -0.08;
  }
  for (let row = 0; row < 4; row++) {
    const count = 41 - row * 4;
    const rad = 1.95 - row * 0.19;
    for (let j = 0; j < count; j++) {
      const a = j / count * TAU + row * 0.073;
      const toothLength = 0.48 + 0.16 * Math.sin(j * 2.71 + row);
      const base = V(Math.cos(a) * rad, Math.sin(a) * rad, -row * 0.29 + 0.065);
      const direction = V(-Math.cos(a) * 0.72, -Math.sin(a) * 0.72, 0.68).normalize();
      const tooth = mesh(mouth, new THREE.ConeGeometry(row === 0 ? 0.06 : 0.041, toothLength, 5), M.tooth);
      tooth.position.copy(base).addScaledVector(direction, toothLength / 2);
      tooth.quaternion.setFromUnitVectors(UP, direction);
    }
  }
  g.userData = { mouth };
  batchStatics(g, [mouth]);
  batchStatics(mouth);
  return g;
}

export function createSpiceCluster() {
  const g = new THREE.Group();
  g.name = 'Spice bloom';
  const random = seeded(617);
  cylinder(g, 0.35, 0.55, 0.052, M.stoneDark, 0, 0.015, 0, 10);
  const crystals = [];
  for (let i = 0; i < 13; i++) {
    const a = random() * TAU, r = random() * 0.39;
    const h = 0.09 + random() * 0.25;
    const crystal = mesh(g, new THREE.ConeGeometry(0.031 + random() * 0.035, h, 5), M.spice, Math.sin(a) * r, h / 2 + 0.03, Math.cos(a) * r);
    crystal.rotation.z = (random() - 0.5) * 0.7;
    crystal.rotation.x = (random() - 0.5) * 0.7;
    crystals.push(crystal);
  }
  for (let i = 0; i < 10; i++) {
    const a = random() * TAU, r = random() * 0.51;
    sphere(g, 0.017 + random() * 0.018, M.spice, Math.sin(a) * r, 0.038, Math.cos(a) * r, 1.5, 0.4, 1);
  }
  batchStatics(g);
  g.userData = { crystals: g.children.filter(child => child.isMesh && child.material === M.spice) };
  return g;
}

export function createCrate() {
  const g = new THREE.Group();
  g.name = 'Sealed desert cargo';
  bevelBox(g, 0.95, 0.65, 0.68, M.metal, 0, 0.355, 0, 0.075);
  bevelBox(g, 0.98, 0.115, 0.71, M.rust, 0, 0.725, 0, 0.035);
  for (const x of [-0.32, 0.32]) {
    box(g, 0.075, 0.71, 0.724, M.dark, x, 0.366, 0);
    bevelBox(g, 0.103, 0.15, 0.047, M.metalLight, x, 0.62, 0.38, 0.012);
  }
  for (const x of [-0.483, 0.483]) {
    box(g, 0.035, 0.18, 0.26, M.dark, x, 0.46, 0);
    box(g, 0.053, 0.028, 0.17, M.metalLight, x, 0.49, 0);
  }
  bevelBox(g, 0.29, 0.17, 0.025, M.stoneLight, 0, 0.4, 0.351, 0.014);
  for (let i = 0; i < 4; i++) box(g, 0.016, 0.099, 0.03, M.dark, -0.09 + i * 0.057, 0.4, 0.368);
  for (const x of [-0.38, 0.38]) for (const z of [-0.23, 0.23]) box(g, 0.15, 0.09, 0.16, M.dark, x, 0.045, z);
  batchStatics(g);
  return g;
}

export function createThumper() {
  const g = new THREE.Group();
  g.name = 'Rhythmic sand thumper';
  cylinder(g, 0.2, 0.29, 0.14, M.dark, 0, 0.1, 0, 10);
  cylinder(g, 0.12, 0.18, 0.35, M.rust, 0, 0.29, 0, 10);
  cylinder(g, 0.087, 0.087, 0.74, M.metalLight, 0, 0.64, 0, 10);
  for (let i = 0; i < 5; i++) cylinder(g, 0.147, 0.147, 0.049, M.dark, 0, 0.49 + i * 0.092, 0, 10);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU;
    const foot = V(Math.sin(a) * 0.4, 0.025, Math.cos(a) * 0.4);
    rod(g, V(Math.sin(a) * 0.14, 0.32, Math.cos(a) * 0.14), foot, 0.045, M.metal);
    cylinder(g, 0.085, 0.1, 0.035, M.dark, foot.x, 0.03, foot.z, 6);
  }
  const piston = new THREE.Group();
  piston.position.y = 0.97;
  g.add(piston);
  cylinder(piston, 0.2, 0.17, 0.19, M.rust, 0, 0.015, 0, 12);
  cylinder(piston, 0.15, 0.2, 0.07, M.metalLight, 0, 0.14, 0, 12);
  cylinder(piston, 0.033, 0.045, 0.12, M.dark, 0, 0.23, 0, 8);
  box(g, 0.029, 0.13, 0.026, M.amber, 0, 0.54, 0.151);
  g.userData = { piston };
  batchStatics(g, [piston]);
  batchStatics(piston);
  return g;
}

export function createRock(seed = 1, scale = 1) {
  const random = seeded(seed);
  const sides = 17 + Math.floor(random() * 6);
  const vertices = [], indices = [];
  const rx = (0.62 + random() * 0.25) * scale;
  const rz = (0.53 + random() * 0.28) * scale;
  const height = (1.3 + random() * 0.62) * scale;
  const angles = [];
  const sectorRadii = [];
  for (let i = 0; i < sides; i++) {
    const a = i / sides * TAU + (random() - 0.5) * 0.065;
    angles.push(a);
    sectorRadii.push(0.91 + random() * 0.15 + Math.sin(a * 3 + seed) * 0.07);
  }
  const leanX = (random() - 0.5) * height * 0.13;
  const leanZ = (random() - 0.5) * height * 0.11;
  const phase = random() * TAU;
  const strata = 9 + Math.floor(random() * 4);
  // Three cross-sections per stratum: projecting lip, vertical eroded face, deep seam.
  const rings = [{ y: 0, radius: 1.045, shade: 0.88 }];
  for (let band = 0; band < strata; band++) {
    const t = (band + 1) / strata;
    const previous = band / strata;
    const terrace = t > 0.76 ? 0.18 : t > 0.43 ? 0.1 : 0;
    const radius = 1.035 - t * 0.25 - terrace + (random() - 0.5) * 0.022;
    rings.push({ y: previous + (t - previous) * 0.22, radius: radius + 0.029, shade: 0.96 + random() * 0.07 });
    rings.push({ y: t - 0.008, radius: radius + 0.012, shade: 0.95 + random() * 0.12 });
    rings.push({ y: t, radius: radius - 0.035, shade: 0.71 + random() * 0.11 });
  }
  const layers = rings.length;
  for (let l = 0; l < layers; l++) for (let i = 0; i < sides; i++) {
    const { y, radius } = rings[l];
    // Coherent vertical gullies cut through the ledges, with small fresh chips on every rim.
    const gully = Math.max(0, Math.sin(angles[i] * 5 + phase)) ** 6 * (0.045 + y * 0.08);
    const chip = (random() - 0.5) * 0.027;
    const r = (radius - gully + chip) * sectorRadii[i];
    const yNoise = l === 0 ? 0 : (Math.sin(angles[i] * 3 + phase) * 0.005 + (random() - 0.5) * 0.005) * height;
    vertices.push(Math.cos(angles[i]) * rx * r + leanX * y, height * y + yNoise, Math.sin(angles[i]) * rz * r + leanZ * y);
    if (l < layers - 1) {
      const a = l * sides + i, b = l * sides + (i + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  vertices.push(leanX, height * 0.995, leanZ);
  const center = layers * sides;
  for (let i = 0; i < sides; i++) indices.push(center, (layers - 1) * sides + (i + 1) % sides, (layers - 1) * sides + i);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  const colors = [];
  const base = new THREE.Color(0x9c7c55);
  for (let i = 0; i < flat.attributes.position.count; i += 3) {
    const face = i / 3;
    const layer = Math.min(layers - 1, Math.floor(face / (sides * 2)));
    const shade = rings[layer].shade;
    const c = base.clone().multiplyScalar(shade * (0.93 + random() * 0.13));
    for (let j = 0; j < 3; j++) colors.push(c.r, c.g, c.b);
  }
  flat.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const rock = new THREE.Mesh(flat, rockMaterial);
  rock.name = 'Wind-cut sandstone';
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

const rockMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
