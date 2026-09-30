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

  it('routes each distinct layout once, however often the annealer comes back to it', () => {
    let routed = 0;
    const counting = stub(() => 1);
    const builder: SiteBuilder = (s, o) => {
      if (o.pipes) routed++;
      return counting(s, o);
    };
    const r = optimizeSite(arranged(), builder, { iterations: 3000, refineSteps: 300 });
    // The start layout plus every different one that was tried.
    expect(routed).toBe(r.tried + 1);
  });

  it('polishes with the router: finds what the estimate alone cannot see', () => {
    // The router pays for every block a group stands south; the annealer's estimate knows nothing of that.
    const north = stub((s) => s.groups.reduce((t, g) => t + g.origin[1], 0));
    const start = arranged();
    const explore = optimizeSite(start, north, { iterations: 0, refineSteps: 0 });
    expect(explore.improved).toBe(false);
    const polish = optimizeSite(start, north, { iterations: 0, refineSteps: 400, refineRuns: 1 });
    expect(polish.improved).toBe(true);
    expect(polish.result.blocks).toBeLessThan(polish.start.blocks);
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

describe('optimizeSite with repacking', () => {
  /** A chain of groups of several units: each can be packed in rows or layers. */
  function crowded(): SiteState {
    const r = (name: string) => res(name);
    return {
      v: 1,
      kind: 'site',
      size: [60, 40],
      corridor: 2,
      groups: [
        group('d', 'vacuum-freezer', 2),
        group('a', 'electric-blast-furnace', 4),
        group('b', 'large-chemical-reactor', 3),
        group('c', 'implosion-compressor', 2),
      ],
      links: [
        { id: '1', from: { group: 'a' }, to: { group: 'b' }, resource: 'r1' },
        { id: '2', from: { group: 'a' }, to: { group: 'c' }, resource: 'r2' },
        { id: '3', from: { group: 'b' }, to: { group: 'd' }, resource: 'r3' },
        { id: '4', from: { group: 'c' }, to: { group: 'd' }, resource: 'r4' },
      ],
      ports: [],
      resources: { r1: r('1'), r2: r('2'), r3: r('3'), r4: r('4') },
      colors: {},
    };
  }

  function laidOut() {
    const builder = createSiteBuilder();
    const site = crowded();
    const sizes = localFootprints(builder(site, { pipes: false, cables: false }));
    return { builder, site: { ...site, groups: arrangeSite(site, (id) => sizes.get(id)).groups } };
  }

  it('never does worse than the arranged start after real routing, and builds clean', () => {
    const { builder, site } = laidOut();
    const r = optimizeSite(site, builder, { refineSteps: 120, refineRuns: 1 });
    expect(better(r.start, r.result)).toBe(false);
    // The arrangement it was given is the fallback: handed back untouched unless something beat it.
    if (!r.improved) expect(r.site).toBe(site);
    const build = builder(r.site, { pipes: true, cables: true });
    expect(scoreBuild(build)).toEqual(r.result);
    for (const n of build.nets) expect(n.route!.connected).toBe(n.route!.total);
    expect(build.warnings.filter((w) => w.type === 'overlap' || w.type === 'outside')).toEqual([]);
    // Repacking never changes what is built: same machines, same counts.
    expect(r.site.groups.map((g) => [g.id, g.multiblockId, g.count])).toEqual(
      site.groups.map((g) => [g.id, g.multiblockId, g.count]),
    );
    expect(build.groups.every((pg) => pg.build!.pack.placed === pg.group.count)).toBe(true);
  });

  it('repacks groups on a chain where that shortens the pipes, and says how many', () => {
    const { builder, site } = laidOut();
    const r = optimizeSite(site, builder, { refineSteps: 300, refineRuns: 1 });
    expect(r.improved).toBe(true);
    const changed = r.site.groups.filter(
      (g, i) => JSON.stringify(g.limits) !== JSON.stringify(site.groups[i].limits),
    );
    expect(r.reshaped).toBe(changed.length);
  });

  it('keeps every group’s limits when repacking is switched off', () => {
    const { builder, site } = laidOut();
    const r = optimizeSite(site, builder, { refineSteps: 120, refineRuns: 1, reshape: false });
    expect(r.reshaped).toBe(0);
    expect(r.site.groups.map((g) => g.limits)).toEqual(site.groups.map((g) => g.limits));
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
