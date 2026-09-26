import { describe, expect, it } from 'vitest';
import type { HatchKind, MultiblockDef } from '../model/types';
import { sizedDef } from '../model/resize';
import { catalog } from './catalog';

/**
 * Every catalog structure, cell by cell, against the StructureLib shape in GT5-Unofficial (master,
 * checked 2026-09-26). Shapes and elements are copied from the Java sources linked in each JSON `source`:
 * which block each character is and which hatches (`buildHatchAdder(...).atLeast(...)`) may replace it.
 */

type Cat =
  | { t: 'ctrl' | 'air' | 'any' | 'lavaOrAir' }
  | { t: 'casing'; block: string; hatches: HatchKind[] }
  | { t: 'hatchOnly'; kind: HatchKind }
  | { t: 'casingOrCoil'; block: string; hatches: HatchKind[] };

const casing = (block: string, ...hatches: HatchKind[]): Cat => ({ t: 'casing', block, hatches });
const hatchOnly = (kind: HatchKind): Cat => ({ t: 'hatchOnly', kind });
const [IB, OB, IH, OH, MA, EN, MU]: HatchKind[] = [
  'itemIn',
  'itemOut',
  'fluidIn',
  'fluidOut',
  'maintenance',
  'energy',
  'muffler',
];

/**
 * `transposed`: shape[layer from top][z][x] (StructureLib `transpose(...)`); else shape[z][row from top][x].
 * Resizable multiblocks give the shape as a function of their size (height / length).
 */
