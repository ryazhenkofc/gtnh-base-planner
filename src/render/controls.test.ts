import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PHI, DEFAULT_THETA, fitPoints, fitView, orbitOffset } from './controls';

function defaultCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(30, 1.5, 0.1, 100);
  camera.position.copy(orbitOffset(DEFAULT_THETA, DEFAULT_PHI, 20));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

function screen(camera: THREE.Camera, x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z).project(camera);
}

describe('orbit camera', () => {
  it('places the camera south-east and above the target', () => {
    const p = orbitOffset(DEFAULT_THETA, DEFAULT_PHI, 10);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);
    expect(p.z).toBeGreaterThan(0);
    expect(p.length()).toBeCloseTo(10);
  });

  it('shows +X to the right, +Z to the left and +Y up (not mirrored)', () => {
    const cam = defaultCamera();
    const o = screen(cam, 0, 0, 0);
    const x = screen(cam, 1, 0, 0);
    const y = screen(cam, 0, 1, 0);
    const z = screen(cam, 0, 0, 1);
    expect(x.x).toBeGreaterThan(o.x); // right
    expect(x.y).toBeLessThan(o.y); // towards the viewer (lower on screen)
    expect(z.x).toBeLessThan(o.x); // left
    expect(y.y).toBeGreaterThan(o.y); // up
    // Right-handed: X × Y = Z must turn counter-clockwise on screen from X to Y.
    const cross = (x.x - o.x) * (y.y - o.y) - (x.y - o.y) * (y.x - o.x);
    expect(cross).toBeGreaterThan(0);
  });

  it('fits every corner of a box inside the view with a margin', () => {
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(21, 3, 12));
    for (const aspect of [0.6, 1, 1.8]) {
      const corners = Array.from(
        { length: 8 },
        (_, i) =>
          new THREE.Vector3(
            i & 1 ? box.max.x : box.min.x,
            i & 2 ? box.max.y : box.min.y,
            i & 4 ? box.max.z : box.min.z,
          ),
      );
      const { target, distance: d } = fitView(corners, DEFAULT_THETA, DEFAULT_PHI, 30, aspect, 0.85);
      const cam = new THREE.PerspectiveCamera(30, aspect, 0.1, 1000);
      cam.position.copy(target).add(orbitOffset(DEFAULT_THETA, DEFAULT_PHI, d));
      cam.lookAt(target);
      cam.updateMatrixWorld();
      let maxX = 0;
      let maxY = 0;
      let minX = 0;
      let minY = 0;
      for (const c of corners) {
        const p = c.clone().project(cam);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
      }
      const extent = Math.max(maxX, maxY, -minX, -minY);
      expect(extent).toBeLessThanOrEqual(0.851);
      expect(extent).toBeGreaterThan(0.8); // tight on the limiting axis
      // Roughly centred on screen.
      expect(Math.abs(maxX + minX)).toBeLessThan(0.15);
      expect(Math.abs(maxY + minY)).toBeLessThan(0.15);
    }
  });
});

describe('fitView pivot', () => {
  it('keeps the orbit target on a long row of units, not in the empty space beside it', () => {
    const cells: [number, number, number][] = [];
    for (let x = 0; x < 600; x++)
      for (let y = 0; y < 6; y++) for (let z = 0; z < 9; z++) cells.push([x, y, z]);
    const points = fitPoints(cells);
    const box = new THREE.Box3().setFromPoints(points);
    for (const aspect of [0.6, 1.46, 2]) {
      const { target, distance } = fitView(points, DEFAULT_THETA, DEFAULT_PHI, 30, aspect);
      expect(box.distanceToPoint(target)).toBeLessThan(1e-6);
      // Still framed: every point projects inside the view.
      const cam = new THREE.PerspectiveCamera(30, aspect, 0.1, 1e5);
      cam.position.copy(target).add(orbitOffset(DEFAULT_THETA, DEFAULT_PHI, distance));
      cam.lookAt(target);
      cam.updateMatrixWorld();
      for (const p of points) {
        const q = p.clone().project(cam);
        expect(Math.abs(q.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(q.y)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('fitPoints', () => {
  /** All 8 corners of every cell, like the unthinned renderer used to pass. */
  function allCorners(cells: [number, number, number][]): THREE.Vector3[] {
    const seen = new Map<string, THREE.Vector3>();
    for (const [x, y, z] of cells)
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Vector3(x + (i & 1), y + ((i >> 1) & 1), z + ((i >> 2) & 1));
        seen.set(p.toArray().join(), p);
      }
    return [...seen.values()];
  }

  it('fits exactly like every cell corner, with far fewer points', () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let round = 0; round < 40; round++) {
      const cells: [number, number, number][] = [];
      const n = 1 + rand(400);
      for (let i = 0; i < n; i++) cells.push([rand(30) - 10, rand(8) - 2, rand(30) - 15]);
      const all = allCorners(cells);
      const thin = fitPoints(cells);
      expect(thin.length).toBeLessThanOrEqual(all.length);
      for (const [theta, phi, aspect] of [
        [0.3, 0.9, 1.6],
        [2.2, 0.4, 0.6],
        [-1.1, 1.4, 1],
      ]) {
        const a = fitView(all, theta, phi, 30, aspect);
        const b = fitView(thin, theta, phi, 30, aspect);
        expect(b.distance).toBeCloseTo(a.distance, 9);
        expect(b.target.distanceTo(a.target)).toBeLessThan(1e-9);
      }
    }
    // A solid 60×5×40 block keeps only a handful of points.
    const block: [number, number, number][] = [];
    for (let x = 0; x < 60; x++)
      for (let y = 0; y < 5; y++) for (let z = 0; z < 40; z++) block.push([x, y, z]);
    expect(fitPoints(block).length).toBeLessThan(400);
  });
});
