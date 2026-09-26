import { add, dirVec, key, localCells, rotateDir, rotateLocal, rotatedSize } from './geometry';
import type { MultiblockDef, PackResult, PlanLimits, Rotation, Unit, Vec3 } from './types';

/**
 * UNIT 1 — Layout packing.
 *
 * Auto-place `count` units of `def` as compactly as possible.
 * - When `def.wallshare`, neighbours overlap by one block (pitch = size - 1) so they share walls;
 *   otherwise they are placed side by side without overlap.
 * - A controller cell must never lie on a shared (overlapping) face: pick rotations so controllers face outward.
 * - At most `limits` units along each world axis (x, y = layers, z; null = unlimited).
 * - Deterministic, pure, and fast (< 20 ms for 60 units).
 * Returns fewer units than requested with a `reason` when they do not fit.
 *
 * How it works: units sit on a lattice (counts nx × ny × nz). Along each axis the spacing is either uniform
 * (shared wall or touching) or "paired": two units back to back, then a one-block walkway that the controllers
 * of neighbouring pairs face. All units share one rotation parity so their rotated bounding boxes are equal;
 * within that parity a unit may be turned by 180° depending on its lattice index along one horizontal axis,
 * which puts rows back to back with controllers facing outward. Every lattice shape is scored analytically
 * (shared faces, height, area) and candidates are validated best-first against memoised pairwise cell
 * checks, so only a handful are ever fully checked.
 */

/** Cell codes in a rotated occupancy grid. Casings get `CASING + blockIndex`. */
const EMPTY = 0;
const AIR = 1;
const CONTROLLER = 2;
const CASING = 3;

interface Shape {
  size: Vec3;
  grid: Int32Array;
  /** Cell right in front of the controller (relative to the unit origin), which must stay free. */
  front: Vec3 | null;
}

/**
 * Spacing along one axis: unit i sits at floor(i / 2) * (inner + outer) + (i % 2) * inner.
 * Uniform spacing has inner === outer.
 */
interface Spacing {
  inner: number;
  outer: number;
}

/** A rotation parity plus a spacing per axis, with what the axis-aligned neighbour checks allow. */
interface Mode {
  parity: 0 | 1;
  size: Vec3;
  spacing: [Spacing, Spacing, Spacing];
  /** Most units per axis under the best rotation pattern (Infinity = unbounded). */
  pairCaps: Vec3;
  /** Uses a two-block gap or walkway somewhere: only for routed layouts (see `loosenings`). */
  wide: boolean;
  seq: number;
}

interface DefCache {
  shapes: Shape[];
  pairs: Map<string, boolean>;
  modes: Mode[] | null;
  results: Map<string, PackResult>;
}

/** Fill orders: which horizontal axis fills fastest (height is always filled last, bottom-up). */
type Order = 'xzy' | 'zxy';

interface Candidate {
  mode: Mode;
  counts: Vec3;
  /** Lattice cells actually used along each axis. */
  used: Vec3;
  order: Order;
  faces: number;
  height: number;
  area: number;
  squareness: number;
  seq: number;
}

/** Rotation patterns tried per lattice: base 180° flip × which horizontal axis alternates (none/Z/X). */
const PATTERNS: readonly { flip: 0 | 1; alt: -1 | 0 | 2 }[] = [
  { flip: 0, alt: -1 },
  { flip: 1, alt: -1 },
  { flip: 0, alt: 2 },
  { flip: 1, alt: 2 },
  { flip: 0, alt: 0 },
  { flip: 1, alt: 0 },
];

const RESULT_CACHE_SIZE = 64;

/** The candidate each layout array handed out came from, so it can be loosened later (see `loosenings`). */
const sourceOf = new WeakMap<readonly Unit[], Candidate>();
const caches = new WeakMap<MultiblockDef, DefCache>();

function defCache(def: MultiblockDef): DefCache {
  let c = caches.get(def);
  if (!c) {
    c = { shapes: buildShapes(def), pairs: new Map(), modes: null, results: new Map() };
    caches.set(def, c);
  }
  return c;
}

