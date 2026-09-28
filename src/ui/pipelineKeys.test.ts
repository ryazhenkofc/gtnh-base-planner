import { describe, expect, it } from 'vitest';
import { DEFAULT_HATCH_COLORS } from '../model/colors';
import { hatchKey, layoutKey, pipesKey, sceneKey } from './pipelineKeys';

const layoutInput = {
  defId: 'ebf',
  size: undefined as number | undefined,
  count: 4,
  limits: { x: null, y: 1, z: null },
  manualUnits: undefined as { id: number; origin: [number, number, number]; rotation: 0 }[] | undefined,
};

describe('pipeline keys', () => {
  it('change the layout key with every packing input', () => {
    const base = layoutKey(layoutInput);
    const changed = [
      { ...layoutInput, defId: 'vf' },
      { ...layoutInput, size: 5 },
      { ...layoutInput, count: 5 },
      { ...layoutInput, limits: { x: 2, y: 1, z: null } },
      { ...layoutInput, limits: { x: null, y: 2, z: null } },
      { ...layoutInput, limits: { x: null, y: 1, z: 2 } },
      { ...layoutInput, manualUnits: [{ id: 0, origin: [0, 0, 0], rotation: 0 }] },
    ].map(layoutKey);
    expect(new Set([base, ...changed]).size).toBe(changed.length + 1);
    // Limits compare by value, whatever their key order.
    expect(layoutKey({ ...layoutInput, limits: { z: null, y: 1, x: null } })).toBe(base);
  });

  it('carry every upstream key along', () => {
    const l = layoutKey(layoutInput);
    const l2 = layoutKey({ ...layoutInput, count: 5 });
    const h = hatchKey(l, ['energy'], null, false);
    expect(hatchKey(l2, ['energy'], null, false)).not.toBe(h);
    expect(hatchKey(l, ['energy', 'muffler'], null, false)).not.toBe(h);
    expect(hatchKey(l, ['energy'], ['itemIn'], false)).not.toBe(h);
    expect(hatchKey(l, ['energy'], null, true)).not.toBe(h);
    const p = pipesKey(h, []);
    expect(pipesKey(h, ['itemIn'])).not.toBe(p);
    expect(pipesKey(hatchKey(l2, ['energy'], null, false), [])).not.toBe(p);
    const s = sceneKey(p, DEFAULT_HATCH_COLORS);
    expect(sceneKey(p, { ...DEFAULT_HATCH_COLORS, itemIn: '#000000' })).not.toBe(s);
    expect(sceneKey(pipesKey(h, ['itemIn']), DEFAULT_HATCH_COLORS)).not.toBe(s);
  });
});
