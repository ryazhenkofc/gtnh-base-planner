import { describe, expect, it } from 'vitest';
import { arrangeSite } from './arrange';
import { createSiteBuilder, localFootprints } from './build';
import type { SiteBuild, SiteBuilder } from './buildTypes';
import { better, optimizeSite, scoreBuild } from './optimize';
import type { SiteState } from './types';

const res = (name: string) => ({ kind: 'item' as const, name, color: '#888888' });

function group(id: string, multiblockId: string, count = 1) {
  return {
    id,
    multiblockId,
    count,
    limits: { x: null, y: 1, z: null },
    enabledHatches: [],
    origin: [0, 0] as [number, number],
    rotation: 0 as const,
  };
}

/** Three stages of three furnaces; every group feeds two of the next stage. */
function web(): SiteState {
  const groups = Array.from({ length: 9 }, (_, i) => group(`g${i}`, 'electric-blast-furnace'));
  const links: SiteState['links'] = [];
  for (let s = 0; s < 2; s++)
    for (let j = 0; j < 3; j++)
      for (const t of new Set([(j * 2 + s) % 3, (j * 3 + 1) % 3])) {
        const id = `l${s}_${j}_${t}`;
        links.push({
          id,
          from: { group: `g${s * 3 + j}` },
          to: { group: `g${(s + 1) * 3 + t}` },
          resource: id,
        });
      }
  return {
    v: 1,
    kind: 'site',
    size: [60, 40],
    corridor: 2,
    groups,
    links,
    ports: [],
    resources: Object.fromEntries(links.map((l) => [l.resource, res(l.resource)])),
    colors: {},
  };
}

/** A builder that measures 6 x 6 groups and scores a layout with `blocks(site)`, no real packing or routing. */
function stub(blocks: (site: SiteState) => number): SiteBuilder {
  return (site) =>
    ({
      groups: site.groups.map((g) => ({
        group: g,
        build: { size: [6, 5, 6] },
        min: [g.origin[0], 0, g.origin[1]],
        max: [g.origin[0] + 6, 5, g.origin[1] + 6],
      })),
      warnings: [],
      stats: { terminals: 4, connected: 4, pipeBlocks: blocks(site), cableBlocks: 0 },
    }) as unknown as SiteBuild;
}

function arranged(): SiteState {
  const site = web();
  return { ...site, groups: arrangeSite(site, () => [6, 6]).groups };
}

describe('optimizeSite', () => {
  it('keeps a layout that routes better than the start, and only then', () => {
    const start = arranged();
    const startKey = JSON.stringify(start.groups.map((g) => g.origin));
    // The router likes whatever lies further west: the result is never worse than the start.
    const lower = optimizeSite(
      start,
      stub((s) => s.groups.reduce((t, g) => t + g.origin[0], 0)),
      {
        iterations: 4000,
      },
    );
    expect(lower.result.blocks).toBeLessThanOrEqual(lower.start.blocks);
    // A router that hates every change keeps the start.
    const same = optimizeSite(
      start,
      stub((s) => (JSON.stringify(s.groups.map((g) => g.origin)) === startKey ? 10 : 100)),
      { iterations: 4000 },
    );
    expect(same.improved).toBe(false);
    expect(same.site).toBe(start);
    expect(same.tried).toBeGreaterThan(0);
  });

  it('takes the annealed layout when the router finds it shorter', () => {
    const start = arranged();
    const startKey = JSON.stringify(start.groups.map((g) => g.origin));
    const r = optimizeSite(
      start,
      stub((s) => (JSON.stringify(s.groups.map((g) => g.origin)) === startKey ? 100 : 10)),
      { iterations: 4000 },
    );
    expect(r.improved).toBe(true);
    expect(r.site.groups).not.toEqual(start.groups);
    expect(r.result.blocks).toBe(10);
  });

  it('reports progress for every layout it routes', () => {
    const seen: [number, number][] = [];
    const r = optimizeSite(
      arranged(),
      stub(() => 1),
      {
        iterations: 3000,
        onProgress: (done, total) => seen.push([done, total]),
      },
    );
    expect(seen.length).toBe(r.tried + 1);
    expect(seen[seen.length - 1]).toEqual([r.tried + 1, r.tried + 1]);
  });

  it('is never worse than the start on real machines, and every net stays connected', () => {
    const builder = createSiteBuilder();
    const site: SiteState = {
      v: 1,
      kind: 'site',
      size: [30, 30],
      corridor: 2,
      groups: [
        group('d', 'vacuum-freezer'),
        group('a', 'electric-blast-furnace', 2),
        group('b', 'large-chemical-reactor'),
        group('c', 'implosion-compressor'),
      ],
      links: [
        { id: '1', from: { group: 'a' }, to: { group: 'b' }, resource: 'r1' },
        { id: '2', from: { group: 'a' }, to: { group: 'c' }, resource: 'r2' },
        { id: '3', from: { group: 'b' }, to: { group: 'd' }, resource: 'r3' },
        { id: '4', from: { group: 'c' }, to: { group: 'd' }, resource: 'r4' },
      ],
      ports: [],
      resources: { r1: res('1'), r2: res('2'), r3: res('3'), r4: res('4') },
      colors: {},
    };
    const sizes = localFootprints(builder(site, { pipes: false, cables: false }));
    const laid = { ...site, groups: arrangeSite(site, (id) => sizes.get(id)).groups };
    const r = optimizeSite(laid, builder, { iterations: 4000 });
    expect(better(r.start, r.result)).toBe(false);
    const build = builder(r.site, { pipes: true, cables: true });
    expect(scoreBuild(build)).toEqual(r.result);
    for (const n of build.nets) expect(n.route!.connected).toBe(n.route!.total);
    expect(build.warnings.filter((w) => w.type === 'overlap' || w.type === 'outside')).toEqual([]);
  });
});

describe('better', () => {
  const base = { problems: 0, unconnected: 0, blocks: 10, span: 20 };
  it('ranks problems, then unconnected terminals, then pipe blocks, then span', () => {
    expect(better({ ...base, problems: 1, blocks: 1 }, base)).toBe(false);
    expect(better({ ...base, problems: 1 }, { ...base, unconnected: 5 })).toBe(false);
    expect(better({ ...base, unconnected: 1 }, { ...base, problems: 1 })).toBe(true);
    expect(better({ ...base, problems: 0 }, { ...base, problems: 1, blocks: 1 })).toBe(true);
    expect(better({ ...base, blocks: 9, span: 99 }, base)).toBe(true);
    expect(better({ ...base, span: 19 }, base)).toBe(true);
    expect(better(base, base)).toBe(false);
  });
});
