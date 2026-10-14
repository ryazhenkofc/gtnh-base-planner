import { describe, expect, it } from 'vitest';
import type { MultiblockDef } from '../model/multiblock/types';
import textures from './textures.json';

const files = import.meta.glob<MultiblockDef>('../data/multiblocks/*.json', {
  eager: true,
  import: 'default',
});

describe('texture coverage', () => {
  it('maps every block id a multiblock uses (flat colour counts as mapped)', () => {
    const blocks = textures.blocks as Record<string, unknown>;
    const missing = new Set<string>();
    for (const [path, def] of Object.entries(files)) {
      const ids = [
        ...Object.values(def.legend ?? {}).map((l) => l.blockId),
        def.controller?.blockId,
        ...Object.values(def.hatchBlocks ?? {}),
      ];
      for (const id of ids) if (id && !(id in blocks)) missing.add(`${path}: ${id}`);
    }
    expect([...missing]).toEqual([]);
  });
});
