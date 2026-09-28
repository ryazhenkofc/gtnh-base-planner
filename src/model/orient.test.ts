import { describe, expect, it } from 'vitest';
import { getMultiblock } from '../data/catalog';
import { controllerFacing, rotateDir, unitCells } from './geometry';
import { packUnits } from './layout/packer';
import { alongX } from './orient';
import { placeHatches } from './hatches/placement';
import type { MultiblockDef, Unit } from './types';

const NO_LIMITS = { x: null, y: null, z: null };

function extent(def: MultiblockDef, units: Unit[]): [number, number] {
  const cells = units.flatMap((u) => unitCells(def, u).map((c) => c.pos));
  const span = (a: number) => Math.max(...cells.map((c) => c[a])) - Math.min(...cells.map((c) => c[a])) + 1;
  return [span(0), span(2)];
}

describe('alongX', () => {
  const def = getMultiblock('advanced-assembly-line')!;
  // Two units turned a quarter, one after the other along Z (3 × 10 blocks).
  const units: Unit[] = [
    { id: 0, origin: [0, 0, 0], rotation: 1 },
    { id: 1, origin: [0, 0, 5], rotation: 3 },
  ];
  const hatches = placeHatches(def, units, def.defaultHatches);

  it('turns a layout that is longer along Z, keeping its minimum corner', () => {
    const [x, z] = extent(def, units);
    expect(z).toBeGreaterThan(x);
    const out = alongX(def, { units, hatches })!;
    expect(out).not.toBeNull();
    expect(extent(def, out.units)).toEqual([z, x]);
    const min = (us: Unit[], a: number) =>
      Math.min(...us.flatMap((u) => unitCells(def, u).map((c) => c.pos[a])));
    expect([min(out.units, 0), min(out.units, 2)]).toEqual([min(units, 0), min(units, 2)]);
  });

  it('moves every cell, hatch and controller front by the same quarter turn', () => {
    const out = alongX(def, { units, hatches })!;
    const minX = Math.min(...units.flatMap((u) => unitCells(def, u).map((c) => c.pos[0])));
    const [, z] = extent(def, units);
    const minZ = Math.min(...units.flatMap((u) => unitCells(def, u).map((c) => c.pos[2])));
    const turn = ([x, y, zz]: readonly number[]) => [minX + (minZ + z - 1 - zz), y, minZ + (x - minX)].join();
    units.forEach((u, i) => {
      const before = unitCells(def, u)
        .map((c) => `${turn(c.pos)}|${c.role}|${c.char}`)
        .sort();
      const after = unitCells(def, out.units[i])
        .map((c) => `${c.pos.join()}|${c.role}|${c.char}`)
        .sort();
      expect(after).toEqual(before);
      expect(controllerFacing(def, out.units[i])).toBe(rotateDir(controllerFacing(def, u), 1));
    });
    out.hatches.hatches.forEach((h, i) => {
      expect(h.cell.join()).toBe(turn(hatches.hatches[i].cell));
      expect(h.face).toBe(rotateDir(hatches.hatches[i].face, 1));
    });
  });

  it('leaves layouts that are already longer along X alone', () => {
    const wide = packUnits(def, 6, NO_LIMITS).units;
    expect(alongX(def, { units: wide, hatches: placeHatches(def, wide, def.defaultHatches) })).toBeNull();
  });
});
