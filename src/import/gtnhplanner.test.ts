import { describe, expect, it } from 'vitest';
import { catalog } from '../data/catalog';
import { multiblockForName } from '../data/gtnhplanner-machines';
import { createSiteBuilder } from '../model/site/build';
import { validateSiteState } from '../share/siteCodec';
import fixture from './__fixtures__/gtnhplanner-titanium.json';
import { ImportError, buildSiteFromGtnh, fallbackColor, importRows, parseGtnhProject } from './gtnhplanner';

const text = JSON.stringify(fixture);

describe('parseGtnhProject', () => {
  it('reads recipes, nodes, storages and edges and skips malformed entries', () => {
    const p = parseGtnhProject(text);
    expect(p.name).toBe('Titanium line (test fixture)');
    expect(p.recipes.size).toBe(8);
    expect(p.nodes).toHaveLength(9);
    expect(p.storages).toHaveLength(3);
    expect(p.edges).toHaveLength(13);
    expect(p.skipped).toBe(1);
    const cr = p.recipes.get('gt:chem:ticl4')!;
    expect(cr.inputs[3].consumed).toBe(false);
    expect(cr.handlers.map((h) => h.label)).toEqual(['Chemical Reactor', 'Large Chemical Reactor']);
  });

  it('explains what is wrong with other input', () => {
    expect(() => parseGtnhProject('')).toThrow(ImportError);
    expect(() => parseGtnhProject('{"a":')).toThrow(/not JSON/);
    expect(() => parseGtnhProject('{"nodes": 3}')).toThrow(/does not look like/);
    // A community download wraps the project.
    expect(parseGtnhProject(JSON.stringify({ plan: fixture })).nodes).toHaveLength(9);
  });
});

describe('machine mapping', () => {
  it('matches catalog names and aliases', () => {
    for (const d of catalog) expect(multiblockForName(d.name)).toBe(d.id);
    expect(multiblockForName('Blast Furnace')).toBe('electric-blast-furnace');
    expect(multiblockForName('LCR')).toBe('large-chemical-reactor');
    expect(multiblockForName('Oil Cracker')).toBe('oil-cracking-unit');
    expect(multiblockForName('Multiblock Electrolyzer')).toBe('industrial-electrolyzer');
    expect(multiblockForName('Multiblock Centrifuge')).toBe('industrial-centrifuge');
  });

  it('shows machines missing from the catalog as placeholders', () => {
    const data = JSON.parse(text);
    data.recipes.find((r: { id: string }) => r.id === 'gt:centrifuge:co').machineType = 'Mega Blast Furnace';
    const p = parseGtnhProject(JSON.stringify(data));
    expect(importRows(p).find((r) => r.node.id === 'n5')!.proposed).toEqual({ type: 'placeholder' });
    const { site, report } = buildSiteFromGtnh(p);
    expect(report.placeholders).toEqual(['Mega Blast Furnace']);
    expect(site.groups.find((g) => g.multiblockId === 'placeholder')?.label).toBe('Mega Blast Furnace');
  });

  it('proposes a machine per node', () => {
    const rows = importRows(parseGtnhProject(text));
    const by = Object.fromEntries(rows.map((r) => [r.node.id, r]));
    expect(by.n0.proposed).toEqual({ type: 'port' });
    // The node picked the Large Chemical Reactor handler.
    expect(by.n1.proposed).toEqual({ type: 'multiblock', id: 'large-chemical-reactor' });
    expect(by.n1.count).toBe(2);
    expect(by.n2.proposed).toEqual({ type: 'multiblock', id: 'electric-blast-furnace' });
    expect(by.n2.count).toBe(3);
    expect(by.n3.count).toBe(1);
    expect(by.n4.proposed).toEqual({ type: 'single' });
    expect(by.n5.proposed).toEqual({ type: 'multiblock', id: 'industrial-centrifuge' });
    expect(by.n6.proposed).toEqual({ type: 'skip' });
    expect(by.n7).toBeUndefined();
    expect(by.n8.proposed).toEqual({ type: 'multiblock', id: 'large-gas-turbine' });
  });
});

