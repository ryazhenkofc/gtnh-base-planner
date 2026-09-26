import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { BLOCKS } from '../../src/data/blocks';
import { localCells } from '../../src/model/geometry';
import type { MultiblockDef } from '../../src/model/types';
import {
  convertDump,
  formatJson,
  generatedBlockId,
  isDumpMeta,
  parseDump,
  slugify,
  sourceUrl,
  validateDef,
  type BlockMap,
  type DumpDoc,
} from './convert';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');
const blockMap = JSON.parse(readFileSync(join(here, 'block-map.json'), 'utf8')) as BlockMap;

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtures, name), 'utf8'));
}

function charAt(def: MultiblockDef, [x, y, z]: readonly [number, number, number]): string {
  return def.layers[y][z][x];
}

/** A real-shaped dump: controller at d=[0,0,0] facing north, negative offsets, hatch-only cell. */
function syntheticDump(): DumpDoc {
  const blocks: DumpDoc['variants'][number]['blocks'] = [];
  // 3x3x3 box around the controller, which sits in the middle of the north face.
  for (let y = -1; y <= 1; y++)
    for (let z = 0; z <= 2; z++)
      for (let x = -1; x <= 1; x++) {
        if (x === 0 && y === 0 && z === 1) continue; // hollow centre
        if (x === 0 && y === 0 && z === 0)
          blocks.push({ d: [0, 0, 0], block: 'gregtech:gt.blockmachines', meta: 1234 });
        else if (x === 1 && y === 1 && z === 2)
          continue; // hatch-only cell, no casing placed
        else blocks.push({ d: [x, y, z], block: 'gregtech:gt.blockcasings2', meta: 0 });
      }
  return {
    schema: 2,
    controller: {
      registry_name: 'gregtech:gt.blockmachines',
      meta: 1234,
      display_name: 'Test Chamber (Mk. II)',
      source_class: 'gtPlusPlus.xmod.gregtech.common.tileentities.machines.multi.TestChamber$Inner',
    },
    variants: [
      {
        trigger_stack_size: 1,
        channels: { gt_no_hatch: 1 },
        blocks,
        hints: [{ d: [-1, -1, 1], hint: 1 }],
        hatch_slots: [
          { d: [-1, -1, 1], kinds: ['InputBus', 'Energy', 'CryotheumHatch'] },
          { d: [1, 1, 2], kinds: ['Muffler'] },
        ],
        bbox: [3, 3, 3],
      },
    ],
    substitutions: {},
    failures: [],
  };
}

