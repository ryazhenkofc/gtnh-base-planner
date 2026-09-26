import { describe, expect, it } from 'vitest';
import { getMultiblock } from '../data/catalog';
import { key, step, unitCells } from './geometry';
import { layoutCandidates, packUnits } from './layout';
import { placeHatches } from './ports';
import { catalog } from '../data/catalog';
import type { Dir, HatchKind, HatchResult, MultiblockDef, Rotation, Unit, Vec3 } from './types';

const coke = getMultiblock('coke-oven')!;
const ALL: HatchKind[] = ['itemIn', 'itemOut', 'fluidOut'];

function unit(id: number, origin: Vec3, rotation: Rotation = 0): Unit {
  return { id, origin, rotation };
}

/** Checks every placement rule that must hold for any input. */
function expectValid(def: MultiblockDef, units: Unit[], result: HatchResult): void {
  const occupancy = new Map<string, { unitId: number; role: string; hatches?: HatchKind[] }[]>();
  for (const u of units)
    for (const c of unitCells(def, u)) {
      const list = occupancy.get(key(c.pos)) ?? [];
      list.push({ unitId: u.id, role: c.role, hatches: c.hatches });
      occupancy.set(key(c.pos), list);
    }
  const seen = new Set<string>();
  const fronts = new Map<string, HatchKind>();
  for (const h of result.hatches) {
    const front = key(step(h.cell, h.face));
    expect(fronts.get(front) ?? h.kind, `two kinds face ${front}`).toBe(h.kind);
    fronts.set(front, h.kind);
    const k = key(h.cell);
    expect(seen.has(k), `two hatches on ${k}`).toBe(false);
    seen.add(k);
    const occ = occupancy.get(k);
    expect(occ, `hatch outside every unit at ${k}`).toBeDefined();
    for (const o of occ!) {
      expect(o.role).toBe('casing');
      expect(o.hatches).toContain(h.kind);
    }
    expect([...new Set(occ!.map((o) => o.unitId))].sort((a, b) => a - b)).toEqual(h.unitIds);
    if (h.unitIds.length > 1) expect(def.shareableHatches).toContain(h.kind);
    expect(occupancy.has(key(step(h.cell, h.face))), `face ${h.face} of ${k} is covered`).toBe(false);
  }
}

/** Kinds serving each unit, as "unitId:kind" -> count. */
function coverage(result: HatchResult): Map<string, number> {
  const m = new Map<string, number>();
  for (const h of result.hatches)
    for (const id of h.unitIds) m.set(`${id}:${h.kind}`, (m.get(`${id}:${h.kind}`) ?? 0) + 1);
  return m;
}

