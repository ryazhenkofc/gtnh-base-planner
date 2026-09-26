import { describe, expect, it } from 'vitest';
import { getMultiblock } from '../../data/catalog';
import { PLACEHOLDER_DEF, SINGLE_BLOCK_DEF } from '../../data/generic';
import { validateMultiblockDef } from '../../data/validate';
import { key, toWorld, localCells } from '../geometry';
import type { Rotation, Unit, Vec3 } from '../types';
import { createSiteBuilder, groupIndexOfUnit, hatchKindFor } from './build';
import { buildGroup, groupPoint, placeUnit, withDemand } from './group';
import type { SiteGroup, SiteState } from './types';

const ebf = getMultiblock('electric-blast-furnace')!;
const vf = getMultiblock('vacuum-freezer')!;
const noLimits = { x: null, y: null, z: null };

function group(
  id: string,
  multiblockId: string,
  origin: [number, number],
  extra: Partial<SiteGroup> = {},
): SiteGroup {
  return {
    id,
    multiblockId,
    count: 2,
    limits: { x: null, y: 1, z: null },
    enabledHatches: [],
    origin,
    rotation: 0,
    ...extra,
  };
}

function site(partial: Partial<SiteState>): SiteState {
  return {
    v: 1,
    kind: 'site',
    size: [30, 30],
    corridor: 2,
    groups: [],
    links: [],
    ports: [],
    resources: {
      'item:dust': { kind: 'item', name: 'Steel Dust', color: '#888888' },
      'item:hot': { kind: 'item', name: 'Hot Steel Ingot', color: '#ff8800' },
      'fluid:o2': { kind: 'fluid', name: 'Oxygen', color: '#3fa7d6' },
      'item:ingot': { kind: 'item', name: 'Steel Ingot', color: '#cccccc' },
    },
    colors: {},
    ...partial,
  };
}

describe('generic defs', () => {
  it('are valid multiblock definitions', () => {
    expect(validateMultiblockDef(PLACEHOLDER_DEF)).toEqual([]);
    expect(validateMultiblockDef(SINGLE_BLOCK_DEF)).toEqual([]);
  });
});

describe('group transform', () => {
  it('turns units consistently with the packer geometry', () => {
    const b = buildGroup(ebf, 3, noLimits, ['maintenance'], {});
    for (const r of [0, 1, 2, 3] as Rotation[]) {
      for (const u of b.units) {
        const placed = placeUnit(ebf, u, b.size, r, [7, 4]);
        for (const c of localCells(ebf)) {
          const viaGroup = groupPoint(toWorld(ebf, u, c.local), b.size, r, [7, 4]);
          expect(toWorld(ebf, placed, c.local)).toEqual(viaGroup);
        }
      }
    }
  });

  it('normalises the group to start at the origin', () => {
    const b = buildGroup(ebf, 4, noLimits, [], {});
    const min = [0, 1, 2].map((i) => Math.min(...b.units.map((u) => u.origin[i])));
    expect(min).toEqual([0, 0, 0]);
  });
});

describe('hatch demand', () => {
  it('places one hatch per resource on every unit and tags it', () => {
    const def = withDemand(ebf, { itemIn: ['item:dust'], fluidIn: ['fluid:o2'], itemOut: ['item:hot'] });
    expect(def.requiredHatches?.itemIn?.min).toBe(1);
    const b = buildGroup(ebf, 2, noLimits, [], { itemIn: ['item:dust', 'item:x'], itemOut: ['item:hot'] });
    expect(b.missing).toEqual([]);
    for (const u of b.units)
      for (const r of ['item:dust', 'item:x'])
        expect(
          b.hatches.some((h) => h.kind === 'itemIn' && h.resource === r && h.unitIds.includes(u.id)),
        ).toBe(true);
  });

  it('picks the hatch kind a machine has', () => {
    const steam = getMultiblock('steam-grinder')!;
    const water = { kind: 'fluid' as const, name: 'Steam', color: '#ffffff' };
    expect(hatchKindFor('in', 'fluid:steam', water, steam)).toBe('steamIn');
    expect(hatchKindFor('in', 'fluid:o2', { ...water, name: 'Oxygen' }, ebf)).toBe('fluidIn');
    expect(hatchKindFor('out', 'power:eu', { kind: 'power', name: 'EU', color: '#ffff00' }, ebf)).toBeNull();
    expect(
      hatchKindFor('in', 'item:x', { kind: 'item', name: 'X', color: '#000000' }, SINGLE_BLOCK_DEF),
    ).toBe('itemIn');
  });
});

