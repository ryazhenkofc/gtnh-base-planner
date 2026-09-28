import { describe, expect, it } from 'vitest';
import { emptySite, validateSiteState } from '../share/siteCodec';
import type { PlanState } from '../model/types';
import {
  pruned,
  withCorridor,
  withGroupAdded,
  withGroupDuplicated,
  withGroupMoved,
  withGroupPatched,
  withGroupRemoved,
  withGroupRotated,
  withLinkAdded,
  withLinkRemoved,
  withName,
  withPlanAdded,
  withResourceColor,
  withSiteSize,
} from './siteActions';

function two() {
  let s = withGroupAdded(emptySite(), 'electric-blast-furnace', [3, 3]);
  s = withGroupAdded(s, 'vacuum-freezer', [12, 3]);
  return s;
}

describe('site actions', () => {
  it('adds groups with fresh ids and non-IO default hatches', () => {
    const s = two();
    expect(s.groups.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(s.groups[0].enabledHatches).toEqual(['energy', 'maintenance', 'muffler']);
    expect(withGroupAdded(s, 'nope')).toBe(s);
    expect(() => validateSiteState(s)).not.toThrow();
  });

  it('turns a machine plan into a group', () => {
    const p: PlanState = {
      v: 1,
      multiblockId: 'distillation-tower',
      count: 3,
      limits: { x: 2, y: null, z: null },
      enabledHatches: ['fluidIn', 'fluidOut', 'energy', 'maintenance'],
      colors: {},
      size: 8,
    };
    const g = withPlanAdded(emptySite(), p, [5, 5]).groups[0];
    expect(g).toMatchObject({ multiblockId: 'distillation-tower', count: 3, size: 8, origin: [5, 5] });
    expect(g.limits.x).toBe(2);
    expect(g.enabledHatches).toEqual(['energy', 'maintenance']);
  });

  it('links groups and ports, reusing ports and resources', () => {
    let s = two();
    s = withLinkAdded(s, { port: true }, { group: 'g1' }, { name: 'Iron Dust', kind: 'item' }, 2);
    s = withLinkAdded(s, { group: 'g1' }, { group: 'g2' }, { name: 'Hot Steel Ingot', kind: 'item' });
    s = withLinkAdded(s, { port: true }, { group: 'g2' }, { name: 'iron dust', kind: 'item' });
    expect(s.ports).toHaveLength(1);
    expect(Object.keys(s.resources).sort()).toEqual(['item:hot-steel-ingot', 'item:iron-dust']);
    expect(s.links[0].rate).toBe(2);
    expect(() => validateSiteState(s)).not.toThrow();
    // No self links, no port-to-port links, no duplicates.
    expect(withLinkAdded(s, { group: 'g1' }, { group: 'g1' }, { key: 'item:iron-dust' })).toBe(s);
    expect(withLinkAdded(s, { port: true }, { port: true }, { key: 'item:iron-dust' })).toBe(s);
    expect(withLinkAdded(s, { port: true }, { group: 'g1' }, { key: 'item:iron-dust' })).toBe(s);
  });

  it('prunes ports and resources when links or groups go away', () => {
    let s = two();
    s = withLinkAdded(s, { port: true }, { group: 'g1' }, { name: 'Iron Dust', kind: 'item' });
    s = withLinkAdded(s, { group: 'g1' }, { group: 'g2' }, { name: 'Hot Steel Ingot', kind: 'item' });
    const noFirst = withLinkRemoved(s, s.links[0].id);
    expect(noFirst.ports).toEqual([]);
    expect(Object.keys(noFirst.resources)).toEqual(['item:hot-steel-ingot']);
    const noG1 = withGroupRemoved(s, 'g1');
    expect(noG1.links).toEqual([]);
    expect(noG1.resources).toEqual({});
    expect(pruned(s)).toEqual(s);
  });

  it('moves, turns and patches groups within bounds', () => {
    let s = two();
    s = withGroupMoved(s, 'g1', 2, -1);
    expect(s.groups[0].origin).toEqual([5, 2]);
    s = withGroupRotated(withGroupRotated(withGroupRotated(withGroupRotated(s, 'g1'), 'g1'), 'g1'), 'g1');
    expect(s.groups[0].rotation).toBe(0);
    s = withGroupPatched(s, 'g1', { count: 5000, origin: [1e6, -1e6] });
    expect(s.groups[0].count).toBe(2000);
    expect(s.groups[0].origin).toEqual([256, -128]);
    s = withGroupPatched(s, 'g2', { multiblockId: 'distillation-tower' });
    s = withGroupPatched(s, 'g2', { size: 9 });
    expect(s.groups[1]).toMatchObject({ multiblockId: 'distillation-tower', size: 9 });
    expect(withGroupPatched(s, 'g2', { size: 9 })).toBe(s);
  });

  it('turns both ways', () => {
    let s = two();
    s = withGroupRotated(s, 'g1', -1);
    expect(s.groups[0].rotation).toBe(3);
    s = withGroupRotated(s, 'g1', 1);
    expect(s.groups[0].rotation).toBe(0);
  });

  it('duplicates a group without its links or source', () => {
    let s = two();
    s = withGroupPatched(s, 'g1', { count: 3, label: 'Titanium EBF', rotation: 2 });
    s = { ...s, groups: s.groups.map((g) => (g.id === 'g1' ? { ...g, source: { name: 'Titanium' } } : g)) };
    s = withLinkAdded(s, { port: true }, { group: 'g1' }, { name: 'Iron Dust', kind: 'item' });
    const d = withGroupDuplicated(s, 'g1', [20, 5]);
    const copy = d.groups[2];
    expect(copy).toMatchObject({
      id: 'g3',
      multiblockId: 'electric-blast-furnace',
      count: 3,
      label: 'Titanium EBF',
      rotation: 2,
      origin: [20, 5],
    });
    expect(copy.source).toBeUndefined();
    expect(d.links).toEqual(s.links);
    expect(withGroupDuplicated(s, 'nope', [0, 0])).toBe(s);
    expect(() => validateSiteState(d)).not.toThrow();
  });

  it('sets extra hatches, never IO kinds', () => {
    const s = withGroupPatched(two(), 'g1', { enabledHatches: ['maintenance', 'itemIn', 'maintenance'] });
    expect(s.groups[0].enabledHatches).toEqual(['maintenance']);
  });

  it('clamps size and corridor, names and colours', () => {
    let s = withSiteSize(emptySite(), 2, 500);
    expect(s.size).toEqual([8, 128]);
    s = withCorridor(s, 99);
    expect(s.corridor).toBe(6);
    s = withName(s, '  Steel  ');
    expect(s.name).toBe('Steel');
    expect(withName(s, ' ').name).toBeUndefined();
    s = withLinkAdded(
      withGroupAdded(s, 'coke-oven'),
      { group: 'g1' },
      { port: true },
      { name: 'Coke', kind: 'item' },
    );
    expect(withResourceColor(s, 'item:coke', '#ABCDEF').resources['item:coke'].color).toBe('#abcdef');
    expect(withResourceColor(s, 'item:coke', 'red')).toBe(s);
  });
});
