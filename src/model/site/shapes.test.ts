import { describe, expect, it } from 'vitest';
import { createSiteBuilder } from './build';
import { groupShapes } from './shapes';
import type { SiteGroup, SiteState } from './types';

function group(id: string, multiblockId: string, count: number): SiteGroup {
  return {
    id,
    multiblockId,
    count,
    limits: { x: null, y: 1, z: null },
    enabledHatches: [],
    origin: [4, 4],
    rotation: 0,
  };
}

const site = (groups: SiteGroup[]): SiteState => ({
  v: 1,
  kind: 'site',
  size: [60, 60],
  corridor: 2,
  groups,
  links: [],
  ports: [],
  resources: {},
  colors: {},
});

describe('groupShapes', () => {
  it('offers other packings of a group of several units, each with a measured footprint', () => {
    const s = site([group('a', 'electric-blast-furnace', 6)]);
    const shapes = groupShapes(s, createSiteBuilder(), false).get('a')!;
    expect(shapes.length).toBeGreaterThan(2);
    // The group's own packing is first, and every shape is a different footprint or height.
    expect(shapes[0].limits).toEqual(s.groups[0].limits);
    const keys = shapes.map((sh) => `${sh.size}/${sh.height}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const sh of shapes) {
      expect(sh.size[0]).toBeGreaterThan(0);
      expect(sh.size[1]).toBeGreaterThan(0);
    }
    // Some shape is taller and some is flatter than the start.
    expect(shapes.some((sh) => sh.height > shapes[0].height)).toBe(true);
    expect(shapes.some((sh) => sh.size[0] * sh.size[1] < shapes[0].size[0] * shapes[0].size[1])).toBe(true);
  });

  it('leaves single units and single-block machines alone', () => {
    const s = site([group('a', 'electric-blast-furnace', 1)]);
    expect(groupShapes(s, createSiteBuilder(), false).size).toBe(0);
  });

  it('every offered shape builds with the units it claims, at the footprint it claims', () => {
    const s = site([group('a', 'large-chemical-reactor', 4)]);
    const build = createSiteBuilder();
    const shapes = groupShapes(s, build, false).get('a')!;
    for (const sh of shapes) {
      const pg = build(
        { ...s, groups: [{ ...s.groups[0], limits: sh.limits }] },
        { pipes: false, cables: false },
      ).groups[0];
      expect(pg.build!.pack.placed).toBe(4);
      expect([pg.build!.size[0], pg.build!.size[2], pg.build!.size[1]]).toEqual([
        sh.size[0],
        sh.size[1],
        sh.height,
      ]);
    }
  });
});