function gridIndex(size: Vec3, x: number, y: number, z: number): number {
  return (y * size[2] + z) * size[0] + x;
}

function inside(size: Vec3, p: Vec3): boolean {
  return p[0] >= 0 && p[1] >= 0 && p[2] >= 0 && p[0] < size[0] && p[1] < size[1] && p[2] < size[2];
}

function axisVec(a: number, v: number): Vec3 {
  return a === 0 ? [v, 0, 0] : a === 1 ? [0, v, 0] : [0, 0, v];
}

function buildShapes(def: MultiblockDef): Shape[] {
  const blockIndex = new Map<string, number>();
  const cells = localCells(def);
  const shapes: Shape[] = [];
  for (const r of [0, 1, 2, 3] as const) {
    const size = rotatedSize(def, r);
    const grid = new Int32Array(size[0] * size[1] * size[2]);
    let front: Vec3 | null = null;
    for (const c of cells) {
      const p = rotateLocal(def, c.local, r);
      let code: number;
      if (c.role === 'air') code = AIR;
      else if (c.role === 'controller') {
        code = CONTROLLER;
        front = add(p, dirVec(rotateDir(def.controller.facing, r)));
      } else {
        const id = c.blockId ?? '';
        let idx = blockIndex.get(id);
        if (idx === undefined) {
          idx = blockIndex.size;
          blockIndex.set(id, idx);
        }
        code = CASING + idx;
      }
      grid[gridIndex(size, p[0], p[1], p[2])] = code;
    }
    shapes.push({ size, grid, front });
  }
  return shapes;
}

/**
 * Can unit B (rotation rb, origin at offset d from unit A's origin) coexist with unit A (rotation ra)?
 * Overlapping cells must be casings of the same block on a wall-sharing def, or air on air; controllers never
 * overlap anything, air never overlaps a block, and neither controller's front cell may be covered by the
 * other unit's blocks.
 */
function pairOk(def: MultiblockDef, cache: DefCache, ra: number, rb: number, d: Vec3): boolean {
  const k = `${ra},${rb},${key(d)}`;
  const hit = cache.pairs.get(k);
  if (hit !== undefined) return hit;
  const ok = computePairOk(def.wallshare, cache.shapes[ra], cache.shapes[rb], d);
  cache.pairs.set(k, ok);
  return ok;
}

function computePairOk(wallshare: boolean, a: Shape, b: Shape, d: Vec3): boolean {
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    lo[i] = Math.max(0, d[i]);
    hi[i] = Math.min(a.size[i], d[i] + b.size[i]);
  }
  for (let y = lo[1]; y < hi[1]; y++)
    for (let z = lo[2]; z < hi[2]; z++)
      for (let x = lo[0]; x < hi[0]; x++) {
        const ca = a.grid[gridIndex(a.size, x, y, z)];
        if (ca === EMPTY) continue;
        const cb = b.grid[gridIndex(b.size, x - d[0], y - d[1], z - d[2])];
        if (cb === EMPTY || (ca === AIR && cb === AIR)) continue;
        if (!wallshare || ca < CASING || ca !== cb) return false;
      }
  if (a.front) {
    const f: Vec3 = [a.front[0] - d[0], a.front[1] - d[1], a.front[2] - d[2]];
    if (inside(b.size, f) && b.grid[gridIndex(b.size, f[0], f[1], f[2])] >= CONTROLLER) return false;
  }
  if (b.front) {
    const f = add(b.front, d);
    if (inside(a.size, f) && a.grid[gridIndex(a.size, f[0], f[1], f[2])] >= CONTROLLER) return false;
  }
  return true;
}

function rotationAt(parity: number, flip: number, alt: number, p: Vec3): Rotation {
  return ((parity + 2 * flip + (alt < 0 ? 0 : 2 * (p[alt] % 2))) % 4) as Rotation;
}

/** Position of the i-th unit along an axis. */
function coord(sp: Spacing, i: number): number {
  return Math.floor(i / 2) * (sp.inner + sp.outer) + (i % 2) * sp.inner;
}

