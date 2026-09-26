#!/usr/bin/env node
/**
 * Generates catalog entries from the GT5-Unofficial Java sources (StructureLib shapes).
 *
 *   node tools/gt-source/generate.mjs <gt5u checkout> [--write] [--verbose]
 *
 * The checkout must be at the tag the catalog follows (5.09.54.133 for GT:NH 2.9.0-beta-3) with
 * src/main/java and the lang files; `git ls-files` must work in it (texture paths come from the index, so
 * a sparse, blob-less clone is enough). See README.md next to this file.
 *
 * construct() is evaluated with a stack size of 1, so multi-piece machines are merged and variable-size ones
 * get their smallest build; machines whose shape is computed at run time are listed as skipped, with the
 * reason. Hand-made catalog entries always win: a class already in src/data/multiblocks/ is never generated
 * again.
 *
 * With --write it writes:
 *   src/data/multiblocks/<id>.json      one MultiblockDef per machine (marked `"generated": true`)
 *   src/data/gt-shapes.generated.json   the raw GT shape + elements per machine, for gt-structures.test.ts
 *   src/data/blocks.generated.json      blocks the hand-made registry does not have
 *   tools/gt-source/textures.generated.json  atlas tiles + block faces for scripts/build-atlas.mjs
 *   tools/texture-sources/*.png         the source files of those tiles (copied from the checkout)
 *   ATTRIBUTION.md                      the list of those files, between the tools/gt-source markers
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pieceName, runConstruct } from './construct.mjs';
import { ElementResolver } from './elements.mjs';
import {
  arrayFields,
  arrayFields1D,
  findCalls,
  intFields,
  matchClose,
  methodBody,
  splitArgs,
  string2D,
  stringFields,
  stripComments,
} from './java.mjs';
import { Registry } from './registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TAG = '5.09.54.133';
const REPO = 'https://github.com/GTNewHorizons/GT5-Unofficial/blob';
const MULTI_DIR = join(ROOT, 'src/data/multiblocks');

const HATCH_BLOCKS = {
  itemIn: 'gt.hatch.inputBus',
  itemOut: 'gt.hatch.outputBus',
  fluidIn: 'gt.hatch.inputHatch',
  fluidOut: 'gt.hatch.outputHatch',
  energy: 'gt.hatch.energy',
  dynamo: 'gt.hatch.dynamo',
  maintenance: 'gt.hatch.maintenance',
  muffler: 'gt.hatch.muffler',
  steamIn: 'gt.hatch.steamInput',
};
const HATCH_ORDER = [
  'itemIn',
  'itemOut',
  'fluidIn',
  'fluidOut',
  'energy',
  'dynamo',
  'maintenance',
  'muffler',
  'steamIn',
];
/** Blocks the test compares by family (any tier is fine), as in gt-structures.test.ts. */
const TEST_ALIAS = {
  'gt.glass.reinforced': 'glass',
  'gt.coil.cupronickel': 'coil',
  'gt.casing.itemPipeTin': 'itemPipe',
};

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function camel(s) {
  return s
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (c) => c.toLowerCase());
}

/** Classes the hand-made catalog already covers (from their `source` links). */
function handMade() {
  const out = new Map();
  for (const f of readdirSync(MULTI_DIR)) {
    const def = JSON.parse(readFileSync(join(MULTI_DIR, f), 'utf8'));
    if (def.generated) continue;
    const cls = /\/(\w+)\.java$/.exec(def.source ?? '')?.[1];
    if (cls) out.set(cls, def.id);
  }
  return out;
}

/**
 * Existing (hand-made) block ids by the texture file of their side, so generated machines reuse them. Tinted
 * tiles (machine metal, frames) are left out: one file serves several blocks there.
 */
async function existingBlocks() {
  const atlas = await import(pathToFileURL(join(ROOT, 'scripts/build-atlas.mjs')).href);
  const blocksTs = readFileSync(join(ROOT, 'src/data/blocks.ts'), 'utf8');
  const ids = new Set([...blocksTs.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));
  const byPath = new Map();
  for (const [id, faces] of Object.entries(atlas.HAND_BLOCK_MAP ?? atlas.BLOCK_MAP)) {
    if (!ids.has(id) || !faces.side || faces.front) continue;
    const tile = (atlas.HAND_TILES ?? atlas.TILES)[faces.side];
    if (!tile || tile.tint) continue;
    const path = tile.path ?? `${atlas.ICONSETS}/${faces.side}.png`;
    if (!byPath.has(path)) byPath.set(path, id);
  }
  return { ids, byPath };
}

