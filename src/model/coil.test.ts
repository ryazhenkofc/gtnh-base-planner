import { describe, expect, it } from 'vitest';
import { getMultiblock } from '../data/catalog';
import { DEFAULT_COIL, HEATING_COILS, coiledDef, hasHeatingCoil } from './coil';

const KANTHAL = 'gregtech:gt.blockcasings5@1';

describe('heating coils', () => {
  it('finds the multiblocks that have them', () => {
    expect(hasHeatingCoil(getMultiblock('electric-blast-furnace')!)).toBe(true);
    expect(hasHeatingCoil(getMultiblock('coke-oven')!)).toBe(false);
  });

  it('swaps only the default coil block, and memoises the result', () => {
    const ebf = getMultiblock('electric-blast-furnace')!;
    const k = coiledDef(ebf, KANTHAL);
    expect(k).toBe(coiledDef(ebf, KANTHAL));
    expect(k.id).toBe(ebf.id);
    const ids = (d: typeof ebf) => Object.values(d.legend).map((e) => e.blockId);
    expect(ids(k)).toContain(KANTHAL);
    expect(ids(k)).not.toContain(DEFAULT_COIL);
    // Everything else in the legend, and the original, stay as they were.
    expect(ids(k).filter((b) => b !== KANTHAL)).toEqual(ids(ebf).filter((b) => b !== DEFAULT_COIL));
    expect(ids(ebf)).toContain(DEFAULT_COIL);
  });

  it('leaves the multiblock alone for the default coil, an unknown id or no coils', () => {
    const ebf = getMultiblock('electric-blast-furnace')!;
    expect(coiledDef(ebf, undefined)).toBe(ebf);
    expect(coiledDef(ebf, DEFAULT_COIL)).toBe(ebf);
    expect(coiledDef(ebf, 'gt.coil.nonsense')).toBe(ebf);
    const coke = getMultiblock('coke-oven')!;
    expect(coiledDef(coke, KANTHAL)).toBe(coke);
  });

  it('lists every coil once, default first', () => {
    expect(HEATING_COILS[0].id).toBe(DEFAULT_COIL);
    expect(new Set(HEATING_COILS.map((c) => c.id)).size).toBe(HEATING_COILS.length);
  });
});