describe('buildSite', () => {
  const chain = site({
    groups: [group('ebf', 'electric-blast-furnace', [4, 4]), group('vf', 'vacuum-freezer', [16, 4])],
    ports: [
      { id: 'dust', dir: 'in', resource: 'item:dust' },
      { id: 'o2', dir: 'in', resource: 'fluid:o2' },
      { id: 'ingot', dir: 'out', resource: 'item:ingot' },
    ],
    links: [
      { id: 'l1', from: { port: 'dust' }, to: { group: 'ebf' }, resource: 'item:dust', rate: 2 },
      { id: 'l2', from: { port: 'o2' }, to: { group: 'ebf' }, resource: 'fluid:o2' },
      { id: 'l3', from: { group: 'ebf' }, to: { group: 'vf' }, resource: 'item:hot' },
      { id: 'l4', from: { group: 'vf' }, to: { port: 'ingot' }, resource: 'item:ingot' },
    ],
  });

  it('packs groups, places ports on the edges and routes every net', () => {
    const b = createSiteBuilder()(chain, { pipes: true, cables: false });
    expect(b.groups.map((g) => g.units.length)).toEqual([2, 2]);
    expect(b.warnings).toEqual([]);
    expect(b.nets).toHaveLength(4);
    for (const n of b.nets) expect(n.route!.connected).toBe(n.route!.total);
    const dust = b.ports.find((p) => p.port.id === 'dust')!;
    expect(dust.cell[0]).toBe(0);
    expect(b.ports.find((p) => p.port.id === 'ingot')!.cell[0]).toBe(29);
    // The site grid, labels and per-resource colours reach the scene.
    expect(b.scene.site).toEqual({ size: [30, 30] });
    expect(b.scene.labels?.length).toBe(5);
    expect(b.scene.pipes?.map((p) => p.color)).toContain('#ff8800');
    // Pipes stay inside the site, above ground and out of every structure.
    const solid = new Set(b.scene.voxels.map((v) => key(v.pos)));
    for (const n of b.scene.pipes ?? [])
      for (const p of n.paths.flat()) {
        expect(solid.has(key(p))).toBe(false);
        expect(p[0] >= 0 && p[0] < 30 && p[2] >= 0 && p[2] < 30 && p[1] >= 0).toBe(true);
      }
    // Unit ids tell which group a voxel belongs to.
    const ids = b.scene.voxels.flatMap((v) => v.unitIds);
    expect(new Set(ids.map(groupIndexOfUnit))).toEqual(new Set([0, 1]));
  });

  it('reuses group builds between runs and only repacks what changed', () => {
    const build = createSiteBuilder();
    const a = build(chain, { pipes: false, cables: false });
    const moved = {
      ...chain,
      groups: [chain.groups[0], { ...chain.groups[1], origin: [18, 10] as [number, number] }],
    };
    const b = build(moved, { pipes: false, cables: false });
    expect(b.groups[0].build).toBe(a.groups[0].build);
    expect(b.groups[1].build).toBe(a.groups[1].build);
    expect(b.groups[1].min).toEqual([18, 0, 10]);
  });

  it('reports overlapping and out-of-bounds groups', () => {
    const s = site({
      groups: [
        group('a', 'electric-blast-furnace', [2, 2]),
        group('b', 'electric-blast-furnace', [3, 2]),
        group('c', 'vacuum-freezer', [28, 28]),
      ],
    });
    const b = createSiteBuilder()(s, { pipes: false, cables: false });
    expect(b.warnings).toContainEqual({ type: 'overlap', groups: ['a', 'b'] });
    expect(b.warnings).toContainEqual({ type: 'outside', group: 'c' });
    expect(b.scene.voxels.some((v) => v.conflict)).toBe(true);
  });

  it('warns when a machine cannot take a resource', () => {
    const s = site({
      groups: [
        group('coke', 'coke-oven', [4, 4], { count: 1 }),
        group('vf', 'vacuum-freezer', [14, 4], { count: 1 }),
      ],
      resources: { 'power:eu': { kind: 'power', name: 'EU', color: '#ffee00' } },
      links: [{ id: 'l', from: { group: 'coke' }, to: { group: 'vf' }, resource: 'power:eu' }],
    });
    const b = createSiteBuilder()(s, { pipes: true, cables: true });
    expect(b.warnings).toContainEqual({ type: 'unsupported', group: 'coke', resource: 'power:eu' });
  });

  it('gives single-block machines IO on their own faces and fades other nets when isolating', () => {
    const s = site({
      groups: [
        group('mix', 'single-block', [4, 10], { count: 3, limits: noLimits }),
        group('ebf', 'electric-blast-furnace', [14, 10], { count: 1 }),
      ],
      ports: [{ id: 'o2', dir: 'in', resource: 'fluid:o2' }],
      links: [
        { id: 'a', from: { group: 'mix' }, to: { group: 'ebf' }, resource: 'item:dust' },
        { id: 'b', from: { port: 'o2' }, to: { group: 'ebf' }, resource: 'fluid:o2' },
      ],
    });
    const b = createSiteBuilder()(s, { pipes: true, cables: false, isolate: 'fluid:o2' });
    const mix = b.groups[0];
    expect(mix.hatches).toHaveLength(3);
    for (const h of mix.hatches)
      expect(mix.units.some((u: Unit) => key(u.origin) === key(h.cell))).toBe(true);
    // No hatch voxel replaces a single-block machine.
    const machineCells = new Set(mix.units.map((u) => key(u.origin)));
    expect(
      b.scene.voxels.filter((v) => machineCells.has(key(v.pos))).every((v) => v.kind === 'controller'),
    ).toBe(true);
    const dust = b.nets.find((n) => n.resource === 'item:dust')!;
    expect(dust.route!.connected).toBe(4);
    expect(b.scene.pipes!.find((p) => p.id === dust.id)!.dim).toBe(true);
    expect(b.scene.pipes!.find((p) => p.color === '#3fa7d6')!.dim).toBe(false);
  });

  it('merges links of one resource sharing an end into one net', () => {
    const s = site({
      groups: [
        group('a', 'electric-blast-furnace', [2, 2], { count: 1 }),
        group('b', 'vacuum-freezer', [12, 2], { count: 1 }),
        group('c', 'vacuum-freezer', [12, 14], { count: 1 }),
      ],
      links: [
        { id: 'x', from: { group: 'a' }, to: { group: 'b' }, resource: 'item:hot' },
        { id: 'y', from: { group: 'a' }, to: { group: 'c' }, resource: 'item:hot' },
      ],
    });
    const b = createSiteBuilder()(s, { pipes: true, cables: false });
    expect(b.nets).toHaveLength(1);
    expect(b.nets[0].links).toEqual(['x', 'y']);
    expect(b.nets[0].route!.connected).toBe(3);
  });
});

describe('placeholder', () => {
  it('builds like a normal multiblock', () => {
    const b = buildGroup(PLACEHOLDER_DEF, 2, noLimits, ['maintenance'], { fluidIn: ['fluid:o2'] });
    expect(b.units).toHaveLength(2);
    expect(b.hatches.filter((h) => h.kind === 'fluidIn')).not.toHaveLength(0);
    expect(vf.size).toBeDefined();
    const cells: Vec3[] = b.units.map((u) => u.origin);
    expect(cells.length).toBe(2);
  });
});