describe('upstream fixtures', () => {
  it('ship with their Apache-2.0 notice', () => {
    const notice = readFileSync(join(fixtures, 'NOTICE'), 'utf8');
    expect(notice).toContain('Apache License, Version 2.0');
    expect(notice).toContain('gtnh-process-line-solver');
  });

  it('recognises _meta.json as a run summary, not a controller', () => {
    expect(isDumpMeta(fixture('_meta.json'))).toBe(true);
    expect(isDumpMeta(fixture('gregtech_machine_1000.json'))).toBe(false);
  });

  it('converts the Electric Blast Furnace', () => {
    const { def, warnings } = convertDump(parseDump(fixture('gregtech_machine_1000.json')), { blockMap });
    expect(validateDef(def)).toEqual([]);
    expect(() => localCells(def)).not.toThrow();
    expect(def.id).toBe('electric-blast-furnace');
    expect(def.size).toEqual([3, 4, 3]);
    expect(def.controller).toEqual({ pos: [1, 0, 0], facing: 'north', blockId: 'gt.controller' });
    expect(charAt(def, [1, 0, 0])).toBe('~');
    // Coil ring layers keep an air core; the fixture's hint positions become hatch cells.
    expect(charAt(def, [1, 1, 1])).toBe('-');
    expect(charAt(def, [1, 2, 1])).toBe('-');
    expect(def.legend[charAt(def, [0, 1, 0])].blockId).toBe('gt.coil.cupronickel');
    const bottom = def.legend[charAt(def, [0, 0, 0])];
    expect(bottom.blockId).toBe('gt.casing.heatProof');
    expect(bottom.hatches).toEqual(['itemIn', 'itemOut', 'fluidIn', 'fluidOut', 'energy', 'maintenance']);
    expect(def.legend[charAt(def, [1, 3, 1])].hatches).toBeUndefined();
    expect(def.hatchBlocks.energy).toBe('gt.hatch.energy');
    expect(def.defaultHatches).toEqual(['itemIn', 'itemOut', 'fluidIn', 'fluidOut', 'energy', 'maintenance']);
    expect(def.shareableHatches).toEqual([]);
    expect(def.wallshare).toBe(true); // west/east faces match block for block
    expect(def.source).toBe(
      'https://github.com/GTNewHorizons/GT5-Unofficial/blob/master/src/main/java/gregtech/common/tileentities/machines/multi/MTEElectricBlastFurnace.java',
    );
    expect(def.notes).toContain('Channel "coil"');
    expect(warnings.some((w) => w.includes('unmapped'))).toBe(false);
  });

  it('converts the Vacuum Freezer, flagging the placeholder casing meta', () => {
    const { def, warnings } = convertDump(parseDump(fixture('gregtech_machine_1001.json')), { blockMap });
    expect(validateDef(def)).toEqual([]);
    expect(() => localCells(def)).not.toThrow();
    expect(def.size).toEqual([3, 3, 3]);
    expect(def.controller.pos).toEqual([1, 1, 0]);
    expect(charAt(def, [1, 1, 1])).toBe('-');
    // gt.blockcasings:12 is not Frost Proof in GT5U (that is gt.blockcasings2:1); the fixture meta is a placeholder.
    const id = generatedBlockId('gregtech:gt.blockcasings', 12);
    expect(Object.values(def.legend).map((e) => e.blockId)).toContain(id);
    expect(warnings.some((w) => w.includes('unmapped block gregtech:gt.blockcasings:12'))).toBe(true);
    expect(def.wallshare).toBe(true);
  });

  it('every converted cell round-trips through geometry.localCells', () => {
    for (const f of ['gregtech_machine_1000.json', 'gregtech_machine_1001.json']) {
      const doc = parseDump(fixture(f), f);
      const { def } = convertDump(doc, { blockMap });
      const cells = localCells(def);
      const solid = cells.filter((c) => c.role !== 'air').length;
      expect(solid).toBe(doc.variants[0].blocks.length);
    }
  });
});