describe('buildSiteFromGtnh', () => {
  it('turns the chain into a valid, arranged site with ports for what enters and leaves', () => {
    const { site, report } = buildSiteFromGtnh(parseGtnhProject(text));
    expect(() => validateSiteState(site)).not.toThrow();
    expect(report).toMatchObject({
      groups: 6,
      aspects: 1,
      placeholders: [],
      truncated: false,
    });
    expect(site.groups.map((g) => g.multiblockId)).toEqual([
      'large-chemical-reactor',
      'electric-blast-furnace',
      'vacuum-freezer',
      'single-block',
      'industrial-centrifuge',
      'large-gas-turbine',
    ]);
    const name = (k: string) => site.resources[k]?.name;
    const ports = site.ports.map((p) => `${p.dir} ${name(p.resource)}${p.void ? ' (void)' : ''}`).sort();
    expect(ports).toEqual(['in Benzene', 'in Rutile Dust', 'out Oxygen (void)', 'out Titanium Ingot']);
    // The chlorine buffer is passed through: electrolyzer -> LCR directly.
    const chlorine = site.links.find((l) => l.resource === 'fluid:chlorine')!;
    expect(chlorine.from).toEqual({ group: 'g4' });
    expect(chlorine.to).toEqual({ group: 'g1' });
    expect(chlorine.rate).toBe(240);
    // Power from the turbine to the furnaces.
    expect(site.links.find((l) => l.resource === 'power:eu')).toMatchObject({
      from: { group: 'g6' },
      to: { group: 'g2' },
    });
    // Non-consumed inputs (programmed circuits) get no port.
    expect(Object.values(site.resources).some((r) => r.name === 'Programmed Circuit')).toBe(false);
  });

  it('builds and routes the imported site without overlaps', () => {
    const { site } = buildSiteFromGtnh(parseGtnhProject(text));
    const b = createSiteBuilder()(site, { pipes: true, cables: true });
    expect(
      b.warnings.filter((w) => w.type === 'overlap' || w.type === 'outside' || w.type === 'error'),
    ).toEqual([]);
    const connected = b.nets.reduce((s, n) => s + (n.route?.connected ?? 0), 0);
    const total = b.nets.reduce((s, n) => s + (n.route?.total ?? 0), 0);
    expect(connected / total).toBeGreaterThan(0.9);
  });

  it('follows overrides and grows a small site', () => {
    const p = parseGtnhProject(text);
    const { site, report } = buildSiteFromGtnh(
      p,
      new Map([
        ['n4', { type: 'skip' }],
        ['n5', { type: 'single' }],
      ]),
      { size: [12, 12] },
    );
    expect(site.groups.map((g) => g.multiblockId)).not.toContain('industrial-centrifuge');
    expect(report.skipped).toBe(3); // n4 by choice, n6 (Thaumcraft) and n7 (disabled)
    expect(site.size[0]).toBeGreaterThan(12);
    // With the electrolyzer skipped, magnesium enters and magnesium chloride leaves through ports.
    const names = site.ports.map((x) => site.resources[x.resource].name);
    expect(names).toContain('Magnesium Dust');
    expect(names).toContain('Magnesiumchloride Dust');
  });

  it('keeps GTNH Planner icon paths and drops anything else', () => {
    const p = parseGtnhProject(text);
    const { site } = buildSiteFromGtnh(p);
    expect(site.resources['fluid:chlorine'].icon).toMatch(/^\/datasets\/gtnh\/.+\/chlorine-[0-9a-f]+\.png$/);
    expect(site.resources['power:eu'].icon).toBeUndefined();
    const hostile = JSON.parse(text);
    hostile.recipes[1].inputs[0].iconPath = 'https://evil.example/pixel.png';
    const q = parseGtnhProject(JSON.stringify(hostile));
    expect(q.recipes.get('gt:chem:ticl4')!.inputs[0].iconPath).toBeUndefined();
  });

  it('makes stable fallback colours', () => {
    expect(fallbackColor('item:x')).toMatch(/^#[0-9a-f]{6}$/);
    expect(fallbackColor('item:x')).toBe(fallbackColor('item:x'));
    expect(fallbackColor('item:x')).not.toBe(fallbackColor('item:y'));
  });
});
