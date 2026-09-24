const CLEARANCE = 0.35;
const SAMPLE_STEP = 0.35;
const EPSILON = 1e-9;

/** Test the character center against the world boundary and padded circles. */
export function isBlocked(x, z, obstacles, bounds = 34) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > bounds || Math.abs(z) > bounds) return true;
  return obstacles.some(({ x: ox, z: oz, r }) => {
    const radius = Math.max(0, r) + CLEARANCE;
    return (x - ox) ** 2 + (z - oz) ** 2 <= radius ** 2;
  });
}

function lineClear(a, b, obstacles, bounds) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const steps = Math.max(1, Math.ceil(Math.sqrt(lengthSquared) / SAMPLE_STEP));
  let previous = { x: Math.round(a.x), z: Math.round(a.z) };
  for (let i = 0; i <= steps; i++) {
    const x = a.x + dx * i / steps;
    const z = a.z + dz * i / steps;
    if (isBlocked(x, z, obstacles, bounds)) return false;
    const cell = { x: Math.round(x), z: Math.round(z) };
    // A direct shortcut obeys the same corner rule as diagonal grid edges.
    if (cell.x !== previous.x && cell.z !== previous.z &&
      (isBlocked(cell.x, previous.z, obstacles, bounds) || isBlocked(previous.x, cell.z, obstacles, bounds))) return false;
    previous = cell;
  }
  // Exact segment-circle testing catches grazing intersections between samples.
  return obstacles.every(({ x, z, r }) => {
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared));
    return (a.x + t * dx - x) ** 2 + (a.z + t * dz - z) ** 2 > (Math.max(0, r) + CLEARANCE) ** 2;
  });
}

function nearestCell(position, obstacles, bounds, requireVisible) {
  let best = null;
  let distanceSquared = 36 + EPSILON;
  const minX = Math.max(Math.ceil(-bounds), Math.ceil(position.x - 6));
  const maxX = Math.min(Math.floor(bounds), Math.floor(position.x + 6));
  const minZ = Math.max(Math.ceil(-bounds), Math.ceil(position.z - 6));
  const maxZ = Math.min(Math.floor(bounds), Math.floor(position.z + 6));
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const distance = (position.x - x) ** 2 + (position.z - z) ** 2;
      if (distance >= distanceSquared || isBlocked(x, z, obstacles, bounds)) continue;
      const candidate = { x, z };
      if (requireVisible && !lineClear(position, candidate, obstacles, bounds)) continue;
      best = candidate;
      distanceSquared = distance;
    }
  }
  return best;
}

class MinHeap {
  items = [];
  push(item) {
    let index = this.items.push(item) - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].f <= item.f) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    const result = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].f < this.items[child].f) child++;
        if (last.f <= this.items[child].f) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return result;
  }
}

const key = ({ x, z }) => `${x},${z}`;
const same = (a, b) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.z - b.z) < EPSILON;
const heuristic = (a, b) => {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
};

/** Return collision-free world-space waypoints, excluding start; [] means no route. */
export function findPath(start, goal, obstacles, bounds = 34) {
  if (![start.x, start.z, goal.x, goal.z, bounds].every(Number.isFinite) || bounds <= 0) return [];
  const clamp = point => ({ x: Math.max(-bounds, Math.min(bounds, point.x)), z: Math.max(-bounds, Math.min(bounds, point.z)) });
  const origin = clamp(start);
  let destination = clamp(goal);
  if (isBlocked(origin.x, origin.z, obstacles, bounds)) return [];
  if (isBlocked(destination.x, destination.z, obstacles, bounds)) {
    destination = nearestCell(destination, obstacles, bounds, false);
    if (!destination) return [];
  }
  if (same(origin, destination)) return [];
  if (lineClear(origin, destination, obstacles, bounds)) return [destination];

  const first = nearestCell(origin, obstacles, bounds, true);
  const last = nearestCell(destination, obstacles, bounds, true);
  if (!first || !last) return [];
  const open = new MinHeap();
  const firstKey = key(first);
  const lastKey = key(last);
  const costs = new Map([[firstKey, 0]]);
  const parents = new Map();
  const positions = new Map([[firstKey, first]]);
  open.push({ ...first, id: firstKey, g: 0, f: heuristic(first, last) });

  while (open.items.length) {
    const current = open.pop();
    if (current.g !== costs.get(current.id)) continue;
    if (current.id === lastKey) {
      const result = [];
      let id = lastKey;
      while (id !== undefined) {
        result.push(positions.get(id));
        id = parents.get(id);
      }
      result.reverse();
      if (same(result[0], origin)) result.shift();
      if (!result.length || !same(result[result.length - 1], destination)) result.push(destination);
      return result;
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const next = { x: current.x + dx, z: current.z + dz };
        if (isBlocked(next.x, next.z, obstacles, bounds)) continue;
        if (dx && dz && (isBlocked(current.x + dx, current.z, obstacles, bounds) || isBlocked(current.x, current.z + dz, obstacles, bounds))) continue;
        if (!lineClear(current, next, obstacles, bounds)) continue;
        const nextKey = key(next);
        const g = current.g + (dx && dz ? Math.SQRT2 : 1);
        if (g >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, g);
        parents.set(nextKey, current.id);
        positions.set(nextKey, next);
        open.push({ ...next, id: nextKey, g, f: g + heuristic(next, last) });
      }
    }
  }
  return [];
}