describe('convertDump on a real-shaped dump', () => {
  const doc = syntheticDump();
  const { def, warnings } = convertDump(doc, { blockMap, shareableHatches: ['itemIn', 'dynamo'] });

  it('re-anchors controller-relative offsets at the min corner', () => {
    expect(validateDef(def)).toEqual([]);
    expect(() => localCells(def)).not.toThrow();
    expect(def.size).toEqual([3, 3, 3]);
    expect(def.controller.pos).toEqual([1, 1, 0]);
    expect(charAt(def, [1, 1, 1])).toBe('-');
  });

  it('maps hatch kinds and reports the ones it drops', () => {
    const slot = def.legend[charAt(def, [0, 0, 1])];
    expect(slot).toEqual({ blockId: 'gt.casing.solidSteel', hatches: ['itemIn', 'energy'] });
    expect(warnings.some((w) => w.includes('CryotheumHatch'))).toBe(true);
    // A hatch-only element with no casing gets the hatch block itself.
    expect(def.legend[charAt(def, [2, 2, 2])]).toEqual({ blockId: 'gt.hatch.muffler', hatches: ['muffler'] });
    expect(def.shareableHatches).toEqual(['itemIn']); // dynamo is not present
  });

  it('slugs the name and links the GT5U source of the outer class', () => {
    expect(def.id).toBe('test-chamber-mk-ii');
    expect(def.source).toBe(
      'https://github.com/GTNewHorizons/GT5-Unofficial/blob/master/src/main/java/gtPlusPlus/xmod/gregtech/common/tileentities/machines/multi/TestChamber.java',
    );
  });

  it('wallshare is false once no face pair matches', () => {
    // Make every face pair differ: controller sits on north, muffler-hatch block on the south/east/top corner.
    expect(def.wallshare).toBe(false);
    expect(warnings.some((w) => w.includes('wallshare=false'))).toBe(true);
  });

  it('marks unenclosed gaps as outside the structure', () => {
    const open = syntheticDump();
    // Remove a face-centre block so the core connects to the outside.
    open.variants[0].blocks = open.variants[0].blocks.filter(
      (b) => !(b.d[0] === 0 && b.d[1] === 0 && b.d[2] === 2),
    );
    const { def: d2 } = convertDump(open, { blockMap });
    expect(charAt(d2, [1, 1, 2])).toBe(' ');
    expect(charAt(d2, [1, 1, 1])).toBe(' ');
  });

  it('uses hint dots as hatch cells only when asked', () => {
    const v1 = syntheticDump();
    v1.variants[0].hatch_slots = [];
    const plain = convertDump(v1, { blockMap });
    expect(Object.values(plain.def.legend).some((e) => e.hatches)).toBe(false);
    expect(plain.warnings.some((w) => w.includes('hint dots ignored'))).toBe(true);
    const fb = convertDump(v1, { blockMap, hintFallbackKinds: ['fluidIn', 'itemIn'] });
    expect(fb.def.legend[charAt(fb.def, [0, 0, 1])].hatches).toEqual(['itemIn', 'fluidIn']);
  });

  it('selects variants by trigger stack', () => {
    const multi = syntheticDump();
    const bigger = structuredClone(multi.variants[0]);
    bigger.trigger_stack_size = 2;
    bigger.blocks.push({ d: [0, 2, 1], block: 'gregtech:gt.blockcasings2', meta: 0 });
    bigger.bbox = [3, 4, 3];
    multi.variants = [bigger, multi.variants[0]];
    expect(convertDump(multi, { blockMap }).def.size).toEqual([3, 3, 3]);
    expect(convertDump(multi, { blockMap, variant: 'last' }).def.size).toEqual([3, 4, 3]);
    expect(convertDump(multi, { blockMap, variant: 'largest' }).def.size).toEqual([3, 4, 3]);
    expect(convertDump(multi, { blockMap, variant: 2 }).def.size).toEqual([3, 4, 3]);
    expect(() => convertDump(multi, { blockMap, variant: 7 })).toThrow(/no variant with trigger stack 7/);
  });

  it('grows the box for hatch-only cells outside the scanned blocks', () => {
    const top = syntheticDump();
    top.variants[0].hatch_slots.push({ d: [0, 2, 1], kinds: ['Muffler'] });
    const { def: d2, warnings: w2 } = convertDump(top, { blockMap });
    expect(d2.size).toEqual([3, 4, 3]);
    expect(d2.legend[charAt(d2, [1, 3, 1])]).toEqual({ blockId: 'gt.hatch.muffler', hatches: ['muffler'] });
    expect(charAt(d2, [0, 3, 0])).toBe(' ');
    expect(w2.some((w) => w.includes('disagrees'))).toBe(true);
  });

  it('flags non-controller machine blocks as unmapped', () => {
    const pipe = syntheticDump();
    pipe.variants[0].blocks.push({ d: [0, -2, 1], block: 'gregtech:gt.blockmachines', meta: 5101 });
    const { def: d2, warnings: w2 } = convertDump(pipe, { blockMap });
    expect(d2.legend[charAt(d2, [1, 0, 1])].blockId).toBe('ext.gregtech.gt.blockmachines.5101');
    expect(w2.some((w) => w.includes('unmapped block gregtech:gt.blockmachines:5101'))).toBe(true);
    expect(d2.controller.blockId).toBe('gt.controller');
  });
});

describe('parseDump', () => {
  it('rejects malformed documents with a path', () => {
    expect(() => parseDump([], 'x.json')).toThrow(/x\.json: not a JSON object/);
    const bad = fixture('gregtech_machine_1001.json') as { variants: { blocks: { d: unknown }[] }[] };
    bad.variants[0].blocks[3].d = [1, 2];
    expect(() => parseDump(bad, 'vf.json')).toThrow(/vf\.json: variants\[0\]\.blocks\[3\]\.d/);
  });

  it('defaults optional arrays (schema v1 has no hatch_slots)', () => {
    const v1 = fixture('gregtech_machine_1001.json') as Record<string, unknown> & {
      variants: Record<string, unknown>[];
    };
    v1.schema = 1;
    delete v1.variants[0].hatch_slots;
    delete v1.substitutions;
    const doc = parseDump(v1);
    expect(doc.variants[0].hatch_slots).toEqual([]);
    expect(convertDump(doc, { blockMap }).warnings.some((w) => w.includes('schema 1'))).toBe(true);
  });
});

