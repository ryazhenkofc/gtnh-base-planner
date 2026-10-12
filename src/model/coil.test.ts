import { describe, expect, it } from 'vitest';
import { catalog, getMultiblock } from '../data/catalog';
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

  it('swaps the coil of multiblocks converted from the game, which store the real block id', () => {
    const forge = getMultiblock('dimensionally-transcendent-plasma-forge')!;
    const ids = (d: typeof forge) => Object.values(d.legend).map((e) => e.blockId);
    expect(ids(forge)).toContain('gregtech:gt.blockcasings5@0');
    const k = coiledDef(forge, KANTHAL);
    expect(ids(k)).toContain(KANTHAL);
    expect(ids(k)).not.toContain('gregtech:gt.blockcasings5@0');
  });

  // Checked against each multiblock's GT5-Unofficial source: the ones whose structure uses the heating-coil
  // channel (any coil tier). Fixed coil blocks (Dyson Swarm, Helioflare Power Forge, XL Turbo Plasma Turbine,
  // Integrated Ore Factory, Industrial 3D Copying Machine) are not part of it.
  it('offers the coil choice on exactly the multiblocks whose structure takes any heating coil', () => {
    const withCoil = catalog
      .filter(hasHeatingCoil)
      .map((d) => d.id)
      .sort();
    expect(withCoil).toEqual(
      [
        'digester',
        'dimensionally-transcendent-plasma-forge',
        'electric-blast-furnace',
        'exothermic-hearth',
        'exxonmobil-chemical-plant',
        'hot-isostatic-pressurization-unit',
        'industrial-arc-furnace',
        'industrial-autoclave',
        'industrial-coke-oven',
        'large-chemical-reactor',
        'large-fluid-extractor',
        'large-thermal-refinery',
        'mega-alloy-blast-smelter',
        'mega-oil-cracker',
        'multi-smelter',
        'oil-cracking-unit',
        'planetary-gas-siphon',
        'pyrolyse-oven',
        'utupu-tanuri',
        'volcanus',
        'zyngen',
      ].sort(),
    );
    expect(hasHeatingCoil(getMultiblock('industrial-3d-copying-machine'))).toBe(false);
  });

  it('lists every coil once, default first', () => {
    expect(HEATING_COILS[0].id).toBe(DEFAULT_COIL);
    expect(new Set(HEATING_COILS.map((c) => c.id)).size).toBe(HEATING_COILS.length);
  });
});
