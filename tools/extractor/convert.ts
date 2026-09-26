/**
 * Converter: gtnh-process-line-solver multiblock dump (schema v2) -> our `MultiblockDef`.
 *
 * Pure module (no fs, no runtime imports) so it can be used from Vitest and, through Node's
 * built-in TypeScript type stripping, from the `convert.mjs` CLI. Only erasable TS syntax here.
 *
 * Dump format (one file per controller, written by the upstream Java `JsonWriter`):
 *
 * ```
 * { schema: 2,
 *   controller: { registry_name, meta, display_name, source_class, facing_convention },
 *   variants: [{ trigger_stack_size, channels: {name: int},
 *                blocks:      [{ d: [dx,dy,dz], block: "mod:name", meta }],   // every non-air cell
 *                hints:       [{ d, hint }],                                   // hologram hint dots
 *                hatch_slots: [{ d, kinds: ["InputBus", ...] }],               // GT HatchElement names
 *                bbox: [sx, sy, sz] }],
 *   substitutions: { channel: [{ channel_value, block, meta }] },            // tiered-block swaps
 *   failures: [string] }
 * ```
 *
 * Offsets `d` are world deltas from the controller block, which the extractor places facing NORTH
 * (-Z). That is exactly our local frame, so the only transform is a translation to the min corner.
 */
import type { HatchKind, HorizontalDir, LegendEntry, MultiblockDef, Vec3 } from '../../src/model/types';

// ---------------------------------------------------------------------------------------------
// Dump types

export interface DumpController {
  registry_name: string;
  meta: number;
  display_name: string;
  source_class: string;
  facing_convention?: string;
}

export interface DumpBlock {
  d: Vec3;
  block: string;
  meta: number;
}

export interface DumpHint {
  d: Vec3;
  hint: number;
}

export interface DumpHatchSlot {
  d: Vec3;
  kinds: string[];
}

export interface DumpVariant {
  trigger_stack_size: number;
  channels: Record<string, number>;
  blocks: DumpBlock[];
  hints: DumpHint[];
  /** Added in schema v2; treated as empty when missing. */
  hatch_slots: DumpHatchSlot[];
  bbox: Vec3;
}

export interface DumpSubstitution {
  channel_value: number;
  block: string;
  meta: number;
}

export interface DumpDoc {
  schema: number;
  controller: DumpController;
  variants: DumpVariant[];
  substitutions: Record<string, DumpSubstitution[]>;
  failures: string[];
}

/** The `_meta.json` run summary next to the per-controller files. */
export interface DumpMeta {
  schema: number;
  pack_version: string;
  mod_versions: Record<string, string>;
  generated_at: string;
  extractor_sha: string;
  controller_count: number;
  failures: { registry_name: string; reason: string }[];
}

// ---------------------------------------------------------------------------------------------
// Options

/** `block-map.json` shape. Keys are `"<registry_name>:<meta>"` or `"<registry_name>:*"`. */
export interface BlockMap {
  blocks: Record<string, string>;
}

/** Which dumped form to convert: first/last by trigger stack, largest by block count, or a stack size. */
export type VariantSelector = 'first' | 'last' | 'largest' | number;

export interface ConvertOptions {
  blockMap: BlockMap;
  /** Default `'first'` (trigger stack 1, the smallest complete form). */
  variant?: VariantSelector;
  /** Override the generated id (default: slug of the display name). */
  id?: string;
  /** GT `HatchElement` name -> our hatch kind. Defaults to `DEFAULT_HATCH_KIND_MAP`. */
  hatchKindMap?: Record<string, HatchKind>;
  /**
   * When a variant has no `hatch_slots` (schema v1 dumps, or the hatch probe failed), treat hint
   * dots as hatch cells accepting these kinds. Omitted/empty = hints are ignored (warning only).
   */
  hintFallbackKinds?: HatchKind[];
  /** Kinds written to `shareableHatches`. Default none (a GT hatch serves one controller). */
  shareableHatches?: HatchKind[];
  /** Pack version for the notes (e.g. from `_meta.json`). */
  packVersion?: string;
}

export interface ConvertResult {
  def: MultiblockDef;
  warnings: string[];
  /** The dump variant that was converted. */
  variant: DumpVariant;
}

// ---------------------------------------------------------------------------------------------
// Constants