/**
 * Most units axis `a` can hold under one rotation pattern, judging only the neighbours of the first unit
 * along it: pair (0 -> 1) at `inner` and pair (1 -> 2) at `outer`. Every later pair along the axis repeats
 * one of these two. Because the fill is a prefix of an order that is monotone in each coordinate, those two
 * pairs exist whenever an axis holds 2 (or 3) units, so this is a necessary condition for validity.
 */
function neighbourCap(
  def: MultiblockDef,
  cache: DefCache,
  parity: number,
  sp: Spacing,
  a: number,
  flip: number,
  alt: number,
): number {
  const r0 = rotationAt(parity, flip, alt, [0, 0, 0]);
  const r1 = rotationAt(parity, flip, alt, axisVec(a, 1));
  if (!pairOk(def, cache, r0, r1, axisVec(a, sp.inner))) return 1;
  if (!pairOk(def, cache, r1, r0, axisVec(a, sp.outer))) return 2;
  return Infinity;
}

/**
 * All parities and spacings worth trying for a def, independent of count and limits (cached per def).
 * Horizontal axes may use a paired spacing with a walkway, but only where uniform wall sharing along that
 * axis is capped (typically the axis controllers face).
 */
function modesFor(def: MultiblockDef, cache: DefCache): Mode[] {
  if (cache.modes) return cache.modes;
  const modes: Mode[] = [];
  for (const parity of [0, 1] as const) {
    const size = rotatedSize(def, parity);
    const options: { sp: Spacing; cap: number; wide: boolean }[][] = [];
    for (let a = 0; a < 3; a++) {
      const s = size[a];
      const tight = def.wallshare && s >= 2 ? s - 1 : s;
      const uniform: Spacing[] =
        tight === s
          ? [{ inner: s, outer: s }]
          : [
              { inner: tight, outer: tight },
              { inner: s, outer: s },
            ];
      const capOf = (sp: Spacing) =>
        Math.max(...PATTERNS.map(({ flip, alt }) => neighbourCap(def, cache, parity, sp, a, flip, alt)));
      const axis = uniform.map((sp) => ({ sp, cap: capOf(sp), wide: false }));
      if (a !== 1 && axis[0].cap !== Infinity) {
        const paired: Spacing = { inner: tight, outer: s + 1 };
        axis.push({ sp: paired, cap: capOf(paired), wide: false });
      }
      if (a !== 1) {
        // A one-block gap between all units: every side stays open for hatches that cannot be shared.
        const gap: Spacing = { inner: s + 1, outer: s + 1 };
        axis.push({ sp: gap, cap: capOf(gap), wide: false });
        // Two-block walkways and gaps leave room for several pipes side by side (routed layouts only).
        const paired2: Spacing = { inner: tight, outer: s + 2 };
        axis.push({ sp: paired2, cap: capOf(paired2), wide: true });
        const gap2: Spacing = { inner: s + 2, outer: s + 2 };
        axis.push({ sp: gap2, cap: capOf(gap2), wide: true });
      }
      options.push(axis);
    }
    for (const ox of options[0])
      for (const oy of options[1])
        for (const oz of options[2])
          modes.push({
            parity,
            size,
            spacing: [ox.sp, oy.sp, oz.sp],
            pairCaps: [ox.cap, oy.cap, oz.cap],
            wide: ox.wide || oz.wide,
            seq: modes.length,
          });
  }
  cache.modes = modes;
  return modes;
}

/** Axis indices [fast, slow] of the horizontal fill for an order. */
function orderAxes(order: Order): [0 | 2, 0 | 2] {
  return order === 'xzy' ? [0, 2] : [2, 0];
}

/** Lattice coordinates of the `idx`-th unit in fill order. */
function decode(idx: number, counts: Vec3, order: Order): Vec3 {
  const [f, s] = orderAxes(order);
  const cf = counts[f];
  const cs = counts[s];
  const out = [0, 0, 0];
  out[f] = idx % cf;
  out[s] = Math.floor(idx / cf) % cs;
  out[1] = Math.floor(idx / (cf * cs));
  return [out[0], out[1], out[2]];
}

