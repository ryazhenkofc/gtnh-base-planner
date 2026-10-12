import { describe, expect, it } from 'vitest';
import type { TextureManifest } from '../render/detailed';
import { blockIconFaces } from './catalogView';

const manifest = {
  atlas: { path: '', width: 0, height: 0, tile: 16 },
  tiles: {
    CASING: [0, 0, 16, 16],
    CASING_TOP: [16, 0, 16, 16],
    FRONT: [32, 0, 16, 16],
    PIPE: [48, 0, 16, 16],
  },
  blocks: {
    'gt.casing.solidSteel': { side: 'CASING', top: 'CASING_TOP' },
    'gt.controller': { side: 'CASING', front: 'FRONT' },
    'gt.frame.steel': { flat: true },
    'gt.casing.lost': { side: 'NOT_IN_ATLAS' },
  },
  hatchOverlays: { itemIn: ['PIPE', 'NOT_IN_ATLAS'] },
} as unknown as TextureManifest;

describe('blockIconFaces', () => {
  it('draws a block from its own textures', () => {
    const f = blockIconFaces('gt.casing.solidSteel', undefined, manifest);
    expect(f.top.tiles).toEqual(['CASING_TOP']);
    expect(f.left.tiles).toEqual(['CASING']);
    expect(f.right.tiles).toEqual(['CASING']);
  });

  it('puts a block’s front overlay on the left face only', () => {
    const f = blockIconFaces('gt.controller', undefined, manifest);
    expect(f.left.tiles).toEqual(['CASING', 'FRONT']);
    expect(f.right.tiles).toEqual(['CASING']);
  });

  it('draws a hatch as the casing it replaces with its overlays, skipping tiles the atlas lacks', () => {
    const f = blockIconFaces('gt.hatch.inputBus', { kind: 'itemIn', base: 'gt.casing.solidSteel' }, manifest);
    expect(f.left.tiles).toEqual(['CASING', 'PIPE']);
    expect(f.top.tiles).toEqual(['CASING_TOP']);
  });

  it('goes flat, in the block colour, for untextured blocks and unknown tiles', () => {
    for (const id of ['gt.frame.steel', 'gt.casing.lost', 'unknown:block@0']) {
      const f = blockIconFaces(id, undefined, manifest);
      expect(f.top.tiles).toEqual([]);
      expect(f.left.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('tierSiblings', () => {
  it('lists the tiers of a family and none for a lone multiblock', async () => {
    const { catalog, getMultiblock } = await import('../data/catalog');
    const { tierSiblings } = await import('./catalogView');
    const rig = tierSiblings(getMultiblock('fluid-drilling-rig-ii')!, catalog);
    expect(rig.map((r) => r.label)).toEqual(expect.arrayContaining(['I', 'II', 'III', 'IV']));
    expect(tierSiblings(getMultiblock('coke-oven')!, catalog)).toEqual([]);
    const fusion = tierSiblings(getMultiblock('fusiontech-mk-iv')!, catalog);
    expect(fusion.map((r) => r.id)).toEqual(['fusiontech-mk-iv', 'fusiontech-mk-v']);
    // The families the name rule finds today; a new one must be looked at, then added here (or given a tierGroup).
    const families = new Set(
      catalog
        .map((d) =>
          tierSiblings(d, catalog)
            .map((r) => r.id)
            .join(' '),
        )
        .filter(Boolean),
    );
    expect([...families].sort()).toMatchInlineSnapshot(`
      [
        "compact-fusion-computer-mk-i-prototype compact-fusion-computer-mk-ii compact-fusion-computer-mk-iii compact-fusion-computer-mk-iv-prototype compact-fusion-computer-mk-v",
        "electric-air-filter-t1 electric-air-filter-t2 electric-air-filter-t3",
        "fluid-drilling-rig fluid-drilling-rig-ii fluid-drilling-rig-iii fluid-drilling-rig-iv",
        "fusion-control-computer-mark-i fusion-control-computer-mark-ii fusion-control-computer-mark-iii",
        "fusiontech-mk-iv fusiontech-mk-v",
        "ore-drilling-plant ore-drilling-plant-ii ore-drilling-plant-iii ore-drilling-plant-iv",
        "solid-oxide-fuel-cell-mk-i solid-oxide-fuel-cell-mk-ii",
        "space-assembler-module-mk-i space-assembler-module-mk-ii space-assembler-module-mk-iii",
        "space-mining-module-mk-i space-mining-module-mk-ii space-mining-module-mk-iii",
        "space-pumping-module-mk-i space-pumping-module-mk-ii space-pumping-module-mk-iii",
        "void-miner-i void-miner-ii void-miners",
      ]
    `);
    // every family is made of distinct tier labels
    for (const d of catalog) {
      const labels = tierSiblings(d, catalog).map((r) => r.label);
      expect(new Set(labels).size, d.id).toBe(labels.length);
    }
  });
});