function expectEachServedOnce(units: Unit[], kinds: HatchKind[], result: HatchResult): void {
  const cov = coverage(result);
  for (const u of units) for (const k of kinds) expect(cov.get(`${u.id}:${k}`), `${u.id}:${k}`).toBe(1);
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

describe('placeHatches', () => {
  it('places one hatch of each enabled kind on a single oven', () => {
    const units = [unit(0, [0, 0, 0])];
    const r = placeHatches(coke, units, ALL);
    expect(r.unplaced).toEqual([]);
    expect(r.hatches).toHaveLength(3);
    expect(r.hatches.map((h) => h.kind).sort()).toEqual([...ALL].sort());
    for (const h of r.hatches) expect(h.unitIds).toEqual([0]);
    expectValid(coke, units, r);
    // never on the controller (1,1,0)
    expect(r.hatches.some((h) => key(h.cell) === '1,1,0')).toBe(false);
  });

  it('shares every hatch between two ovens with a common wall', () => {
    const units = [unit(0, [0, 0, 0]), unit(1, [2, 0, 0])];
    const r = placeHatches(coke, units, ALL);
    expect(r.unplaced).toEqual([]);
    expect(r.hatches).toHaveLength(3);
    for (const h of r.hatches) {
      expect(h.unitIds).toEqual([0, 1]);
      expect(h.cell[0]).toBe(2);
    }
    expectValid(coke, units, r);
    expectEachServedOnce(units, ALL, r);
  });

  it('uses 4-way shared cells in a 2x2 grid', () => {
    const units = [unit(0, [0, 0, 0]), unit(1, [2, 0, 0]), unit(2, [0, 0, 2]), unit(3, [2, 0, 2])];
    const r = placeHatches(coke, units, ALL);
    expect(r.unplaced).toEqual([]);
    expectValid(coke, units, r);
    expectEachServedOnce(units, ALL, r);
    // The top of the centre column serves all four; the bottom stands on the ground, so the other kinds
    // take 2-way cells on the sides.
    expect(r.hatches[0]).toEqual({ kind: 'itemIn', cell: [2, 2, 2], face: 'up', unitIds: [0, 1, 2, 3] });
    for (const h of r.hatches.slice(1)) expect(h.unitIds).toHaveLength(2);
    expect(r.hatches.some((h) => h.face === 'down')).toBe(false);
  });

  it('reports a fully enclosed unit as unplaced without throwing', () => {
    const cube: MultiblockDef = {
      ...coke,
      id: 'cube',
      size: [1, 1, 1],
      layers: [['C']],
      controller: { ...coke.controller, pos: [0, 0, 0] },
      shareableHatches: [],
    };
    const units: Unit[] = [];
    for (let y = 0; y < 3; y++)
      for (let z = 0; z < 3; z++) for (let x = 0; x < 3; x++) units.push(unit(units.length, [x, y, z]));
    const r = placeHatches(cube, units, ['itemIn']);
    // The centre cube is sealed in; the one below it only opens onto the ground.
    expect(r.unplaced).toEqual([
      { unitId: 4, kind: 'itemIn' },
      { unitId: 13, kind: 'itemIn' },
    ]);
    expect(r.hatches).toHaveLength(25);
    expectValid(cube, units, r);
  });

  it('reports every kind unplaced when all cells are taken', () => {
    const cube: MultiblockDef = {
      ...coke,
      id: 'cube',
      size: [1, 1, 1],
      layers: [['C']],
      controller: { ...coke.controller, pos: [0, 0, 0] },
    };
    const r = placeHatches(cube, [unit(7, [0, 0, 0])], ALL);
    expect(r.hatches).toHaveLength(1);
    expect(r.unplaced).toEqual([
      { unitId: 7, kind: 'itemOut' },
      { unitId: 7, kind: 'fluidOut' },
    ]);
  });

  it('handles rotated units sharing a wall', () => {
    const units = [unit(0, [0, 0, 0], 1), unit(1, [0, 0, 2], 3)];
    const r = placeHatches(coke, units, ALL);
    expect(r.unplaced).toEqual([]);
    expectValid(coke, units, r);
    expectEachServedOnce(units, ALL, r);
    for (const h of r.hatches) {
      expect(h.unitIds).toEqual([0, 1]);
      expect(h.cell[2]).toBe(2);
    }
  });

  it('gives every unit its own hatch for non-shareable kinds', () => {
    const def: MultiblockDef = { ...coke, shareableHatches: ['itemIn'] };
    const units = [unit(0, [0, 0, 0]), unit(1, [2, 0, 0])];
    const r = placeHatches(def, units, ALL);
    expect(r.unplaced).toEqual([]);
    expectValid(def, units, r);
    expectEachServedOnce(units, ALL, r);
    expect(r.hatches.filter((h) => h.kind === 'itemIn')).toHaveLength(1);
    for (const h of r.hatches.filter((h) => h.kind !== 'itemIn')) {
      expect(h.unitIds).toHaveLength(1);
      expect(h.cell[0]).not.toBe(2);
    }
  });

  it('never uses a cell where another unit has its controller or air', () => {
    // Unit 1 sits so that its casing covers unit 0's controller cell (1,1,0).
    const units = [unit(0, [0, 0, 0]), unit(1, [1, 1, -2])];
    const r = placeHatches(coke, units, ALL);
    expectValid(coke, units, r);
    expect(r.hatches.some((h) => key(h.cell) === '1,1,0')).toBe(false);
  });

  it('respects requiredHatches min and max', () => {
    const twoIn: MultiblockDef = { ...coke, requiredHatches: { itemIn: { min: 2 } } };
    const single = [unit(0, [0, 0, 0])];
    const r1 = placeHatches(twoIn, single, ['itemIn']);
    expect(r1.hatches).toHaveLength(2);
    expect(r1.unplaced).toEqual([]);

    const grid = [unit(0, [0, 0, 0]), unit(1, [2, 0, 0]), unit(2, [0, 0, 2]), unit(3, [2, 0, 2])];
    const exactlyOne: MultiblockDef = { ...coke, requiredHatches: { itemIn: { min: 1, max: 1 } } };
    const r2 = placeHatches(exactlyOne, grid, ['itemIn']);
    expectEachServedOnce(grid, ['itemIn'], r2);

    const none: MultiblockDef = { ...coke, requiredHatches: { itemIn: { min: 0, max: 0 } } };
    expect(placeHatches(none, single, ['itemIn'])).toEqual({ hatches: [], unplaced: [] });

    // max 1 with min 2: clamped to 1
    const clamped: MultiblockDef = { ...coke, requiredHatches: { itemIn: { min: 2, max: 1 } } };
    expect(placeHatches(clamped, single, ['itemIn']).hatches).toHaveLength(1);
  });

  it('never exceeds max when a shared cell would over-serve a unit', () => {
    // Units 0 and 1 share a wall; unit 1 and 2 share a wall. With max 1, the middle unit may only be
    // served once, so at most one of the two shared walls gets the hatch.
    const def: MultiblockDef = { ...coke, requiredHatches: { itemIn: { min: 1, max: 1 } } };
    const units = [unit(0, [0, 0, 0]), unit(1, [2, 0, 0]), unit(2, [4, 0, 0])];
    const r = placeHatches(def, units, ['itemIn']);
    expect(r.unplaced).toEqual([]);
    expectValid(def, units, r);
    expectEachServedOnce(units, ['itemIn'], r);
    expect(r.hatches).toHaveLength(2);
  });

  it('ignores kinds the multiblock has no hatch block for', () => {
    const r = placeHatches(coke, [unit(0, [0, 0, 0])], ['energy', 'itemIn', 'itemIn']);
    expect(r.hatches.map((h) => h.kind)).toEqual(['itemIn']);
    expect(r.unplaced).toEqual([]);
  });

  it('returns empty results for no units or no kinds', () => {
    expect(placeHatches(coke, [], ALL)).toEqual({ hatches: [], unplaced: [] });
    expect(placeHatches(coke, [unit(0, [0, 0, 0])], [])).toEqual({ hatches: [], unplaced: [] });
  });

  it('does not throw on a malformed definition', () => {
    const bad: MultiblockDef = {
      ...coke,
      id: 'bad',
      layers: [['CCX', 'CCC', 'CCC'], ...coke.layers.slice(1)],
    };
    const r = placeHatches(bad, [unit(0, [0, 0, 0])], ['itemIn']);
    expect(r).toEqual({ hatches: [], unplaced: [{ unitId: 0, kind: 'itemIn' }] });
  });

  it('is pure and independent of input order', () => {
    const units = deepFreeze([
      unit(0, [0, 0, 0]),
      unit(1, [2, 0, 0]),
      unit(2, [0, 0, 2], 2),
      unit(3, [2, 0, 2], 1),
    ]);
    const enabled = deepFreeze([...ALL]);
    const a = placeHatches(coke, units, enabled);
    const b = placeHatches(coke, [...units].reverse(), [...enabled].reverse());
    expect(b).toEqual(a);
    expect(placeHatches(coke, units, enabled)).toEqual(a);
  });

  it('places hatches for 60 wall-sharing ovens in under 30 ms', () => {
    const units: Unit[] = [];
    for (let i = 0; i < 60; i++) units.push(unit(i, [(i % 10) * 2, 0, Math.floor(i / 10) * 2]));
    const r = placeHatches(coke, units, ALL); // also warms up the JIT
    // Best of several runs, so a GC pause or a busy CI worker does not fail the budget.
    let best = Infinity;
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      placeHatches(coke, units, ALL);
      best = Math.min(best, performance.now() - t0);
    }
    expect(r.unplaced).toEqual([]);
    expectValid(coke, units, r);
    expectEachServedOnce(units, ALL, r);
    expect(best).toBeLessThan(30);
  });

  it('turns hatches to face open space rather than a gap between units', () => {
    const DIRS: Dir[] = ['north', 'south', 'east', 'west', 'up', 'down'];
    for (const def of catalog) {
      const limits = { x: null, y: null, z: null };
      // The compact layout plus looser ones with gaps and walkways between units.
      const layouts = [packUnits(def, 6, limits).units, ...[...layoutCandidates(def, 6, limits)].slice(0, 6)];
      for (const units of layouts) {
        const solid = new Set(units.flatMap((u) => unitCells(def, u).map((c) => key(c.pos))));
        const clearAhead = (cell: Vec3, dir: Dir): boolean => {
          let p = cell;
          for (let n = 0; n < 16; n++) {
            p = step(p, dir);
            if (solid.has(key(p))) return false;
          }
          return true;
        };
        for (const h of placeHatches(def, units, def.defaultHatches).hatches) {
          const outward = DIRS.some((d) => clearAhead(h.cell, d));
          if (outward) expect(clearAhead(h.cell, h.face), `${def.id} ${h.kind} at ${key(h.cell)}`).toBe(true);
        }
      }
    }
  });

  it('never faces the ground under the build', () => {
    // A lone 1x1x1 hatch-able block: its bottom rests on the ground, every other side is open.
    const cube: MultiblockDef = {
      ...coke,
      id: 'cube',
      size: [1, 1, 1],
      layers: [['C']],
      controller: { ...coke.controller, pos: [0, 0, 0] },
    };
    const units = [unit(0, [0, 0, 0]), unit(1, [0, 1, 0])];
    for (const h of placeHatches(cube, units, ['itemIn', 'itemOut']).hatches) expect(h.face).not.toBe('down');
  });

  it('never faces a sealed pocket', () => {
    // Hollow 3x3x3 shell: the centre (1,1,1) is not part of the structure but is sealed in.
    // Only the top centre may take a hatch; its "down" face points into the pocket.
    const shell: MultiblockDef = {
      ...coke,
      id: 'shell',
      layers: [
        ['CCC', 'CCC', 'CCC'],
        ['CCC', 'C C', 'CCC'],
        ['CCC', 'CHC', 'CCC'],
      ],
      legend: { C: { blockId: 'b' }, H: { blockId: 'b', hatches: ['itemIn'] } },
    };
    const r = placeHatches(shell, [unit(0, [0, 0, 0])], ['itemIn']);
    expect(r.hatches).toEqual([{ kind: 'itemIn', cell: [1, 2, 1], face: 'up', unitIds: [0] }]);
  });

  it('keeps hatch fronts of different kinds apart in random layouts', () => {
    const cube: MultiblockDef = {
      ...coke,
      id: 'cube',
      size: [1, 1, 1],
      layers: [['C']],
      controller: { ...coke.controller, pos: [0, 0, 0] },
      shareableHatches: [],
    };
    let seed = 12345;
    const rnd = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let round = 0; round < 40; round++) {
      const units: Unit[] = [];
      for (let y = 0; y < 2; y++)
        for (let z = 0; z < 5; z++)
          for (let x = 0; x < 5; x++) if (rnd() < 0.55) units.push(unit(units.length, [x, y, z]));
      for (const def of [cube, coke]) {
        const us =
          def === cube
            ? units
            : units.map((u) => ({
                ...u,
                origin: [u.origin[0] * 2, 0, u.origin[2] * 2] as const,
                rotation: (u.id % 4) as Rotation,
              }));
        expectValid(def, us, placeHatches(def, us, ALL));
      }
    }
  });

  it('does not share hatches when the multiblock forbids wall sharing', () => {
    const def: MultiblockDef = { ...coke, wallshare: false };
    const units = [unit(0, [0, 0, 0]), unit(1, [2, 0, 0])];
    const r = placeHatches(def, units, ALL);
    expect(r.unplaced).toEqual([]);
    for (const h of r.hatches) expect(h.unitIds).toHaveLength(1);
    expectEachServedOnce(units, ALL, r);
  });

  it('treats an invalid max as unlimited instead of dropping hatches', () => {
    const def: MultiblockDef = { ...coke, requiredHatches: { itemIn: { min: 1, max: NaN } } };
    const r = placeHatches(def, [unit(0, [0, 0, 0])], ['itemIn']);
    expect(r.hatches).toHaveLength(1);
    expect(r.unplaced).toEqual([]);
  });

  it('does not throw when hatchBlocks is missing', () => {
    const def = { ...coke, hatchBlocks: undefined } as unknown as MultiblockDef;
    expect(placeHatches(def, [unit(0, [0, 0, 0])], ALL)).toEqual({ hatches: [], unplaced: [] });
  });

  it('does not mutate a frozen definition', () => {
    const def = deepFreeze(structuredClone(coke)) as MultiblockDef;
    const units = [unit(0, [0, 0, 0]), unit(1, [2, 0, 0])];
    expect(placeHatches(def, units, ALL)).toEqual(placeHatches(coke, units, ALL));
    expect(def).toEqual(coke);
  });
});