/** GT5U `gregtech.api.enums.HatchElement` names -> our hatch kinds. Unlisted names are dropped. */
export const DEFAULT_HATCH_KIND_MAP: Readonly<Record<string, HatchKind>> = {
  InputBus: 'itemIn',
  OutputBus: 'itemOut',
  InputHatch: 'fluidIn',
  OutputHatch: 'fluidOut',
  Energy: 'energy',
  ExoticEnergy: 'energy',
  MultiAmpEnergy: 'energy',
  Dynamo: 'dynamo',
  ExoticDynamo: 'dynamo',
  Maintenance: 'maintenance',
  Muffler: 'muffler',
};

/** Canonical order for hatch kinds in output (matches the HatchKind union). */
export const HATCH_KIND_ORDER: readonly HatchKind[] = [
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

/** Block ids (from `src/data/blocks.ts`) used when a hatch of that kind is placed. */
export const DEFAULT_HATCH_BLOCKS: Readonly<Record<HatchKind, string>> = {
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

export const DEFAULT_CONTROLLER_BLOCK = 'gt.controller';

/** Legend characters in assignment order; never includes the reserved `~`, `-` or space. */
const LEGEND_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&*+=?@^_|<>(){}[]/\\:;,.\'"`';

const GT5U_SOURCE_ROOT = 'https://github.com/GTNewHorizons/GT5-Unofficial/blob/master/src/main/java/';
/** Top-level packages that live in the GT5-Unofficial repo (GT++, BartWorks, TecTech, ... merged in). */
const GT5U_PACKAGES = [
  'gregtech',
  'gtPlusPlus',
  'bartworks',
  'tectech',
  'goodgenerator',
  'kekztech',
  'kubatech',
  'ggfab',
  'gtnhlanth',
  'galacticgreg',
];

// ---------------------------------------------------------------------------------------------
// Parsing

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(label: string, msg: string): never {
  throw new Error(`${label}: ${msg}`);
}

function parseVec(v: unknown, where: string, label: string): Vec3 {
  if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => Number.isInteger(n)))
    fail(label, `${where} must be [int, int, int], got ${JSON.stringify(v)}`);
  return [v[0], v[1], v[2]];
}

function parseInt32(v: unknown, where: string, label: string): number {
  if (!Number.isInteger(v)) fail(label, `${where} must be an integer, got ${JSON.stringify(v)}`);
  return v as number;
}

function parseStr(v: unknown, where: string, label: string): string {
  if (typeof v !== 'string') fail(label, `${where} must be a string, got ${JSON.stringify(v)}`);
  return v;
}

function parseArr(v: unknown, where: string, label: string): unknown[] {
  if (!Array.isArray(v)) fail(label, `${where} must be an array`);
  return v;
}

/**
 * Validate an untyped JSON value as a dump document. Throws with a message naming `label` (usually
 * the file name) and the offending path. Missing optional fields (`hints`, `hatch_slots`,
 * `substitutions`, `failures`, `channels`) default to empty.
 */