/** Fill-order index of a lattice cell (monotone in every coordinate). */
function ordinal(p: Vec3, counts: Vec3, order: Order): number {
  const [f, s] = orderAxes(order);
  return (p[1] * counts[s] + p[s]) * counts[f] + p[f];
}

/**
 * For the first `n` lattice cells in fill order, per axis: units with index >= 1 (= neighbour pairs along
 * that axis, each unit pairing with its predecessor), units with an odd index (= pairs whose first unit is
 * even), and the used extent. O(1).
 */
function fillStats(n: number, counts: Vec3, order: Order): { pairs: Vec3; odd: Vec3; used: Vec3 } {
  const [f, s] = orderAxes(order);
  const cf = counts[f];
  const cs = counts[s];
  const layer = cf * cs;
  const full = Math.floor(n / layer);
  const rem = n % layer;
  const rows = Math.floor(rem / cf);
  const r = rem % cf;
  const pairs = [0, 0, 0];
  const odd = [0, 0, 0];
  const used = [0, 0, 0];
  pairs[f] = (full * cs + rows) * (cf - 1) + Math.max(r - 1, 0);
  odd[f] = (full * cs + rows) * Math.floor(cf / 2) + Math.floor(r / 2);
  pairs[s] = full * cf * (cs - 1) + Math.max(rows - 1, 0) * cf + (rows >= 1 ? r : 0);
  odd[s] = full * cf * Math.floor(cs / 2) + Math.floor(rows / 2) * cf + (rows % 2 === 1 ? r : 0);
  pairs[1] = Math.max(full - 1, 0) * layer + (full >= 1 ? rem : 0);
  odd[1] = Math.floor(full / 2) * layer + (full % 2 === 1 ? rem : 0);
  used[f] = Math.min(n, cf);
  used[s] = full >= 1 ? cs : rows + (r > 0 ? 1 : 0);
  used[1] = full + (rem > 0 ? 1 : 0);
  return {
    pairs: [pairs[0], pairs[1], pairs[2]],
    odd: [odd[0], odd[1], odd[2]],
    used: [used[0], used[1], used[2]],
  };
}

function sanitizeLimit(v: number | null): number | null {
  return v === null || !Number.isFinite(v) ? null : Math.max(0, Math.floor(v));
}

const LIMIT_KEYS = ['x', 'y', 'z'] as const;

/** Per-axis unit caps of a mode under limits (neighbour rules and unit-count limits), each at most `n`. */
function modeCaps(mode: Mode, limits: PlanLimits, n: number): Vec3 {
  const caps = [0, 1, 2].map((a) => Math.min(mode.pairCaps[a], limits[LIMIT_KEYS[a]] ?? n, n));
  return [caps[0], caps[1], caps[2]];
}

/** Lattice shapes (counts per axis) that hold `n` units with no surplus row/layer, within caps. */
function latticeCounts(n: number, caps: Vec3): Vec3[] {
  const seen = new Set<string>();
  const out: Vec3[] = [];
  const push = (c: Vec3) => {
    const k = key(c);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  };
  // Derive the third count from the other two, once with Z derived and once with X derived.
  for (const derived of [2, 0] as const) {
    const other = derived === 2 ? 0 : 2;
    for (let a = 1; a <= caps[other]; a++) {
      for (let y = 1; y <= caps[1]; y++) {
        const c = Math.ceil(n / (a * y));
        if (c <= caps[derived]) {
          const counts = [0, y, 0];
          counts[other] = a;
          counts[derived] = c;
          push([counts[0], counts[1], counts[2]]);
        }
        if (a * y >= n) break;
      }
      if (a >= n) break;
    }
  }
  return out;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    b.faces - a.faces ||
    a.height - b.height ||
    a.area - b.area ||
    a.squareness - b.squareness ||
    a.seq - b.seq
  );
}

/** A spacing with a gap wider than "touching" between every pair of units. */
function isGap(sp: Spacing, size: number): boolean {
  return sp.inner > size;
}

/**
 * Ranked candidate layouts. The compact family (used by `packUnits`) has no gaps and uses walkways only
 * along axes with a limit; `spaced` adds gap and walkway layouts everywhere (see `layoutCandidates`).
 */