type Shape = string[][] | ((size: number) => string[][]);
const GT: Record<string, { transposed: boolean; shape: Shape; el: Record<string, Cat> }> = {
  'big-barrel-brewery': {
    transposed: false,
    shape: [
      ['BBB', 'BBB', 'B~B', 'BBB', 'C C'],
      ['BBB', 'A A', 'A A', 'BBB', '   '],
      ['BBB', 'BAB', 'BAB', 'BBB', 'C C'],
    ],
    el: {
      B: casing('gt.casing.reinforcedWooden', IB, OB, IH, OH, MA, EN),
      A: casing('glass'),
      C: casing('gt.frame.steel'),
    },
  },
  'bricked-blast-furnace': {
    transposed: true,
    shape: [
      ['ccc', 'c-c', 'ccc'],
      ['ccc', 'clc', 'ccc'],
      ['c~c', 'clc', 'ccc'],
      ['ccc', 'ccc', 'ccc'],
    ],
    el: { c: casing('gt.casing.firebricks'), l: { t: 'lavaOrAir' } },
  },
  // One Coke Oven Hatch type with three screwdriver modes.
  'coke-oven': {
    transposed: true,
    shape: [
      ['CCC', 'CCC', 'CCC'],
      ['C~C', 'C-C', 'CCC'],
      ['CCC', 'CCC', 'CCC'],
    ],
    el: { C: casing('gt.cokeOvenBrick', IB, OB, OH) },
  },
  'dissection-apparatus': {
    transposed: false,
    shape: [
      ['CCCCC', 'C   C', 'C   C', 'C   C', 'CC~CC'],
      ['CCCCC', ' BBB ', ' AAA ', ' BBB ', 'CCCCC'],
      ['CCCCC', ' BBB ', ' ABA ', ' BBB ', 'CCCCC'],
      ['CCCCC', ' BBB ', ' AAA ', ' BBB ', 'CCCCC'],
      ['CCCCC', 'C   C', 'C   C', 'C   C', 'CCCCC'],
    ],
    el: { C: casing('gt.casing.cleanStainless', IB, OB, MA, EN), B: casing('itemPipe'), A: casing('glass') },
  },
  // Base piece, three ring layers with an air core, and the top ring closed by a casing (height 5).
  'distillation-tower': {
    transposed: true,
    // Base, then STRUCTURE_PIECE_LAYER up to the top layer, whose centre is a casing.
    shape: (h) => [
      ['lll', 'lcl', 'lll'],
      ...Array.from({ length: h - 2 }, () => ['lll', 'l-l', 'lll']),
      ['b~b', 'bbb', 'bbb'],
    ],
    el: {
      b: casing('gt.casing.cleanStainless', EN, OB, IH, IB, MA),
      l: casing('gt.casing.cleanStainless', OH, EN, MA),
      c: casing('gt.casing.cleanStainless'),
    },
  },
  'electric-blast-furnace': {
    transposed: true,
    shape: [
      ['fff', 'fmf', 'fff'],
      ['CCC', 'C-C', 'CCC'],
      ['CCC', 'C-C', 'CCC'],
      ['b~b', 'bbb', 'bbb'],
    ],
    el: {
      f: casing('gt.casing.heatProof', OH),
      m: hatchOnly(MU),
      C: casing('coil'),
      b: casing('gt.casing.heatProof', IH, OH, IB, OB, MA, EN),
    },
  },
  'implosion-compressor': {
    transposed: true,
    shape: [
      ['CCC', 'CCC', 'CCC'],
      ['C~C', 'C-C', 'CCC'],
      ['CCC', 'CCC', 'CCC'],
    ],
    el: { C: casing('gt.casing.solidSteel', IB, OB, MA, EN, MU) },
  },
  // `x`: a hatch, the casing, or the one required heating coil.
  'large-chemical-reactor': {
    transposed: true,
    shape: [
      ['ccc', 'cxc', 'ccc'],
      ['c~c', 'xPx', 'cxc'],
      ['ccc', 'cxc', 'ccc'],
    ],
    el: {
      c: casing('gt.casing.chemicallyInert', IH, OH, IB, OB, MA, EN),
      P: casing('gt.casing.ptfePipe'),
      x: { t: 'casingOrCoil', block: 'gt.casing.chemicallyInert', hatches: [IH, OH, IB, OB, MA, EN] },
    },
  },
  'large-heat-exchanger': {
    transposed: true,
    shape: [
      ['ccc', 'cCc', 'ccc'],
      ['ccc', 'cPc', 'ccc'],
      ['ccc', 'cPc', 'ccc'],
      ['c~c', 'cHc', 'ccc'],
    ],
    el: {
      c: casing('gt.casing.stableTitanium', IB, IH, OB, OH, MA),
      P: casing('gt.casing.titaniumPipe'),
      C: hatchOnly(OH),
      H: hatchOnly(IH),
    },
  },
  'multi-smelter': {
    transposed: true,
    shape: [
      ['ccc', 'cmc', 'ccc'],
      ['CCC', 'C-C', 'CCC'],
      ['b~b', 'bbb', 'bbb'],
    ],
    el: {
      c: casing('gt.casing.heatProof', MA),
      m: hatchOnly(MU),
      C: casing('coil'),
      b: casing('gt.casing.heatProof', MA, IB, OB, EN),
    },
  },
  'oil-cracking-unit': {
    transposed: true,
    shape: [
      ['lcmcr', 'lcmcr', 'lcmcr'],
      ['lc~cr', 'l---r', 'lcmcr'],
      ['lcmcr', 'lcmcr', 'lcmcr'],
    ],
    el: {
      c: casing('coil'),
      l: casing('gt.casing.cleanStainless', IH, EN, MA),
      r: casing('gt.casing.cleanStainless', OH, EN, MA),
      m: casing('gt.casing.cleanStainless', IH, IB, EN, MA),
    },
  },
  'pyrolyse-oven': {
    transposed: false,
    shape: [
      ['       ', '       ', ' F   F ', 'FBF FBF', 'DBD~DBD', 'GGGGGGG'],
      ['       ', '       ', ' C   C ', 'F FFF F', 'D D D D', 'GCGGGCG'],
      ['       ', '       ', ' C   C ', 'F FFF F', 'D     D', 'GCGGGCG'],
      ['       ', '       ', ' C   C ', 'F FFF F', 'D D D D', 'GCGGGCG'],
      [' E   E ', ' A   A ', ' A   A ', 'FAF FAF', 'DADDDAD', 'GGGGGGG'],
    ],
    el: {
      A: casing('gt.casing.steelPipe'),
      B: casing('gt.casing.steelFirebox'),
      C: casing('coil'),
      D: casing('gt.casing.pyrolyseOven'),
      E: casing('gt.frame.steel'),
      F: casing('gt.casing.pyrolyseOven', IB, IH, MU),
      G: casing('gt.casing.pyrolyseOven', OB, OH, EN, MA),
    },
  },
  'vacuum-freezer': {
    transposed: true,
    shape: [
      ['CCC', 'CCC', 'CCC'],
      ['C~C', 'C-C', 'CCC'],
      ['CCC', 'CCC', 'CCC'],
    ],
    el: { C: casing('gt.casing.frostProof', IH, OH, IB, OB, MA, EN) },
  },
};