export function parseDump(json: unknown, label = 'dump'): DumpDoc {
  if (!isObj(json)) fail(label, 'not a JSON object');
  const schema = parseInt32(json.schema, 'schema', label);
  const c = json.controller;
  if (!isObj(c)) fail(label, 'missing "controller" object');
  const controller: DumpController = {
    registry_name: parseStr(c.registry_name, 'controller.registry_name', label),
    meta: parseInt32(c.meta, 'controller.meta', label),
    display_name: parseStr(c.display_name, 'controller.display_name', label),
    source_class: parseStr(c.source_class, 'controller.source_class', label),
    facing_convention: typeof c.facing_convention === 'string' ? c.facing_convention : undefined,
  };
  const variants = parseArr(json.variants, 'variants', label).map((raw, i): DumpVariant => {
    const at = `variants[${i}]`;
    if (!isObj(raw)) fail(label, `${at} must be an object`);
    const channels: Record<string, number> = {};
    if (raw.channels !== undefined) {
      if (!isObj(raw.channels)) fail(label, `${at}.channels must be an object`);
      for (const [k, v] of Object.entries(raw.channels))
        channels[k] = parseInt32(v, `${at}.channels.${k}`, label);
    }
    return {
      trigger_stack_size: parseInt32(raw.trigger_stack_size, `${at}.trigger_stack_size`, label),
      channels,
      blocks: parseArr(raw.blocks, `${at}.blocks`, label).map((b, j) => {
        const w = `${at}.blocks[${j}]`;
        if (!isObj(b)) fail(label, `${w} must be an object`);
        return {
          d: parseVec(b.d, `${w}.d`, label),
          block: parseStr(b.block, `${w}.block`, label),
          meta: parseInt32(b.meta, `${w}.meta`, label),
        };
      }),
      hints: (raw.hints === undefined ? [] : parseArr(raw.hints, `${at}.hints`, label)).map((h, j) => {
        const w = `${at}.hints[${j}]`;
        if (!isObj(h)) fail(label, `${w} must be an object`);
        return { d: parseVec(h.d, `${w}.d`, label), hint: parseInt32(h.hint, `${w}.hint`, label) };
      }),
      hatch_slots: (raw.hatch_slots === undefined
        ? []
        : parseArr(raw.hatch_slots, `${at}.hatch_slots`, label)
      ).map((s, j) => {
        const w = `${at}.hatch_slots[${j}]`;
        if (!isObj(s)) fail(label, `${w} must be an object`);
        return {
          d: parseVec(s.d, `${w}.d`, label),
          kinds: parseArr(s.kinds, `${w}.kinds`, label).map((k, n) => parseStr(k, `${w}.kinds[${n}]`, label)),
        };
      }),
      bbox: parseVec(raw.bbox, `${at}.bbox`, label),
    };
  });
  if (variants.length === 0) fail(label, 'no variants (nothing to convert)');
  const substitutions: Record<string, DumpSubstitution[]> = {};
  if (json.substitutions !== undefined) {
    if (!isObj(json.substitutions)) fail(label, '"substitutions" must be an object');
    for (const [ch, list] of Object.entries(json.substitutions)) {
      substitutions[ch] = parseArr(list, `substitutions.${ch}`, label).map((s, j) => {
        const w = `substitutions.${ch}[${j}]`;
        if (!isObj(s)) fail(label, `${w} must be an object`);
        return {
          channel_value: parseInt32(s.channel_value, `${w}.channel_value`, label),
          block: parseStr(s.block, `${w}.block`, label),
          meta: parseInt32(s.meta, `${w}.meta`, label),
        };
      });
    }
  }
  const failures =
    json.failures === undefined
      ? []
      : parseArr(json.failures, 'failures', label).map((f, i) => parseStr(f, `failures[${i}]`, label));
  return { schema, controller, variants, substitutions, failures };
}

/** True when a parsed JSON value looks like a `_meta.json` run summary rather than a controller doc. */
export function isDumpMeta(json: unknown): json is DumpMeta {
  return isObj(json) && typeof json.pack_version === 'string' && !('controller' in json);
}

// ---------------------------------------------------------------------------------------------
// Helpers

/** `"Electric Blast Furnace"` -> `"electric-blast-furnace"`. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'multiblock';
}

/** Deterministic block id for a dump block with no `block-map.json` entry. */
export function generatedBlockId(block: string, meta: number): string {
  return `ext.${block.replace(/[^A-Za-z0-9_.]+/g, '.')}.${meta}`;
}

/** Look up `"<registry>:<meta>"`, then `"<registry>:*"`. */
export function lookupBlock(map: BlockMap, block: string, meta: number): string | undefined {
  return map.blocks[`${block}:${meta}`] ?? map.blocks[`${block}:*`];
}