function candidates(
  def: MultiblockDef,
  modes: Mode[],
  n: number,
  limits: PlanLimits,
  spaced: boolean | 'wide' = false,
): Candidate[] {
  const out: Candidate[] = [];
  const countsByCaps = new Map<string, Vec3[]>();
  let seq = 0;
  for (const mode of modes) {
    const { size, spacing } = mode;
    // Walkways only pay off when a limit stops the layout from growing along another axis instead.
    if (mode.wide && spaced !== 'wide') continue;
    if (
      !spaced &&
      ((spacing[0].inner !== spacing[0].outer && limits.x === null) ||
        (spacing[2].inner !== spacing[2].outer && limits.z === null) ||
        isGap(spacing[0], size[0]) ||
        isGap(spacing[2], size[2]))
    )
      continue;
    const caps = modeCaps(mode, limits, n);
    if (caps[0] === 0 || caps[1] === 0 || caps[2] === 0) continue;
    const capsKey = key(caps);
    let lattices = countsByCaps.get(capsKey);
    if (!lattices) {
      lattices = latticeCounts(n, caps);
      countsByCaps.set(capsKey, lattices);
    }
    for (const counts of lattices) {
      for (const order of ['xzy', 'zxy'] as const) {
        // With a single row either way both orders produce the same layout.
        if (order === 'zxy' && (counts[0] === 1 || counts[2] === 1)) continue;
        const { pairs, odd, used } = fillStats(n, counts, order);
        const ext = [0, 1, 2].map((a) => coord(spacing[a], used[a] - 1) + size[a]);
        let faces = 0;
        for (let a = 0; a < 3; a++) {
          if (!def.wallshare) continue;
          if (spacing[a].inner === size[a] - 1) faces += odd[a];
          if (spacing[a].outer === size[a] - 1) faces += pairs[a] - odd[a];
        }
        out.push({
          mode,
          counts,
          used,
          order,
          faces,
          height: ext[1],
          area: ext[0] * ext[2],
          squareness: Math.abs(ext[0] - ext[2]),
          seq: seq++,
        });
      }
    }
  }
  return out.sort(compareCandidates);
}

/**
 * Lattice offsets (one per unordered pair) that may interact. Spacing is at least max(1, size - 1), so
 * units three or more lattice steps apart are always more than `size` blocks apart and never interact.
 */
const OFFSETS: readonly Vec3[] = (() => {
  const out: Vec3[] = [];
  for (let ox = -2; ox <= 2; ox++)
    for (let oy = -2; oy <= 2; oy++)
      for (let oz = -2; oz <= 2; oz++) {
        const first = ox !== 0 ? ox : oy !== 0 ? oy : oz;
        if (first > 0) out.push([ox, oy, oz]);
      }
  return out;
})();

function unitOrigin(sp: [Spacing, Spacing, Spacing], p: Vec3): Vec3 {
  return [coord(sp[0], p[0]), coord(sp[1], p[1]), coord(sp[2], p[2])];
}