/** Frame materials whose hand-made block has a short id. */
const FRAME_ALIAS = {
  polytetrafluoroethylene: 'gt.frame.ptfe',
  polybenzimidazole: 'gt.frame.pbi',
  stainlessSteel: 'gt.frame.stainless',
  tungstenSteel: 'gt.frame.tungstensteel',
};
/** Vanilla blocks the hand-made registry already has. */
const VANILLA_ALIAS = { ironBlock: 'mc.ironBlock', iron_block: 'mc.ironBlock' };

export async function generate(checkout, { log = console.log, includeCovered = false } = {}) {
  const textureList = execSync('git ls-files "src/main/resources/assets/*/textures/blocks/*"', {
    cwd: checkout,
    maxBuffer: 1 << 26,
  })
    .toString()
    .trim()
    .split('\n');
  const reg = new Registry(checkout, textureList);
  const covered = handMade();
  const existing = await existingBlocks();
  const files = execSync('grep -rlE "addShape\\(" src/main/java', { cwd: checkout, maxBuffer: 1 << 26 })
    .toString()
    .trim()
    .split('\n');
  // Concrete subclasses of a class that declares shapes (Ore Drilling Plant I-IV, Fusion Reactors, ...).
  const withShapes = new Set(files.map((f) => basename(f, '.java')));
  const parentOf = new Map();
  for (const [cls, paths] of reg.files) {
    const m = new RegExp(`class\\s+${cls}(?:<[^{]*?>)?\\s+extends\\s+(\\w+)`).exec(reg.src(paths[0]));
    if (m) parentOf.set(cls, m[1]);
  }
  for (const [cls, paths] of reg.files) {
    if (withShapes.has(cls)) continue;
    let p = parentOf.get(cls);
    for (let guard = 0; p && guard < 6 && !withShapes.has(p); guard++) p = parentOf.get(p);
    if (p && withShapes.has(p)) files.push(relative(checkout, paths[0]));
  }
  files.sort();

  const defs = [];
  const shapes = {};
  const skipped = [];
  const blocks = new Map(); // id → { name, color, texture?, tint? }
  const usedIds = new Set(readdirSync(MULTI_DIR).map((f) => f.replace(/\.json$/, '')));
  for (const d of defsGeneratedBefore()) usedIds.delete(d);

  for (const rel of files) {
    const cls = basename(rel, '.java');
    const skip = (why) => skipped.push({ cls, why });
    const src = stripComments(readFileSync(join(checkout, rel), 'utf8'));
    if (covered.has(cls) && !includeCovered) continue;
    if (/Legacy$/.test(cls)) {
      skip('legacy version');
      continue;
    }
    if (new RegExp(`abstract\\s+class\\s+${cls}\\b`).test(src)) {
      skip('abstract base class');
      continue;
    }
    // Parent classes (a base class may hold construct(), the shape or some elements).
    const parents = [];
    for (let s = src, guard = 0; guard < 6; guard++) {
      const ext = new RegExp(`class\\s+\\w+(?:<[^{]*?>)?\\s+extends\\s+(\\w+)`).exec(s);
      const p = ext && reg.classSrc(ext[1]);
      if (!p) break;
      parents.push(p);
      s = p;
    }
    const chain = [src, ...parents];
    const body = chain.map((s) => methodBody(s, 'construct')).find(Boolean);
    if (!body) {
      skip('no construct()');
      continue;
    }
    const ints = new Map(reg.globalInts);
    for (const s of [...parents].reverse().concat([src])) for (const [k, v] of intFields(s)) ints.set(k, v);
    const strs = new Map(reg.globalStrings);
    for (const s of [...chain].reverse()) for (const [k, v] of stringFields(s)) strs.set(k, v);
    // Derived constants: `NA_BOTTOM = mName + "buttom"`, `MAX_LEN = MAX_STRUCTURE_LENGTH - DEFAULT_LENGTH`.
    for (const s of [...chain].reverse()) {
      for (const m of s.matchAll(/\bString\s+(\w+)\s*=\s*([^;{}]+);/g))
        if (!strs.has(m[1])) {
          const v = pieceName(m[2], strs);
          if (v !== null) strs.set(m[1], v);
        }
      for (const m of s.matchAll(/\b(?:int|short|byte)\s+([A-Z][A-Z0-9_]*)\s*=\s*([\w\s+\-*/()]+);/g))
        if (!ints.has(m[1])) {
          const expr = m[2].replace(/\b[A-Za-z_]\w*\b/g, (w) => (ints.has(w) ? String(ints.get(w)) : w));
          if (/^[\d\s+\-*/()]+$/.test(expr)) ints.set(m[1], Math.trunc(Function(`return (${expr});`)()));
        }
    }
    // Every declared piece, by name (null when its shape is computed at run time).
    const pieces = new Map();
    for (const s of chain)
      for (const c of findCalls(s, 'addShape')) {
        const a = splitArgs(c.args);
        const n = pieceName(a[0], strs);
        if (n !== null && !pieces.has(n)) pieces.set(n, readShape(a[1], chain));
      }
    const builds = findCalls(body, 'buildPiece');
    if (!builds.length) {
      skip('construct() builds no piece');
      continue;
    }
    const sig = chain
      .map((s) =>
        /\bconstruct\s*\(\s*(?:final\s+)?ItemStack\s+(\w+)\s*,\s*(?:final\s+)?boolean\s+(\w+)/.exec(s),
      )
      .find(Boolean);
    // Instance field defaults (`private int revision = 1;`) decide which branch a fresh controller builds.
    const vals = new Map(ints);
    for (const s of [...parents].reverse().concat([src]))
      for (const m of s.matchAll(
        /(?:private|protected|public)\s+(?:int|boolean)\s+(\w+)\s*=\s*(-?\d+|true|false)\s*;/g,
      ))
        if (!vals.has(m[1])) vals.set(m[1], m[2] === 'true' ? true : m[2] === 'false' ? false : Number(m[2]));
    const run = runConstruct(body, { ints: vals, strings: strs, params: sig ? [sig[1], sig[2]] : undefined });
    let placed = run.calls;
    if (!placed?.length && builds.length === 1) {
      const n = pieceName(splitArgs(builds[0].args)[0], strs);
      if (n !== null) placed = [{ piece: n, offset: null }];
    }
    if (!placed?.length) {
      skip(`construct() could not be evaluated: ${run.error}`);
      continue;
    }
    const missing = placed.find((p) => !pieces.get(p.piece));
    if (missing) {
      skip(pieces.has(missing.piece) ? 'shape is computed' : 'shape not found');
      continue;
    }
    let shape;
    let transposed;
    if (placed.length === 1) ({ shape, transposed } = pieces.get(placed[0].piece));
    else {
      // Several pieces: place each so its offset cell lands on the controller, then merge.
      const cellsRel = new Map();
      for (const p of placed) {
        const grid = zRowX(pieces.get(p.piece));
        const [A, B, C] = p.offset;
        grid.forEach((rows, z) =>
          rows.forEach((row, r) =>
            [...row].forEach((ch, x) => {
              const k = `${x - A},${B - r},${z - C}`;
              if (ch !== ' ' && !cellsRel.has(k)) cellsRel.set(k, ch);
            }),
          ),
        );
      }
      const pts = [...cellsRel.keys()].map((k) => k.split(',').map(Number));
      const lo = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i])));
      const hi = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i])));
      shape = [];
      for (let z = lo[2]; z <= hi[2]; z++) {
        const rows = [];
        for (let y = hi[1]; y >= lo[1]; y--) {
          let row = '';
          for (let x = lo[0]; x <= hi[0]; x++) row += cellsRel.get(`${x},${y},${z}`) ?? ' ';
          rows.push(row);
        }
        shape.push(rows);
      }
      transposed = false;
    }
    const flat = shape.flat().join('');
    if ((flat.match(/~/g) ?? []).length !== 1) {
      skip('no single controller in the shape');
      continue;
    }
    const width = shape[0][0].length;
    if (shape.some((o) => o.some((r) => r.length !== width))) {
      skip('ragged shape');
      continue;
    }
    if (flat.replace(/ /g, '').length > 20000) {
      skip('too large to show (over 20000 blocks)');
      continue;
    }
    // Elements (this class first, then its parents).
    const classMethods = (name) => {
      for (const s of [src, ...parents]) {
        const b = methodBody(s, name);
        if (b) return b;
      }
      return null;
    };
    const resolver = new ElementResolver({
      src,
      ints,
      casingsEnum: reg.casingsEnum,
      itemList: reg.itemList,
      classMethods,
      globalInts: reg.globalInts,
    });
    const elExprs = new Map();
    for (const s of [...chain].reverse())
      for (const c of findCalls(s, 'addElement')) {
        const [ch, e] = splitArgs(c.args);
        const m = /^'(.)'$/.exec(ch ?? '');
        if (m && e) elExprs.set(m[1], e);
      }
    const chars = [...new Set(flat)].filter((c) => c !== '~' && c !== ' ' && c !== '-');
    const el = {};
    let bad = null;
    for (const c of chars) {
      if (!elExprs.has(c)) {
        bad = `element '${c}' not defined in the class`;
        break;
      }
      const r = resolver.resolve(elExprs.get(c));
      if (r.kind === 'unknown') {
        bad = `element '${c}': ${r.why}`;
        break;
      }
      el[c] = r;
    }
    if (bad) {
      skip(bad);
      continue;
    }

    // Blocks.
    let blockFail = null;
    const blockId = (b) => {
      if (b.type === 'glass') return 'gt.glass.reinforced';
      if (b.type === 'coil') return 'gt.coil.cupronickel';
      if (b.type === 'itemPipe') return 'gt.casing.itemPipeTin';
      if (b.type === 'solenoid') return 'gt.coil.solenoid';
      if (b.type === 'special' || b.type === 'tiered') {
        const id = b.type === 'special' ? 'gt5u.specialHatch' : 'gt5u.tieredCasing';
        if (!blocks.has(id))
          blocks.set(id, {
            name: b.type === 'special' ? 'Machine-specific Hatch' : 'Tiered Casing (any tier)',
            color: b.type === 'special' ? '#6b7280' : '#8d8d99',
            texture:
              b.type === 'special'
                ? 'src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HV_SIDE.png'
                : undefined,
          });
        return id;
      }
      if (b.type === 'frame') {
        const name = reg.materialName(b.material);
        const id = FRAME_ALIAS[camel(name)] ?? `gt.frame.${camel(name)}`;
        const known = [...existing.ids].find((x) => x.toLowerCase() === id.toLowerCase());
        if (known) return known;
        if (!blocks.has(id))
          blocks.set(id, {
            name: `${name} Frame Box`,
            color: reg.materialColor(b.material) ?? '#8a8a8a',
            frame: true,
            tint: reg.materialColor(b.material) ?? '#8a8a8a',
          });
        return id;
      }
      if (b.type === 'sheetmetal') {
        const name = reg.materialName(b.material);
        const id = `gt.sheetmetal.${camel(name)}`;
        if (!blocks.has(id))
          blocks.set(id, { name: `${name} Sheetmetal`, color: reg.materialColor(b.material) ?? '#9a9a9a' });
        return id;
      }
      if (b.type === 'external') {
        const vanilla = /^minecraft:(\w+)$/.exec(b.name);
        if (vanilla && VANILLA_ALIAS[vanilla[1]]) return VANILLA_ALIAS[vanilla[1]];
        const id = `ext.${camel(b.name)}`;
        if (!blocks.has(id)) blocks.set(id, { name: b.name, color: '#9a9a9a' });
        return id;
      }
      // Vanilla blocks: fluids are open space in the planner, the rest is drawn flat.
      if (['lava', 'water', 'flowing_water', 'flowing_lava'].includes(b.field)) return null;
      if (VANILLA_ALIAS[b.field]) return VANILLA_ALIAS[b.field];
      const info = reg.blockInfo(b.field);
      if (!info) {
        const id = `ext.${camel(b.field)}`;
        if (!blocks.has(id))
          blocks.set(id, {
            name: b.field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase()),
            color: '#8a7f73',
          });
        return id;
      }
      const texture =
        reg.iconTexture(info.icon(b.meta), info.iconSrc) ??
        reg.iconTexture(info.initIcon(b.meta)) ??
        reg.namedTexture(info.initName);
      if (texture && existing.byPath.has(texture)) return existing.byPath.get(texture);
      const id = `gt5u.${camel(info.unloc ?? b.field)}.${b.meta}`;
      if (!blocks.has(id))
        blocks.set(id, {
          name: info.name(b.meta) ?? `${info.unloc ?? b.field} ${b.meta}`,
          color: '#8f8f8f',
          texture,
          field: b.field,
          meta: b.meta,
        });
      return id;
    };

    const legend = {};
    const gtEl = {};
    const hatchesUsed = new Set();
    for (const [c, r] of Object.entries(el)) {
      if (r.kind === 'casing') {
        const id = blockId(r.block);
        if (!id && !blockFail) {
          // A fluid block: the cell stays open.
          el[c] = { kind: 'air' };
          gtEl[c] = { t: 'air' };
          continue;
        }
        if (!id) break;
        const hatches = HATCH_ORDER.filter((k) => r.hatches.includes(k));
        hatches.forEach((h) => hatchesUsed.add(h));
        legend[c] = hatches.length ? { blockId: id, hatches } : { blockId: id };
        gtEl[c] = { t: 'casing', block: TEST_ALIAS[id] ?? id, hatches };
      } else if (r.kind === 'hatch') {
        hatchesUsed.add(r.hatch);
        legend[c] = { blockId: HATCH_BLOCKS[r.hatch], hatches: [r.hatch] };
        gtEl[c] = { t: 'hatchOnly', kind: r.hatch };
      } else gtEl[c] = { t: r.kind };
    }
    if (blockFail) {
      skip(blockFail);
      continue;
    }

    // Layers: y = 0 at the bottom, z = 0 at the front (the side the controller faces).
    const cells = new Map();
    let sy = 0;
    let sz = 0;
    shape.forEach((outer, i) =>
      outer.forEach((row, j) =>
        [...row].forEach((ch, x) => {
          const [y, z] = transposed ? [shape.length - 1 - i, j] : [outer.length - 1 - j, i];
          sy = Math.max(sy, y + 1);
          sz = Math.max(sz, z + 1);
          let out = ch;
          if (ch !== '~' && ch !== ' ' && ch !== '-')
            out = el[ch].kind === 'air' ? '-' : el[ch].kind === 'any' ? ' ' : ch;
          cells.set(`${x},${y},${z}`, out);
        }),
      ),
    );
    const layers = [];
    let ctrl = null;
    for (let y = 0; y < sy; y++) {
      const layer = [];
      for (let z = 0; z < sz; z++) {
        let row = '';
        for (let x = 0; x < width; x++) {
          const ch = cells.get(`${x},${y},${z}`) ?? ' ';
          if (ch === '~') ctrl = [x, y, z];
          row += ch;
        }
        layer.push(row);
      }
      layers.push(layer);
    }
    // The controller looks out of the shape's front (north); a few machines have structure in front of it
    // (the player stands inside or next to it in game), then the first open side is used instead.
    const dirs = ['north', 'south', 'west', 'east'];
    const facing =
      dirs.find((dir) => facesOpen(layers, [width, sy, sz], ctrl, dir, true)) ??
      dirs.find((dir) => facesOpen(layers, [width, sy, sz], ctrl, dir, false));
    if (!facing) {
      skip('the controller has structure on every side');
      continue;
    }
    const name =
      reg.controllerName(cls) ?? cls.replace(/^(?:MTE|TileEntity)/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    let id = slug(name);
    if (!id) id = slug(cls);
    if (usedIds.has(id)) id = `${id}-${slug(cls.replace(/^MTE/, ''))}`;
    if (usedIds.has(id)) {
      skip(`id ${id} taken`);
      continue;
    }
    usedIds.add(id);

    // Hatch kinds whose every cell is sealed in (only faces into the structure, its air or the ground) cannot be
    // placed by the planner: keep them in the legend but leave them out of the defaults and requirements.
    const reachable = openCells(layers, [width, sy, sz], ctrl, facing);
    const sealed = [];
    const kinds = HATCH_ORDER.filter((k) => hatchesUsed.has(k)).filter((k) => {
      const chars = Object.entries(legend)
        .filter(([, e]) => e.hatches?.includes(k))
        .map(([c]) => c);
      for (let y = 0; y < sy; y++)
        for (let z = 0; z < sz; z++)
          for (let x = 0; x < width; x++)
            if (chars.includes(layers[y][z][x]))
              for (const [dx, dy, dz] of NEIGHBOURS)
                if (reachable.has(`${x + dx},${y + dy},${z + dz}`)) return true;
      sealed.push(k);
      return false;
    });
    const required = {};
    if (kinds.includes('dynamo')) required.dynamo = { min: 1 };
    else if (kinds.includes('energy')) required.energy = { min: 1 };
    if (kinds.includes('maintenance')) required.maintenance = { min: 1, max: 1 };
    if (kinds.includes('muffler')) required.muffler = { min: 1, max: 1 };
    const io = ['itemIn', 'itemOut', 'fluidIn', 'fluidOut', 'steamIn'].filter((k) => kinds.includes(k));
    const defaults = kinds.filter(
      (k) =>
        ['energy', 'dynamo', 'maintenance', 'muffler'].includes(k) ||
        ((k === 'itemIn' || k === 'itemOut') && true) ||
        ((k === 'fluidIn' || k === 'fluidOut' || k === 'steamIn') &&
          !kinds.includes('itemIn') &&
          !kinds.includes('itemOut')),
    );
    const def = {
      id,
      name,
      generated: true,
      source: `${REPO}/${TAG}/${rel}`,
      size: [width, sy, sz],
      layers,
      legend,
      controller: { pos: ctrl, facing, blockId: 'gt.controller' },
      hatchBlocks: Object.fromEntries(
        HATCH_ORDER.filter((k) => hatchesUsed.has(k)).map((k) => [k, HATCH_BLOCKS[k]]),
      ),
      shareableHatches: io,
      requiredHatches: required,
      defaultHatches: defaults,
      wallshare: true,
      notes: `${sealed.length ? `The structure has no open face for: ${sealed.join(', ')} (left out of the plan). ` : ''}Generated from ${cls} (GT5-Unofficial ${TAG}) by tools/gt-source: the structure is copied cell by cell; hatch counts are approximate (energy or dynamo, maintenance and muffler as the structure allows), so check the tooltip in game.`,
    };
    if (covered.has(cls)) def.coveredBy = covered.get(cls);
    defs.push(def);
    shapes[id] = { transposed, shape, el: gtEl };
  }
  return { defs, shapes, skipped, blocks, existing, textureList };
}

