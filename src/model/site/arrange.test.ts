import { describe, expect, it } from 'vitest';
import { arrangeSite } from './arrange';
import { createSiteBuilder, localFootprints } from './build';
import type { SiteGroup, SiteState } from './types';

function g(id: string, multiblockId: string, count = 1): SiteGroup {
  return {
    id,
    multiblockId,
    count,
    limits: { x: null, y: 1, z: null },
    enabledHatches: [],
    origin: [0, 0],
    rotation: 0,
  };
}

function chain(): SiteState {
  const res = (name: string) => ({ kind: 'item' as const, name, color: '#888888' });
  return {
    v: 1,
    kind: 'site',
    size: [30, 30],
    corridor: 2,
    groups: [
      g('d', 'vacuum-freezer'),
      g('a', 'electric-blast-furnace', 2),
      g('b', 'large-chemical-reactor'),
      g('c', 'implosion-compressor'),
    ],
    links: [
      { id: '1', from: { group: 'a' }, to: { group: 'b' }, resource: 'r1' },
      { id: '2', from: { group: 'a' }, to: { group: 'c' }, resource: 'r2' },
      { id: '3', from: { group: 'b' }, to: { group: 'd' }, resource: 'r3' },
      { id: '4', from: { group: 'c' }, to: { group: 'd' }, resource: 'r4' },
      // A recycling loop back to the start must not break the layering.
      { id: '5', from: { group: 'd' }, to: { group: 'a' }, resource: 'r5' },
    ],
    ports: [],
    resources: { r1: res('1'), r2: res('2'), r3: res('3'), r4: res('4'), r5: res('5') },
    colors: {},
  };
}

describe('arrangeSite', () => {
  it('orders groups west to east along the flow, without overlaps, inside the site', () => {
    const site = chain();
    const build = createSiteBuilder();
    const sizes = localFootprints(build(site, { pipes: false, cables: false }));
    const r = arrangeSite(site, (id) => sizes.get(id));
    expect(r.fits).toBe(true);
    const x = Object.fromEntries(r.groups.map((gr) => [gr.id, gr.origin[0]]));
    expect(x.a).toBeLessThan(x.b);
    expect(x.a).toBeLessThan(x.c);
    expect(x.b).toBeLessThan(x.d);
    expect(x.b).toBe(x.c);
    const placed = build({ ...site, groups: r.groups }, { pipes: true, cables: false });
    expect(placed.warnings.filter((w) => w.type === 'overlap' || w.type === 'outside')).toEqual([]);
    for (const n of placed.nets) expect(n.route!.connected).toBe(n.route!.total);
    // The west edge is left for the input ports.
    for (const gr of placed.groups) expect(gr.min[0]).toBeGreaterThanOrEqual(3);
  });

  it('reports the size it needs when the site is too small', () => {
    const site = { ...chain(), size: [12, 12] as [number, number] };
    const r = arrangeSite(site, () => [5, 5]);
    expect(r.fits).toBe(false);
    expect(r.needed[0]).toBeGreaterThan(12);
  });

  it('splits a column that is too deep and turns groups to fit', () => {
    const site: SiteState = { ...chain(), links: [], size: [40, 20] };
    const r = arrangeSite(site, () => [4, 9]);
    const xs = new Set(r.groups.map((gr) => gr.origin[0]));
    expect(xs.size).toBeGreaterThan(1);
    for (const gr of r.groups) expect(gr.origin[1]).toBeGreaterThanOrEqual(2);
  });
});
