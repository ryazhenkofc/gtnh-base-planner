import { describe, expect, it } from 'vitest';
import { catalog, getMultiblock } from '../data/catalog';
import { layoutCandidates, packUnits } from './layout';
import { resolveLayout, type LayoutDeps } from './plan';
import { placeHatches } from './ports';
import type { HatchResult, PlanLimits, Unit } from './types';

const unlimited: PlanLimits = { x: null, y: null, z: null };
const deps: LayoutDeps = { placeHatches, layoutCandidates };

function resolve(id: string, count: number, limits = unlimited) {
  const def = getMultiblock(id)!;
  return resolveLayout(def, packUnits(def, count, limits), def.defaultHatches, limits, deps);
}

describe('resolveLayout', () => {
  it('keeps the compact layout when every hatch fits', () => {
    const r = resolve('coke-oven', 12);
    expect(r.loosened).toBe(false);
    expect(r.hatches.unplaced).toEqual([]);
  });

  it('loosens a dense EBF block so every unit gets its own energy and maintenance hatch', () => {
    const def = getMultiblock('electric-blast-furnace')!;
    const compact = packUnits(def, 12, unlimited);
    expect(placeHatches(def, compact.units, def.defaultHatches).unplaced.length).toBeGreaterThan(0);
    const r = resolve('electric-blast-furnace', 12);
    expect(r.loosened).toBe(true);
    expect(r.hatches.unplaced).toEqual([]);
    expect(r.pack.units).toHaveLength(12);
    expect(r.pack.requested).toBe(12);
  });

  it('places every default hatch for every catalog multiblock; loosened layouts stay one layer high', () => {
    for (const def of catalog)
      for (const n of [1, 4, 12, 60]) {
        const r = resolve(def.id, n);
        expect(r.hatches.unplaced, `${def.id} × ${n}`).toEqual([]);
        if (r.loosened)
          expect(new Set(r.pack.units.map((u) => u.origin[1])).size, `${def.id} × ${n}`).toBe(1);
      }
  });

  it('respects limits and keeps the best effort when nothing fits every hatch', () => {
    const limits: PlanLimits = { x: 3, y: null, z: 2 };
    const r = resolve('electric-blast-furnace', 6, limits);
    expect(new Set(r.pack.units.map((u) => u.origin[0])).size).toBeLessThanOrEqual(3);
    expect(new Set(r.pack.units.map((u) => u.origin[2])).size).toBeLessThanOrEqual(2);
    expect(r.pack.units.length).toBe(r.pack.placed);
  });

  it('stops after maxTries and prefers fewer unplaced hatches', () => {
    const def = getMultiblock('coke-oven')!;
    const base = { units: [{ id: 0, origin: [0, 0, 0], rotation: 0 }] as Unit[], requested: 1, placed: 1 };
    const results: HatchResult[] = [
      {
        hatches: [],
        unplaced: [
          { unitId: 0, kind: 'energy' },
          { unitId: 0, kind: 'muffler' },
        ],
      },
      { hatches: [], unplaced: [{ unitId: 0, kind: 'energy' }] },
      { hatches: [], unplaced: [{ unitId: 0, kind: 'muffler' }] },
    ];
    let call = 0;
    const alt = (x: number): Unit[] => [{ id: 0, origin: [x, 0, 0], rotation: 0 }];
    const r = resolveLayout(
      def,
      base,
      [],
      unlimited,
      {
        placeHatches: () => results[Math.min(call++, results.length - 1)],
        layoutCandidates: function* () {
          yield alt(1);
          yield alt(2);
          yield alt(3);
        },
      },
      1,
    );
    expect(call).toBe(2);
    expect(r.loosened).toBe(true);
    expect(r.pack.units[0].origin[0]).toBe(1);
    expect(r.hatches.unplaced).toHaveLength(1);
  });

  it('is fast enough for 60 units', () => {
    const def = getMultiblock('oil-cracking-unit')!;
    const t0 = performance.now();
    resolveLayout(def, packUnits(def, 60, unlimited), def.defaultHatches, unlimited, deps);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

describe('layoutCandidates', () => {
  it('yields only valid, distinct layouts of the requested size', () => {
    const def = getMultiblock('coke-oven')!;
    const seen = new Set<string>();
    let n = 0;
    for (const units of layoutCandidates(def, 6, unlimited)) {
      expect(units).toHaveLength(6);
      const k = JSON.stringify(units);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
      if (++n >= 30) break;
    }
    expect(n).toBeGreaterThan(3);
  });

  it('includes a layout with gaps between units', () => {
    const def = getMultiblock('coke-oven')!;
    let gapped = false;
    for (const units of layoutCandidates(def, 3, unlimited)) {
      const xs = units.map((u) => u.origin[0]).sort((a, b) => a - b);
      if (xs.length === 3 && xs[1] - xs[0] === 4 && xs[2] - xs[1] === 4) gapped = true;
    }
    expect(gapped).toBe(true);
  });
});