describe('block-map.json', () => {
  it('only maps to block ids registered in src/data/blocks.ts', () => {
    for (const [key, id] of Object.entries(blockMap.blocks)) {
      expect(key).toMatch(/^[^:]+:[^:]+:(\d+|\*)$/);
      expect(BLOCKS[id], `${key} -> ${id}`).toBeDefined();
    }
  });
});

describe('helpers', () => {
  it('slugify / sourceUrl', () => {
    expect(slugify('  Électric -- Blast!! ')).toBe('electric-blast');
    expect(slugify('???')).toBe('multiblock');
    expect(sourceUrl('com.example.Foo')).toBeUndefined();
  });

  it('formatJson inlines what fits and stays valid JSON', () => {
    const { def } = convertDump(parseDump(fixture('gregtech_machine_1000.json')), { blockMap });
    const text = formatJson(def);
    expect(JSON.parse(text)).toEqual(def);
    expect(text).toContain('"size": [3, 4, 3]');
    expect(text).toContain('["A~A", "ABA", "AAA"]');
    for (const line of text.split('\n'))
      if (!line.includes('"notes"') && !line.includes('"source"'))
        expect(line.length).toBeLessThanOrEqual(110);
  });

  it('validateDef catches broken defs', () => {
    const { def } = convertDump(parseDump(fixture('gregtech_machine_1001.json')), { blockMap });
    const broken = structuredClone(def) as MultiblockDef;
    broken.layers[0][0] = 'AZ';
    broken.controller = { ...broken.controller, pos: [0, 0, 0] };
    const problems = validateDef(broken);
    expect(problems.some((p) => p.includes('length 3'))).toBe(true);
    expect(problems.some((p) => p.includes('controller.pos'))).toBe(true);
  });
});

// The CLI imports .ts files through Node's built-in type stripping (Node >= 22.18 / 23.6).
const nodeStripsTypes = Boolean((process.features as { typescript?: unknown }).typescript);

describe.skipIf(!nodeStripsTypes)('convert.mjs CLI', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'extractor-'));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const cli = join(here, 'convert.mjs');

  it('converts the fixture directory into valid defs', () => {
    const out = join(tmp, 'out');
    execFileSync(process.execPath, [cli, '--in', fixtures, '--out', out], { encoding: 'utf8' });
    const files = readdirSync(out).sort();
    expect(files).toEqual(['_report.json', 'electric-blast-furnace.json', 'vacuum-freezer.json']);
    for (const f of files.filter((n) => !n.startsWith('_'))) {
      const def = JSON.parse(readFileSync(join(out, f), 'utf8')) as MultiblockDef;
      expect(validateDef(def)).toEqual([]);
      expect(() => localCells(def)).not.toThrow();
    }
    const report = JSON.parse(readFileSync(join(out, '_report.json'), 'utf8'));
    expect(report.packVersion).toBe('2.9.0-beta-1');
    expect(report.report).toHaveLength(2);
    expect(report.failures).toEqual([]);
  });

  it('reports bad flags as usage errors', () => {
    for (const extra of [
      ['--variant', 'foo'],
      ['--block-map', join(tmp, 'missing.json')],
    ]) {
      let status = 0;
      try {
        execFileSync(process.execPath, [cli, '--in', fixtures, '--out', join(tmp, 'bad'), ...extra], {
          stdio: 'pipe',
        });
      } catch (e) {
        status = (e as { status: number }).status;
      }
      expect(status).toBe(2);
    }
  });

  it('refuses to write into src/data/multiblocks', () => {
    const target = join(here, '..', '..', 'src', 'data', 'multiblocks');
    const snapshot = () =>
      readdirSync(target)
        .map((f) => `${f}:${statSync(join(target, f)).mtimeMs}`)
        .sort();
    const before = snapshot();
    let status = 0;
    try {
      execFileSync(process.execPath, [cli, '--in', fixtures, '--out', target], { stdio: 'pipe' });
    } catch (e) {
      status = (e as { status: number }).status;
    }
    expect(status).toBe(2);
    // The hand-made catalog has files with the same names; none may be created or touched.
    expect(snapshot()).toEqual(before);
  });
});