/** GitHub URL of a GT5-Unofficial class, or undefined when the package is not in that repo. */
export function sourceUrl(sourceClass: string): string | undefined {
  const outer = sourceClass.split('$')[0];
  const top = outer.split('.')[0];
  if (!GT5U_PACKAGES.includes(top)) return undefined;
  return `${GT5U_SOURCE_ROOT}${outer.replace(/\./g, '/')}.java`;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vkey(p: Vec3): string {
  return `${p[0]},${p[1]},${p[2]}`;
}

function sortKinds(kinds: Iterable<HatchKind>): HatchKind[] {
  const set = new Set(kinds);
  return HATCH_KIND_ORDER.filter((k) => set.has(k));
}

/** Pick the variant to convert. Variants are considered in trigger-stack order. */
export function selectVariant(doc: DumpDoc, sel: VariantSelector = 'first'): DumpVariant {
  const sorted = [...doc.variants].sort((a, b) => a.trigger_stack_size - b.trigger_stack_size);
  if (sel === 'first') return sorted[0];
  if (sel === 'last') return sorted[sorted.length - 1];
  if (sel === 'largest')
    return sorted.reduce((best, v) => (v.blocks.length > best.blocks.length ? v : best), sorted[0]);
  const hit = sorted.find((v) => v.trigger_stack_size === sel);
  if (!hit) {
    const have = sorted.map((v) => v.trigger_stack_size).join(', ');
    throw new Error(`${doc.controller.display_name}: no variant with trigger stack ${sel} (have ${have})`);
  }
  return hit;
}

// ---------------------------------------------------------------------------------------------
// Conversion

interface Cell {
  /** Our block id. */
  blockId: string;
  hatches: HatchKind[];
}

/**
 * Convert one dump document to a `MultiblockDef`.
 *
 * - The cell whose `(block, meta)` equals the controller identity becomes `~` (falls back to
 *   `d = [0,0,0]`, where the real extractor always puts it). Facing is `north` (extractor convention).
 * - Other scanned blocks map through `blockMap`; unknown ones get `generatedBlockId` + a warning.
 * - `hatch_slots` kinds map through `hatchKindMap`; unmapped kinds are dropped with a warning.
 * - Cells inside the bounding box that the scan left empty become `-` (must stay air) when they
 *   are enclosed by the structure, or ` ` (not part of it) when reachable from outside.
 * - `wallshare` is true when, on at least one axis, the two opposite faces of the bounding box are
 *   fully solid casing and match block-for-block (so a neighbour's face can overlap this one).
 */
export function convertDump(doc: DumpDoc, options: ConvertOptions): ConvertResult {
  const warnings: string[] = [];
  const name = doc.controller.display_name;
  const warn = (msg: string) => warnings.push(msg);
  const hatchKindMap = options.hatchKindMap ?? DEFAULT_HATCH_KIND_MAP;
  const variant = selectVariant(doc, options.variant);

  if (doc.schema !== 2) warn(`dump schema ${doc.schema} (converter targets schema 2)`);
  for (const f of doc.failures) warn(`extractor caveat: ${f}`);
  if (variant.blocks.length === 0) throw new Error(`${name}: selected variant has no blocks`);

  // --- controller -------------------------------------------------------------------------
  const ctrl = doc.controller;
  let ctrlBlock = variant.blocks.find((b) => b.block === ctrl.registry_name && b.meta === ctrl.meta);
  if (!ctrlBlock) {
    ctrlBlock = variant.blocks.find((b) => b.d[0] === 0 && b.d[1] === 0 && b.d[2] === 0);
    if (!ctrlBlock)
      throw new Error(
        `${name}: controller block not found (no ${ctrl.registry_name}@${ctrl.meta}, nothing at d=[0,0,0])`,
      );
    warn(
      `controller identity ${ctrl.registry_name}@${ctrl.meta} not in blocks; using the block at d=[0,0,0]`,
    );
  }
  const controllerBlockId =
    lookupBlock(options.blockMap, ctrl.registry_name, ctrl.meta) ?? DEFAULT_CONTROLLER_BLOCK;

  // --- hatch sources ------------------------------------------------------------------------
  // `hatch_slots` when present; otherwise (schema v1 / failed probe) optionally the hint dots.
  const droppedKinds = new Set<string>();
  const hatchSources: { d: Vec3; kinds: HatchKind[]; what: string }[] = [];
  if (variant.hatch_slots.length > 0) {
    for (const slot of variant.hatch_slots) {
      const kinds: HatchKind[] = [];
      for (const k of slot.kinds) {
        const mapped = hatchKindMap[k];
        if (mapped) kinds.push(mapped);
        else droppedKinds.add(k);
      }
      if (kinds.length > 0) hatchSources.push({ d: slot.d, kinds: sortKinds(kinds), what: 'hatch slot' });
    }
  } else if (variant.hints.length > 0) {
    const fb = sortKinds(options.hintFallbackKinds ?? []);
    if (fb.length > 0) {
      warn(
        `no hatch_slots in dump; treating ${variant.hints.length} hint dots as hatch cells (${fb.join(', ')})`,
      );
      for (const h of variant.hints) hatchSources.push({ d: h.d, kinds: fb, what: 'hint dot' });
    } else {
      warn(`no hatch_slots in dump (${variant.hints.length} hint dots ignored); no hatch cells defined`);
    }
  } else {
    warn('no hatch_slots or hints in dump; no hatch cells defined');
  }
  if (droppedKinds.size > 0)
    warn(`hatch kinds with no planner equivalent dropped: ${[...droppedKinds].sort().join(', ')}`);

  // --- bounding box -------------------------------------------------------------------------
  // Blocks plus hatch cells: a hatch-only element (no fallback casing) leaves no scanned block.
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of [...variant.blocks.map((b) => b.d), ...hatchSources.map((h) => h.d)])
    for (let a = 0; a < 3; a++) {
      if (p[a] < min[a]) min[a] = p[a];
      if (p[a] > max[a]) max[a] = p[a];
    }
  const size: Vec3 = [max[0] - min[0] + 1, max[1] - min[1] + 1, max[2] - min[2] + 1];
  if (vkey(size) !== vkey(variant.bbox))
    warn(
      `bbox ${JSON.stringify(variant.bbox)} disagrees with the block + hatch span ${JSON.stringify(size)}; using the span`,
    );
  const inBox = (p: Vec3) => p.every((v, a) => v >= 0 && v < size[a]);

  // --- cells ----------------------------------------------------------------------------------
  const cells = new Map<string, Cell>();
  const unknownBlocks = new Map<string, { id: string; n: number }>();
  for (const b of variant.blocks) {
    if (b === ctrlBlock) continue;
    const local = sub(b.d, min);
    const k = vkey(local);
    let blockId = lookupBlock(options.blockMap, b.block, b.meta);
    if (!blockId) {
      blockId = generatedBlockId(b.block, b.meta);
      const uk = `${b.block}:${b.meta}`;
      const seen = unknownBlocks.get(uk);
      if (seen) seen.n++;
      else unknownBlocks.set(uk, { id: blockId, n: 1 });
    }
    if (cells.has(k)) warn(`duplicate block at d=${JSON.stringify(b.d)}; keeping the last one`);
    cells.set(k, { blockId, hatches: [] });
  }
  for (const [uk, { id, n }] of unknownBlocks)
    warn(`unmapped block ${uk} (${n} cells) -> ${id}; add it to block-map.json and src/data/blocks.ts`);
  const ctrlLocal = sub(ctrlBlock.d, min);
  const ctrlKey = vkey(ctrlLocal);

  // --- hatch cells ------------------------------------------------------------------------------
  for (const { d, kinds, what } of hatchSources) {
    const k = vkey(sub(d, min));
    if (k === ctrlKey) {
      warn(`${what} at the controller cell d=${JSON.stringify(d)} ignored`);
      continue;
    }
    let cell = cells.get(k);
    if (!cell) {
      // Hatch-only element (no fallback casing was placed): use the first kind's hatch block.
      cell = { blockId: DEFAULT_HATCH_BLOCKS[kinds[0]], hatches: [] };
      cells.set(k, cell);
      warn(`${what} at d=${JSON.stringify(d)} has no casing block; placed ${cell.blockId} there`);
    }
    cell.hatches = sortKinds([...cell.hatches, ...kinds]);
  }

  // --- empty cells: enclosed air vs outside ------------------------------------------------------
  // Flood-fill empty cells from outside the box (padded by one) through 6-neighbours.
  const occupied = (p: Vec3) => cells.has(vkey(p)) || vkey(p) === ctrlKey;
  const outside = new Set<string>();
  const stack: Vec3[] = [[-1, -1, -1]];
  outside.add(vkey([-1, -1, -1]));
  const NB: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  while (stack.length > 0) {
    const p = stack.pop() as Vec3;
    for (const n of NB) {
      const q: Vec3 = [p[0] + n[0], p[1] + n[1], p[2] + n[2]];
      if (q.some((v, a) => v < -1 || v > size[a])) continue;
      const qk = vkey(q);
      if (outside.has(qk) || (inBox(q) && occupied(q))) continue;
      outside.add(qk);
      stack.push(q);
    }
  }

  // --- legend -------------------------------------------------------------------------------------
  const legend: Record<string, LegendEntry> = {};
  const charOf = new Map<string, string>();
  const legendChar = (cell: Cell): string => {
    const gk = `${cell.blockId}|${cell.hatches.join(',')}`;
    let ch = charOf.get(gk);
    if (ch === undefined) {
      if (charOf.size >= LEGEND_CHARS.length)
        throw new Error(`${name}: more than ${LEGEND_CHARS.length} distinct cell types`);
      ch = LEGEND_CHARS[charOf.size];
      charOf.set(gk, ch);
      legend[ch] =
        cell.hatches.length > 0
          ? { blockId: cell.blockId, hatches: cell.hatches }
          : { blockId: cell.blockId };
    }
    return ch;
  };

  let enclosedAir = 0;
  const layers: string[][] = [];
  for (let y = 0; y < size[1]; y++) {
    const rows: string[] = [];
    for (let z = 0; z < size[2]; z++) {
      let row = '';
      for (let x = 0; x < size[0]; x++) {
        const k = vkey([x, y, z]);
        if (k === ctrlKey) row += '~';
        else {
          const cell = cells.get(k);
          if (cell) row += legendChar(cell);
          else if (outside.has(k)) row += ' ';
          else {
            row += '-';
            enclosedAir++;
          }
        }
      }
      rows.push(row);
    }
    layers.push(rows);
  }
  if (enclosedAir > 0)
    warn(
      `${enclosedAir} enclosed empty cells marked "-" (must stay air); the dump cannot distinguish "air" from "any block"`,
    );

  // --- facing sanity -------------------------------------------------------------------------------
  const facing: HorizontalDir = 'north';
  const front: Vec3 = [ctrlLocal[0], ctrlLocal[1], ctrlLocal[2] - 1];
  if (inBox(front) && occupied(front))
    warn(`controller front (north) is covered by a structure block at local ${vkey(front)}; check facing`);

  // --- hatches summary ----------------------------------------------------------------------------
  const presentKinds = sortKinds([...cells.values()].flatMap((c) => c.hatches));
  const hatchBlocks: Partial<Record<HatchKind, string>> = {};
  for (const k of presentKinds) hatchBlocks[k] = DEFAULT_HATCH_BLOCKS[k];
  const shareableHatches = sortKinds(options.shareableHatches ?? []).filter((k) => presentKinds.includes(k));

  // --- wallshare heuristic -----------------------------------------------------------------------
  const solidAt = (p: Vec3): string | undefined => {
    const k = vkey(p);
    return k === ctrlKey ? undefined : cells.get(k)?.blockId;
  };
  const shareAxes: string[] = [];
  for (const a of [0, 1, 2] as const) {
    const [u, v] = ([0, 1, 2] as const).filter((b) => b !== a);
    let ok = true;
    for (let i = 0; ok && i < size[u]; i++)
      for (let j = 0; ok && j < size[v]; j++) {
        const lo = [0, 0, 0] as [number, number, number];
        const hi = [0, 0, 0] as [number, number, number];
        lo[u] = hi[u] = i;
        lo[v] = hi[v] = j;
        lo[a] = 0;
        hi[a] = size[a] - 1;
        const bl = solidAt(lo);
        const bh = solidAt(hi);
        if (bl === undefined || bl !== bh) ok = false;
      }
    if (ok && size[a] > 1) shareAxes.push('XYZ'[a]);
  }
  const wallshare = shareAxes.length > 0;
  if (!wallshare) warn('no opposite face pair is solid and block-for-block identical; wallshare=false');

  // --- notes ---------------------------------------------------------------------------------------
  const notes: string[] = [
    `Auto-converted from a gtnh-process-line-solver structure dump (${ctrl.registry_name}@${ctrl.meta}, ${ctrl.source_class}` +
      (options.packVersion ? `, pack ${options.packVersion}` : '') +
      `). Trigger stack ${variant.trigger_stack_size} of ${doc.variants.length} dumped form(s).`,
  ];
  if (wallshare) notes.push(`Wallshare heuristic: matching solid faces along ${shareAxes.join(', ')}.`);
  const used = new Set(variant.blocks.map((b) => `${b.block}:${b.meta}`));
  for (const [ch, list] of Object.entries(doc.substitutions)) {
    if (list.length === 0) continue;
    const hit = list.find((s) => used.has(`${s.block}:${s.meta}`));
    notes.push(
      `Channel "${ch}" swaps ${hit ? `${hit.block}:${hit.meta}` : 'a tiered block'} for ${list.length} tier(s)` +
        ` (${list.map((s) => `${s.block}:${s.meta}`).join(', ')}).`,
    );
  }

  const source = sourceUrl(ctrl.source_class);
  const def: MultiblockDef = {
    id: options.id ?? slugify(name),
    name,
    ...(source ? { source } : {}),
    size,
    layers,
    legend,
    controller: { pos: ctrlLocal, facing, blockId: controllerBlockId },
    hatchBlocks,
    shareableHatches,
    defaultHatches: presentKinds,
    wallshare,
    notes: notes.join(' '),
  };
  const problems = validateDef(def);
  if (problems.length > 0)
    throw new Error(`${name}: converter produced an invalid def: ${problems.join('; ')}`);
  return { def, warnings, variant };
}