/** Tiered blocks: any tier is fine, the catalog shows one. */
const ALIAS: Record<string, string> = {
  'gt.glass.reinforced': 'glass',
  'gt.coil.cupronickel': 'coil',
  'gt.casing.itemPipeTin': 'itemPipe',
};

function gtCells(transposed: boolean, shape: string[][]): Map<string, string> {
  const out = new Map<string, string>();
  shape.forEach((outer, i) =>
    outer.forEach((row, j) =>
      [...row].forEach((ch, x) => {
        // transposed: i = layer from the top, j = z; else i = z, j = row from the top.
        const [y, z] = transposed ? [shape.length - 1 - i, j] : [outer.length - 1 - j, i];
        out.set(`${x},${y},${z}`, ch);
      }),
    ),
  );
  return out;
}

function gtCat(ch: string, el: Record<string, Cat>): Cat {
  if (ch === '~') return { t: 'ctrl' };
  if (ch === '-') return { t: 'air' };
  if (ch === ' ') return { t: 'any' };
  return el[ch];
}

function ourCat(ch: string, def: MultiblockDef): Cat {
  if (ch === '~') return { t: 'ctrl' };
  if (ch === '-') return { t: 'air' };
  if (ch === ' ') return { t: 'any' };
  const e = def.legend[ch];
  if (e.blockId.startsWith('gt.hatch.')) return hatchOnly(e.hatches![0]);
  return casing(ALIAS[e.blockId] ?? e.blockId, ...(e.hatches ?? []));
}

const sorted = (h: HatchKind[]) => [...h].sort();

function sameCell(gt: Cat, ours: Cat): boolean {
  if (gt.t === 'lavaOrAir') return ours.t === 'air';
  if (gt.t === 'casingOrCoil')
    return (
      (ours.t === 'casing' && ours.block === 'coil' && ours.hatches.length === 0) ||
      (ours.t === 'casing' &&
        ours.block === gt.block &&
        sorted(ours.hatches).join() === sorted(gt.hatches).join())
    );
  if (gt.t === 'casing')
    return (
      ours.t === 'casing' &&
      ours.block === gt.block &&
      sorted(ours.hatches).join() === sorted(gt.hatches).join()
    );
  if (gt.t === 'hatchOnly') return ours.t === 'hatchOnly' && ours.kind === gt.kind;
  return ours.t === gt.t;
}

describe('catalog structures match GT5-Unofficial', () => {
  it('has a GT shape for every multiblock', () => {
    expect(catalog.map((d) => d.id).sort()).toEqual(Object.keys(GT).sort());
  });

  for (const raw of catalog) {
    const r = raw.resize;
    const sizes = r ? [...new Set([r.min, r.default, r.max])] : [undefined];
    for (const size of sizes)
      it(size === undefined ? raw.id : `${raw.id} (${r!.label} ${size})`, () => {
        const def = sizedDef(raw, size);
        const { transposed, shape, el } = GT[def.id];
        const gt = gtCells(transposed, typeof shape === 'function' ? shape(size!) : shape);
        const ours = new Map<string, string>();
        def.layers.forEach((layer, y) =>
          layer.forEach((row, z) => [...row].forEach((ch, x) => ours.set(`${x},${y},${z}`, ch))),
        );
        expect([...ours.keys()].sort()).toEqual([...gt.keys()].sort());
        const wrong = [...ours].filter(([k, ch]) => !sameCell(gtCat(gt.get(k)!, el), ourCat(ch, def)));
        expect(wrong.map(([k, ch]) => `${k}: "${ch}" vs GT "${gt.get(k)}"`)).toEqual([]);
      });
  }
});