/** A piece's shape: literal `new String[][] {...}` / `transpose(...)` / a String[][] field of the class chain. */
function readShape(expr, chain) {
  let e = expr.trim();
  let transposed = false;
  // `(new String[][] {...})`, `(transpose(...))`: redundant parentheses.
  while (e.startsWith('(') && matchClose(e, 0) === e.length - 1) e = e.slice(1, -1).trim();
  if (/^(?:StructureUtility\.)?transpose\s*\(/.test(e)) {
    transposed = true;
    e = e.slice(e.indexOf('(') + 1, e.lastIndexOf(')')).trim();
    while (e.startsWith('(') && matchClose(e, 0) === e.length - 1) e = e.slice(1, -1).trim();
  }
  let shape = string2D(e);
  if (!shape)
    for (const s of chain) {
      const f = arrayFields(s).get(e);
      if (f && (shape = string2D(f))) break;
    }
  // `new String[][] { L0, L1, L2 }` with `String[] L0 = { ... }` fields.
  const refs = /^(?:new\s+String\s*\[\s*\]\s*\[\s*\]\s*)?\{([\w\s,]+)\}$/.exec(e);
  if (!shape && refs) {
    const rows = refs[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => {
        for (const s of chain) {
          const f = arrayFields1D(s).get(n);
          if (f) return f;
        }
        return null;
      });
    if (rows.every(Boolean)) shape = string2D(`{${rows.join(',')}}`);
  }
  return shape ? { shape, transposed } : null;
}

/**
 * Whether the controller can look `dir`: the cell in front is open (src/data/validate.ts), and with `clear`
 * every cell up to the side of the box.
 */
function facesOpen(layers, [sx, , sz], [cx, cy, cz], dir, clear) {
  const [dx, dz] = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[dir];
  for (let x = cx + dx, z = cz + dz; x >= 0 && x < sx && z >= 0 && z < sz; x += dx, z += dz) {
    if (!' -'.includes(layers[cy][z][x])) return false;
    if (!clear) break;
  }
  return true;
}

const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/**
 * Empty cells connected to the outside of the structure (as src/model/ports.ts counts open faces): cells
 * outside the bounding box or not part of the structure (' '), never below the ground and never the cell in
 * front of the controller.
 */
function openCells(layers, [sx, sy, sz], ctrl, facing) {
  const [fx, fz] = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[facing];
  const blocked = (x, y, z) => {
    if (y < 0) return true;
    if (x === ctrl[0] + fx && y === ctrl[1] && z === ctrl[2] + fz) return true;
    if (x < 0 || x >= sx || y >= sy || z < 0 || z >= sz) return false;
    return layers[y][z][x] !== ' ';
  };
  const inRange = (x, y, z) => x >= -1 && x <= sx && y >= 0 && y <= sy && z >= -1 && z <= sz;
  const seen = new Set(['-1,0,-1']);
  const queue = [[-1, 0, -1]];
  while (queue.length) {
    const [x, y, z] = queue.pop();
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const n = [x + dx, y + dy, z + dz];
      const k = n.join(',');
      if (seen.has(k) || !inRange(...n) || blocked(...n)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}

/** Normalises a shape to [z][row from the top][x]. */
function zRowX({ shape, transposed }) {
  if (!transposed) return shape;
  const out = [];
  shape.forEach((layer, i) => layer.forEach((row, z) => ((out[z] ??= [])[i] = row)));
  return out;
}

function tileName(texture) {
  const base = basename(texture, '.png')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .toUpperCase();
  const mod = /assets\/([^/]+)\//.exec(texture)?.[1] ?? 'gt';
  return mod === 'gregtech' ? base : `${mod.toUpperCase()}_${base}`;
}

function defsGeneratedBefore() {
  return readdirSync(MULTI_DIR)
    .filter((f) => JSON.parse(readFileSync(join(MULTI_DIR, f), 'utf8')).generated)
    .map((f) => f.replace(/\.json$/, ''));
}

/** Alpha-weighted mean colour of a TILE×TILE RGBA tile, as `#rrggbb`. */
function meanColor(px) {
  const sum = [0, 0, 0];
  let w = 0;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    for (let c = 0; c < 3; c++) sum[c] += px[i + c] * a;
    w += a;
  }
  if (!w) return null;
  return (
    '#' +
    sum
      .map((v) =>
        Math.round(v / w)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

const ATTRIBUTION_START = '<!-- tools/gt-source: generated textures -->';
const ATTRIBUTION_END = '<!-- /tools/gt-source -->';

/** Writes `text` formatted with the repo's Prettier config (as `npm run format` would). */
async function writeFormatted(file, text) {
  let out = text;
  try {
    const prettier = await import('prettier');
    const options = (await prettier.resolveConfig(file)) ?? {};
    out = await prettier.format(text, { ...options, filepath: file });
  } catch {
    // Prettier missing: keep the plain JSON.
  }
  writeFileSync(file, out);
}

async function write(result, checkout) {
  const atlas = await import(pathToFileURL(join(ROOT, 'scripts/build-atlas.mjs')).href);
  const srcDir = join(ROOT, 'tools/texture-sources');
  const texturesFile = join(ROOT, 'tools/gt-source/textures.generated.json');
  const before = existsSync(texturesFile)
    ? Object.keys(JSON.parse(readFileSync(texturesFile, 'utf8')).tiles)
    : [];

  for (const id of defsGeneratedBefore()) rmSync(join(MULTI_DIR, `${id}.json`));
  for (const { coveredBy, ...def } of result.defs) {
    if (coveredBy) continue;
    await writeFormatted(join(MULTI_DIR, `${def.id}.json`), JSON.stringify(def, null, 2) + '\n');
  }
  const sortedShapes = Object.fromEntries(
    Object.entries(result.shapes).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFormatted(join(ROOT, 'src/data/gt-shapes.generated.json'), JSON.stringify(sortedShapes) + '\n');

  // Atlas tiles: the source file is copied from the checkout (git fetches the blob on demand in a
  // blob-less clone), and the block's flat colour is the tile's mean colour.
  const blocks = [...result.blocks].sort(([a], [b]) => a.localeCompare(b));
  const tiles = {};
  const faces = {};
  const colors = new Map();
  for (const [id, b] of blocks) {
    let tile;
    let opts;
    if (b.frame) {
      tile = `FRAME_${id.split('.').pop().toUpperCase()}`;
      const t = b.tint.slice(1);
      opts = {
        path: 'src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png',
        tint: [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16)),
      };
    } else if (b.texture) {
      tile = tileName(b.texture);
      opts = { path: b.texture };
    } else continue;
    const hand = atlas.HAND_TILES[tile];
    if (hand && (hand.path ?? `${atlas.ICONSETS}/${tile}.png`) !== opts.path) tile = `GEN_${tile}`;
    const file = join(srcDir, `${tile}.png`);
    if (!existsSync(file)) {
      const data = execSync(`git -C ${JSON.stringify(checkout)} show HEAD:${opts.path}`, {
        maxBuffer: 1 << 26,
      });
      writeFileSync(file, data);
    }
    if (!atlas.HAND_TILES[tile]) tiles[tile] = { ...opts, ref: TAG };
    faces[id] = { side: tile };
    const color = meanColor(atlas.firstFrameTile(atlas.decodePng(readFileSync(file)), opts.tint));
    if (color) colors.set(id, color);
  }
  for (const t of before)
    if (!tiles[t] && !atlas.HAND_TILES[t]) rmSync(join(srcDir, `${t}.png`), { force: true });
  await writeFormatted(
    join(ROOT, 'src/data/blocks.generated.json'),
    JSON.stringify(blocks.map(([id, b]) => ({ id, name: b.name, color: colors.get(id) ?? b.color }))) + '\n',
  );
  await writeFormatted(texturesFile, JSON.stringify({ tiles, blocks: faces }) + '\n');

  // Credits: the generated tiles' source files, between markers in ATTRIBUTION.md.
  const attrFile = join(ROOT, 'ATTRIBUTION.md');
  const attr = readFileSync(attrFile, 'utf8');
  const lines = Object.entries(tiles)
    .map(([, t]) => `- \`${t.path}\`${t.tint ? ` (_tinted_ ${t.tint.join(', ')})` : ''}`)
    .filter((l, i, a) => a.indexOf(l) === i)
    .sort();
  const section = [
    ATTRIBUTION_START,
    '',
    '### Files used by the generated catalog entries',
    '',
    `Blocks of the generated catalog entries (see [\`tools/gt-source/\`](tools/gt-source/)), copied from the`,
    `\`${TAG}\` tag; frame boxes are the material icon multiplied by the material colour:`,
    '',
    ...lines,
    '',
    ATTRIBUTION_END,
  ].join('\n');
  const i = attr.indexOf(ATTRIBUTION_START);
  const next =
    i >= 0
      ? attr.slice(0, i) + section + attr.slice(attr.indexOf(ATTRIBUTION_END) + ATTRIBUTION_END.length)
      : attr.replace(/\n*$/, '\n\n') + section + '\n';
  await writeFormatted(attrFile, next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checkout = process.argv[2];
  if (!checkout || !existsSync(join(checkout, 'src/main/java'))) {
    console.error('usage: node tools/gt-source/generate.mjs <GT5-Unofficial checkout> [--write]');
    process.exit(1);
  }
  const result = await generate(resolve(checkout));
  const reasons = new Map();
  for (const s of result.skipped) {
    const k = s.why.replace(/'.'/, "'?'").replace(/: .*/, ': …');
    reasons.set(k, (reasons.get(k) ?? 0) + 1);
  }
  console.log(
    `generated ${result.defs.length}, skipped ${result.skipped.length}, new blocks ${result.blocks.size}`,
  );
  for (const [k, v] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${v}\t${k}`);
  if (process.argv.includes('--verbose'))
    for (const s of result.skipped) console.log(`  - ${s.cls}: ${s.why}`);
  if (process.argv.includes('--write')) {
    await write(result, resolve(checkout));
    console.log('written');
  }
}
