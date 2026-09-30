import { describe, expect, it } from 'vitest';
import { BLOCKS } from './blocks';
import {
  SINGLE_MACHINES,
  getSingleMachine,
  singleMachineBlockId,
  singleMachineForName,
} from './single-machines';
import { catalog } from './catalog';
import { SINGLE_BLOCK_NAMES, multiblockForName } from './gtnhplanner-machines';
import textures from '../render/textures.json';

const manifest = textures as unknown as {
  tiles: Record<string, unknown>;
  blocks: Record<string, { side?: string; front?: string; flat?: boolean }>;
};

describe('single-block machine looks', () => {
  it('has a unique id and unique names for every machine', () => {
    expect(new Set(SINGLE_MACHINES.map((m) => m.id)).size).toBe(SINGLE_MACHINES.length);
    const names = SINGLE_MACHINES.flatMap((m) => m.names);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n, n).toBe(n.toLowerCase());
  });

  it('gives every machine a block with a textured hull and its own front', () => {
    for (const m of SINGLE_MACHINES) {
      const id = singleMachineBlockId(m.id);
      expect(BLOCKS[id]?.name, id).toBe(m.name);
      const faces = manifest.blocks[id];
      expect(faces?.flat, id).toBeUndefined();
      expect(manifest.tiles[faces?.side ?? ''], id).toBeDefined();
      expect(manifest.tiles[faces?.front ?? ''], id).toBeDefined();
    }
    // Machines do not all look alike.
    const fronts = new Set(SINGLE_MACHINES.map((m) => manifest.blocks[singleMachineBlockId(m.id)].front));
    expect(fronts.size).toBe(SINGLE_MACHINES.length);
  });

  it('finds a look by the names GTNH Planner uses, in any case', () => {
    expect(singleMachineForName('Macerator')?.id).toBe('macerator');
    expect(singleMachineForName(' Tank ')?.id).toBe('tank');
    expect(singleMachineForName('Gas Turbine')?.id).toBe('generator');
    expect(singleMachineForName('Wire Mill')?.id).toBe('wiremill');
    expect(singleMachineForName('Nothing Like It')).toBeUndefined();
    expect(getSingleMachine('macerator')?.name).toBe('Macerator');
    expect(getSingleMachine('nope')).toBeUndefined();
  });

  it('is what the import takes for a single-block machine, and never a catalog multiblock', () => {
    for (const m of SINGLE_MACHINES)
      for (const n of m.names) {
        expect(SINGLE_BLOCK_NAMES.has(n), n).toBe(true);
        expect(multiblockForName(n), n).toBeUndefined();
      }
  });

  it('reads the fuel cells of GT++ by the name the planner gives them', () => {
    expect(multiblockForName('Solid-Oxide Fuel Cell Mk I')).toBe('solid-oxide-fuel-cell-mk-i');
    expect(catalog.some((d) => d.id === 'solid-oxide-fuel-cell-mk-i')).toBe(true);
  });
});