// ---------------------------------------------------------------------------------------------
// Output formatting

function inline(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
  if (isObj(v)) {
    const parts = Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`);
    return parts.length === 0 ? '{}' : `{ ${parts.join(', ')} }`;
  }
  return JSON.stringify(v);
}

/**
 * JSON text in the style of the hand-written catalog files: any array/object that fits on one line
 * within `width` columns is written inline, everything else is expanded with 2-space indents.
 */
export function formatJson(value: unknown, width = 110, indent = '', lead = 0): string {
  const one = inline(value);
  // +1 leaves room for a trailing comma.
  if (indent.length + lead + one.length + 1 <= width || (!Array.isArray(value) && !isObj(value))) return one;
  const next = indent + '  ';
  if (Array.isArray(value)) {
    return `[\n${value.map((v) => next + formatJson(v, width, next)).join(',\n')}\n${indent}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => {
    const head = `${JSON.stringify(k)}: `;
    return next + head + formatJson(v, width, next, head.length);
  });
  return `{\n${entries.join(',\n')}\n${indent}}`;
}

// ---------------------------------------------------------------------------------------------
// Validation

/**
 * Structural checks for a `MultiblockDef` (the contract in `src/model/types.ts`). Returns a list of
 * problems; empty means valid. Does not check block ids against the registry (callers may).
 */
export function validateDef(def: MultiblockDef): string[] {
  const out: string[] = [];
  const [sx, sy, sz] = def.size;
  if (typeof def.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(def.id))
    out.push(`bad id ${JSON.stringify(def.id)}`);
  if (typeof def.name !== 'string' || def.name === '') out.push('missing name');
  if (![sx, sy, sz].every((n) => Number.isInteger(n) && n > 0))
    out.push(`bad size ${JSON.stringify(def.size)}`);
  if (!Array.isArray(def.layers) || def.layers.length !== sy) out.push(`expected ${sy} layers`);
  let controllers = 0;
  def.layers?.forEach((layer, y) => {
    if (!Array.isArray(layer) || layer.length !== sz) out.push(`layer ${y}: expected ${sz} rows`);
    layer?.forEach((row, z) => {
      if (typeof row !== 'string' || row.length !== sx) {
        out.push(`layer ${y} row ${z}: expected a string of length ${sx}`);
        return;
      }
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '~') {
          controllers++;
          const p = def.controller?.pos;
          if (!p || p[0] !== x || p[1] !== y || p[2] !== z)
            out.push(`"~" at ${x},${y},${z} but controller.pos is ${JSON.stringify(p)}`);
        } else if (ch !== '-' && ch !== ' ' && !def.legend?.[ch])
          out.push(`unknown legend char "${ch}" at ${x},${y},${z}`);
      }
    });
  });
  if (controllers !== 1) out.push(`expected exactly one "~", found ${controllers}`);
  for (const [ch, e] of Object.entries(def.legend ?? {})) {
    if (ch.length !== 1 || ch === '~' || ch === '-' || ch === ' ')
      out.push(`reserved/invalid legend key "${ch}"`);
    if (!e || typeof e.blockId !== 'string' || e.blockId === '') out.push(`legend "${ch}" has no blockId`);
    for (const h of e?.hatches ?? [])
      if (!HATCH_KIND_ORDER.includes(h)) out.push(`legend "${ch}" has unknown hatch "${h}"`);
  }
  if (!['north', 'south', 'east', 'west'].includes(def.controller?.facing)) out.push('bad controller.facing');
  if (!def.controller?.blockId) out.push('missing controller.blockId');
  for (const k of [...(def.defaultHatches ?? []), ...(def.shareableHatches ?? [])])
    if (!HATCH_KIND_ORDER.includes(k)) out.push(`unknown hatch kind "${k}"`);
  if (typeof def.wallshare !== 'boolean') out.push('wallshare must be boolean');
  return out;
}
