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