/** Validate a candidate; returns the units of the first rotation pattern that works, or null. */
function realize(def: MultiblockDef, cache: DefCache, n: number, c: Candidate): Unit[] | null {
  const { parity, spacing, size } = c.mode;
  let cells: Vec3[] | null = null;
  let origins: Vec3[] | null = null;
  for (const { flip, alt } of PATTERNS) {
    // Alternation along an axis with a single unit is the same as no alternation.
    if (alt !== -1 && c.used[alt] === 1) continue;
    let cheapOk = true;
    for (let a = 0; a < 3 && cheapOk; a++)
      if (c.used[a] >= 2 && c.used[a] > neighbourCap(def, cache, parity, spacing[a], a, flip, alt))
        cheapOk = false;
    if (!cheapOk) continue;
    if (!cells || !origins) {
      cells = [];
      for (let i = 0; i < n; i++) cells.push(decode(i, c.counts, c.order));
      origins = cells.map((p) => unitOrigin(spacing, p));
    }
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      const p = cells[i];
      const ra = rotationAt(parity, flip, alt, p);
      for (const o of OFFSETS) {
        const q = add(p, o);
        if (!inside(c.counts, q)) continue;
        const j = ordinal(q, c.counts, c.order);
        if (j >= n) continue;
        const qo = origins[j];
        const d: Vec3 = [qo[0] - origins[i][0], qo[1] - origins[i][1], qo[2] - origins[i][2]];
        // Boxes grown by one (for the controller's front cell) must touch to interact.
        if (Math.abs(d[0]) > size[0] || Math.abs(d[1]) > size[1] || Math.abs(d[2]) > size[2]) continue;
        if (!pairOk(def, cache, ra, rotationAt(parity, flip, alt, q), d)) {
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      const found = origins;
      const units = cells.map((p, id) => ({
        id,
        origin: found[id],
        rotation: rotationAt(parity, flip, alt, p),
      }));
      sourceOf.set(units, c);
      return units;
    }
  }
  return null;
}

/** Best layout of exactly `n` units within limits, or null when none of the lattice layouts fits. */
function tryPack(def: MultiblockDef, cache: DefCache, n: number, limits: PlanLimits): Unit[] | null {
  if (n === 0) return [];
  for (const c of candidates(def, modesFor(def, cache), n, limits)) {
    const units = realize(def, cache, n, c);
    if (units) return units;
  }
  return null;
}

/** Upper bound on units that fit the limits (lattice cells allowed by caps), capped at `n`. */
function fitBound(def: MultiblockDef, cache: DefCache, n: number, limits: PlanLimits): number {
  let best = 0;
  for (const mode of modesFor(def, cache)) {
    const caps = modeCaps(mode, limits, n);
    best = Math.max(best, Math.min(n, caps[0] * caps[1] * caps[2]));
  }
  return best;
}

function cloneResult(r: PackResult): PackResult {
  const units = r.units.map((u) => ({
    id: u.id,
    origin: [u.origin[0], u.origin[1], u.origin[2]] as Vec3,
    rotation: u.rotation,
  }));
  const source = sourceOf.get(r.units);
  if (source) sourceOf.set(units, source);
  return { ...r, units };
}

function sanitizeLimits(limits: PlanLimits): PlanLimits {
  return { x: sanitizeLimit(limits.x), y: sanitizeLimit(limits.y), z: sanitizeLimit(limits.z) };
}

/**
 * Every valid layout of exactly `count` units within `limits`, best first: the compact layouts `packUnits`
 * chooses from, then looser ones (gaps between units, walkways) that leave more faces open for hatches.
 * Lazy, so callers can stop at the first layout that suits them. Identical layouts are yielded once.
 */
export function* layoutCandidates(def: MultiblockDef, count: number, limits: PlanLimits): Generator<Unit[]> {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n === 0) return;
  const lim = sanitizeLimits(limits);
  const cache = defCache(def);
  const seen = new Set<string>();
  // Round-robin over spacing families (gap / walkway / shared per axis) so that looser families are
  // reached after a few tries instead of after every compact lattice shape.
  const groups = new Map<string, Candidate[]>();
  for (const c of candidates(def, modesFor(def, cache), n, lim, true)) {
    const g = `${c.mode.parity}|${c.mode.spacing.map((s) => `${s.inner}/${s.outer}`).join(',')}`;
    const list = groups.get(g);
    if (list) list.push(c);
    else groups.set(g, [c]);
  }
  const ordered: Candidate[] = [];
  const lists = [...groups.values()];
  const total = lists.reduce((s, l) => s + l.length, 0);
  for (let round = 0; ordered.length < total; round++)
    for (const l of lists) if (round < l.length) ordered.push(l[round]);
  for (const c of ordered) {
    const units = realize(def, cache, n, c);
    if (!units) continue;
    const k = units.map((u) => `${key(u.origin)}/${u.rotation}`).join(';');
    if (seen.has(k)) continue;
    seen.add(k);
    yield units;
  }
}

