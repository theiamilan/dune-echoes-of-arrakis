import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath, isBlocked } from '../src/navigation.js';

function assertSafe(start, path, obstacles, bounds = 34) {
  let previous = start;
  for (const point of path) {
    const dx = point.x - previous.x;
    const dz = point.z - previous.z;
    const distanceSquared = dx * dx + dz * dz;
    assert.ok(Math.abs(point.x) <= bounds && Math.abs(point.z) <= bounds, 'waypoint is within bounds');
    for (const obstacle of obstacles) {
      const t = distanceSquared ? Math.max(0, Math.min(1, ((obstacle.x - previous.x) * dx + (obstacle.z - previous.z) * dz) / distanceSquared)) : 0;
      const distance = Math.hypot(previous.x + dx * t - obstacle.x, previous.z + dz * t - obstacle.z);
      assert.ok(distance > obstacle.r + 0.35, `segment clips padded circle: ${JSON.stringify({ previous, point, obstacle })}`);
    }
    previous = point;
  }
}

test('open terrain takes a direct route to the precise fractional destination', () => {
  const start = { x: -3.2, z: 1.6 };
  const goal = { x: 8.7, z: -2.1 };
  assert.deepEqual(findPath(start, goal, []), [goal]);
  assert.deepEqual(findPath(start, start, []), []);
});

test('circle clearance and world bounds block the character center', () => {
  const obstacles = [{ x: 0, z: 0, r: 1 }];
  assert.equal(isBlocked(1.34, 0, obstacles), true);
  assert.equal(isBlocked(1.36, 0, obstacles), false);
  assert.equal(isBlocked(34.01, 0, []), true);
  assert.equal(isBlocked(34, 0, []), false);
});

test('routes around a large obstacle without cutting any padded circle', () => {
  const start = { x: -6.3, z: 0.2 };
  const goal = { x: 6.1, z: 0.1 };
  const obstacles = [{ x: 0, z: 0, r: 2.1 }];
  const path = findPath(start, goal, obstacles);
  assert.ok(path.length > 2);
  assert.deepEqual(path.at(-1), goal);
  assert.ok(path.some(point => Math.abs(point.z) >= 3));
  assertSafe(start, path, obstacles);
});

test('blocked destination resolves to a nearby reachable free cell', () => {
  const start = { x: -8, z: 0 };
  const goal = { x: 0.1, z: 0.2 };
  const obstacles = [{ x: 0, z: 0, r: 1.5 }];
  const path = findPath(start, goal, obstacles);
  assert.ok(path.length > 0);
  assert.ok(Math.hypot(path.at(-1).x - goal.x, path.at(-1).z - goal.z) <= 6);
  assert.equal(isBlocked(path.at(-1).x, path.at(-1).z, obstacles), false);
  assertSafe(start, path, obstacles);
});

test('enclosed free destination cannot be reached through an obstacle ring', () => {
  const obstacles = Array.from({ length: 16 }, (_, i) => {
    const angle = i * Math.PI / 8;
    return { x: Math.cos(angle) * 3, z: Math.sin(angle) * 3, r: 0.6 };
  });
  assert.equal(isBlocked(0, 0, obstacles), false);
  assert.deepEqual(findPath({ x: -8, z: 0 }, { x: 0, z: 0 }, obstacles, 10), []);
});

test('a target with no free cell within six units returns no path', () => {
  assert.deepEqual(findPath({ x: -12, z: 0 }, { x: 0, z: 0 }, [{ x: 0, z: 0, r: 7 }]), []);
});

test('diagonal shortcuts cannot pass between two blocked orthogonal cells', () => {
  const start = { x: 0, z: 0 };
  const goal = { x: 2, z: 2 };
  const obstacles = [{ x: 1, z: 0, r: 0.15 }, { x: 0, z: 1, r: 0.15 }];
  const path = findPath(start, goal, obstacles, 5);
  assert.ok(path.length > 1, 'must not take the diagonal direct shortcut');
  assert.notDeepEqual(path[0], { x: 1, z: 1 });
  let previous = start;
  for (const point of path) {
    if (point.x !== previous.x && point.z !== previous.z) {
      assert.equal(isBlocked(point.x, previous.z, obstacles, 5), false);
      assert.equal(isBlocked(previous.x, point.z, obstacles, 5), false);
    }
    previous = point;
  }
  assertSafe(start, path, obstacles, 5);
});

test('clamps both endpoints to bounds and keeps detours in the playable area', () => {
  assert.deepEqual(findPath({ x: -90, z: 90 }, { x: 90, z: -90 }, [], 4), [{ x: 4, z: -4 }]);
  const start = { x: -3, z: 0 };
  const obstacles = [{ x: 0, z: 0, r: 1.1 }];
  const path = findPath(start, { x: 90, z: 0 }, obstacles, 4);
  assert.deepEqual(path.at(-1), { x: 4, z: 0 });
  assertSafe(start, path, obstacles, 4);
});

test('thin grazing intersections are rejected even between direct-line samples', () => {
  const start = { x: -5, z: 0 };
  const goal = { x: 5, z: 0 };
  const obstacles = [{ x: 0, z: 0.34999, r: 0 }];
  const path = findPath(start, goal, obstacles, 8);
  assert.ok(path.length > 1);
  assertSafe(start, path, obstacles, 8);
});
