import { describe, expect, it } from 'vitest';
import { getMultiblock } from '../data/catalog';
import {
  controllerFacing,
  key,
  localCells,
  rotateDir,
  rotateLocal,
  rotatedSize,
  unitCells,
} from './geometry';

const coke = getMultiblock('coke-oven')!;

describe('geometry', () => {
  it('coke oven has 25 casings, 1 controller, 1 air', () => {
    const cells = localCells(coke);
    expect(cells.filter((c) => c.role === 'casing')).toHaveLength(25);
    expect(cells.filter((c) => c.role === 'controller')).toHaveLength(1);
    expect(cells.filter((c) => c.role === 'air')).toHaveLength(1);
  });

  it('rotates directions clockwise from above', () => {
    expect(rotateDir('east', 1)).toBe('south');
    expect(rotateDir('north', 1)).toBe('east');
    expect(rotateDir('north', 2)).toBe('south');
    expect(rotateDir('up', 3)).toBe('up');
  });

  it('keeps rotated cells inside the rotated box', () => {
    const def = { ...coke, size: [4, 1, 2] as const };
    expect(rotatedSize(def, 1)).toEqual([2, 1, 4]);
    // east edge (x = 3) goes to the south edge (z = 3) after one turn
    expect(rotateLocal(def, [3, 0, 0], 1)).toEqual([1, 0, 3]);
    expect(rotateLocal(def, [0, 0, 0], 4 as never)).toEqual([0, 0, 0]);
  });

  it('places the controller on the facing side for every rotation', () => {
    for (const rotation of [0, 1, 2, 3] as const) {
      const unit = { id: 0, origin: [10, 0, 10] as const, rotation };
      const ctrl = unitCells(coke, unit).find((c) => c.role === 'controller')!;
      const facing = controllerFacing(coke, unit);
      const expected = { north: [11, 1, 10], south: [11, 1, 12], east: [12, 1, 11], west: [10, 1, 11] }[
        facing as 'north'
      ];
      expect(key(ctrl.pos)).toBe(key(expected as [number, number, number]));
    }
  });
});