export function packUnits(def: MultiblockDef, count: number, limits: PlanLimits): PackResult {
  const requested = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const lim = sanitizeLimits(limits);
  const cache = defCache(def);
  const cacheKey = `${requested}|${lim.x}|${lim.y}|${lim.z}`;
  const cached = cache.results.get(cacheKey);
  if (cached) {
    // Refresh recency (LRU).
    cache.results.delete(cacheKey);
    cache.results.set(cacheKey, cached);
    return cloneResult(cached);
  }

  let units = tryPack(def, cache, requested, lim);
  if (!units) {
    // Dropping units from a layout keeps it valid, so feasible counts are (practically) a prefix of 0..n:
    // binary search the largest, then probe upwards in case the lattice family skipped a count.
    const bound = Math.min(requested - 1, fitBound(def, cache, requested, lim));
    let lo = 0;
    let hi = bound;
    let best: Unit[] = [];
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const u = tryPack(def, cache, mid, lim);
      if (u) {
        best = u;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    for (let m = best.length + 1; m <= bound; m++) {
      const u = tryPack(def, cache, m, lim);
      if (!u) break;
      best = u;
    }
    units = best;
  }

  const result: PackResult = { units, requested, placed: units.length };
  if (units.length < requested) {
    // Without limits a single row along a non-facing axis always fits, so a shortfall means the limits.
    const limited = lim.x !== null || lim.y !== null || lim.z !== null;
    result.reason = limited ? 'limits' : 'geometry';
  }
  if (cache.results.size >= RESULT_CACHE_SIZE) {
    const oldest = cache.results.keys().next().value;
    if (oldest !== undefined) cache.results.delete(oldest);
  }
  cache.results.set(cacheKey, result);
  return cloneResult(result);
}

/** Bounding volume of a candidate layout, in blocks. */
function volumeOf(c: Candidate): number {
  const { spacing, size } = c.mode;
  let v = 1;
  for (let a = 0; a < 3; a++) v *= coord(spacing[a], c.used[a] - 1) + size[a];
  return v;
}

/** Spacing families of one axis from tightest to loosest: shared, touching, walkway, gap, wide walkway, wide gap. */
function looseness(sp: Spacing, size: number): number {
  return sp.inner + sp.outer + (sp.inner === sp.outer ? 0.5 : 0) - 2 * size;
}

/**
 * The same arrangement as `units` (a layout from `packUnits` or `layoutCandidates`: same units per axis,
 * same fill order, same layers) with looser spacing along X and Z: walkways and gaps of one or two blocks
 * instead of shared walls, smallest bounding volume first, so the last one has two-block gaps all round
 * wherever the rotations allow. Yields nothing for other layouts (e.g. manual ones). Lazy and
 * deterministic; each yielded layout is valid and differs from `units` and from the ones before it.
 */
export function* loosenings(def: MultiblockDef, units: readonly Unit[]): Generator<Unit[]> {
  const base = sourceOf.get(units);
  if (!base) return;
  const n = units.length;
  const cache = defCache(def);
  const { parity, spacing, size } = base.mode;
  const list: { c: Candidate; volume: number }[] = [];
  for (const mode of modesFor(def, cache)) {
    const sp = mode.spacing;
    if (mode.parity !== parity || sp[1].inner !== spacing[1].inner || sp[1].outer !== spacing[1].outer)
      continue;
    if ([0, 2].some((a) => looseness(sp[a], size[a]) < looseness(spacing[a], size[a]))) continue;
    if ([0, 2].every((a) => sp[a].inner === spacing[a].inner && sp[a].outer === spacing[a].outer)) continue;
    if ([0, 1, 2].some((a) => base.used[a] > mode.pairCaps[a])) continue;
    const c: Candidate = { ...base, mode };
    list.push({ c, volume: volumeOf(c) });
  }
  list.sort((a, b) => a.volume - b.volume || a.c.mode.seq - b.c.mode.seq);
  const layoutKey = (us: readonly Unit[]) => us.map((u) => `${key(u.origin)}/${u.rotation}`).join(';');
  const seen = new Set([layoutKey(units)]);
  for (const { c } of list) {
    const out = realize(def, cache, n, c);
    if (!out) continue;
    const k = layoutKey(out);
    if (seen.has(k)) continue;
    seen.add(k);
    yield out;
  }
}
