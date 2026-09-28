import { describe, expect, it } from 'vitest';
import { catalog } from '../data/catalog';
import { defaultPlan } from '../state/store';
import { createPipeline } from '../ui/pipeline';
import { key, localCells, rotateDir, toWorld } from './geometry';
import { layoutCandidates, packUnits } from './layout/packer';
import { resolveLayout } from './plan';
import { placeHatches } from './hatches/placement';
import type { PlanLimits } from './multiblock/types';

/**
 * Catalog entries written by tools/gt-source/generate.mjs: a few units of each must plan like the hand-made
 * ones (every default hatch placed, pipes above the ground, no hatch on a side its structure forbids). The
 * hand-made entries go through the heavier catalog-wide checks in plan / ports / routing / gt-rules tests.
 */
const generated = catalog.filter((d) => d.generated);
const unlimited: PlanLimits = { x: null, y: null, z: null };

describe('generated catalog entries', () => {
  it('are present', () => {
    expect(generated.length).toBeGreaterThan(100);
  });

  describe.each(generated.map((def) => ({ id: def.id, def })))('$id', ({ def }) => {
    it('places every default hatch for 1 and 4 units', () => {
      for (const n of [1, 4]) {
        const r = resolveLayout(def, packUnits(def, n, unlimited), def.defaultHatches, unlimited, {
          placeHatches,
          layoutCandidates,
        });
        expect(r.hatches.unplaced, `${def.id} × ${n}`).toEqual([]);
      }
    });

    it('builds 4 units with pipes above the ground and hatches on allowed sides', () => {
      const r = createPipeline()({ ...defaultPlan(def.id), count: 4 }, true);
      expect(r.error).toBeFalsy();
      const ground = Math.min(...r.scene!.voxels.map((v) => v.pos[1]));
      for (const n of r.pipes ?? [])
        for (const p of n.paths.flat()) expect(p[1]).toBeGreaterThanOrEqual(ground);
      const cells = localCells(def);
      for (const h of r.scene!.hatches)
        for (const unit of r.pack!.units) {
          const c = cells.find((l) => key(toWorld(def, unit, l.local)) === key(h.cell));
          const no = c ? def.legend[c.char]?.disallowFaces?.[h.kind] : undefined;
          if (no) expect(no.map((d) => rotateDir(d, unit.rotation))).not.toContain(h.face);
        }
    });
  });
});
