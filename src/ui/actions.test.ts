import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../state/store';
import {
  withCount,
  withDefaultColors,
  withHatchColor,
  withHatchToggled,
  withLimit,
  withMultiblock,
  withSize,
} from './actions';
import { samePlan } from './session';

describe('plan transforms', () => {
  it('sets a size only on resizable multiblocks, snapped, and drops it when switching', () => {
    const dt = defaultPlan('distillation-tower');
    expect(withSize(dt, 5)).toBe(dt); // the default
    expect(withSize(dt, 8).size).toBe(8);
    expect(withSize(dt, 99).size).toBe(12);
    const coke = defaultPlan();
    expect(withSize(coke, 8)).toBe(coke);
    expect(withMultiblock(withSize(dt, 8), 'coke-oven').size).toBeUndefined();
  });

  it('clamps the count and drops a manual layout', () => {
    const p = {
      ...defaultPlan(),
      manualUnits: [{ id: 0, origin: [0, 0, 0] as const, rotation: 0 as const }],
    };
    const next = withCount(p, 5000);
    expect(next.count).toBe(2000);
    expect(next.manualUnits).toBeUndefined();
    expect(p.manualUnits).toHaveLength(1);
  });

  it('returns the same plan when nothing changes', () => {
    const p = defaultPlan();
    expect(withCount(p, p.count)).toBe(p);
    expect(withLimit(p, 'x', null)).toBe(p);
    expect(withMultiblock(p, p.multiblockId)).toBe(p);
    expect(withMultiblock(p, 'no-such-multiblock')).toBe(p);
    expect(withDefaultColors(p)).toBe(p);
  });

  it('sets one limit axis and drops a manual layout', () => {
    const p = withLimit(defaultPlan(), 'y', 15);
    expect(p.limits).toEqual({ x: null, y: 15, z: null });
    const manual = { ...p, manualUnits: [{ id: 0, origin: [0, 0, 0] as const, rotation: 0 as const }] };
    expect(withLimit(manual, 'x', 9).manualUnits).toBeUndefined();
  });

  it('toggles hatches', () => {
    const p = defaultPlan();
    const off = withHatchToggled(p, 'itemIn');
    expect(off.enabledHatches).not.toContain('itemIn');
    expect(withHatchToggled(off, 'itemIn').enabledHatches).toContain('itemIn');
  });

  it('accepts only #rrggbb colours', () => {
    const p = defaultPlan();
    expect(withHatchColor(p, 'itemIn', '#ABCDEF').colors.itemIn).toBe('#abcdef');
    expect(withHatchColor(p, 'itemIn', 'red')).toBe(p);
    expect(withDefaultColors(withHatchColor(p, 'itemIn', '#000000')).colors).toEqual({});
  });
});

describe('samePlan', () => {
  it('ignores key order and undefined fields', () => {
    const a = defaultPlan();
    const { v, ...rest } = a;
    const b = { ...rest, manualUnits: undefined, v };
    expect(samePlan(a, b)).toBe(true);
    expect(samePlan(a, { ...a, count: a.count + 1 })).toBe(false);
  });
});
