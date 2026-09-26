import {
  controllerFacing,
  localCells,
  packCell,
  rotateDir,
  rotateLocal,
  rotatedSize,
  step,
  type CellKey,
} from './geometry';
import type { Dir, HatchKind, HatchPlacement, HatchResult, MultiblockDef, Unit, Vec3 } from './types';

/**
 * Fixed order in which hatch kinds are placed. Rare / restricted kinds go first so that the common
 * item and fluid hatches cannot take the only cells they are allowed on.
 */
export const HATCH_PRIORITY: readonly HatchKind[] = [
  'muffler',
  'maintenance',
  'energy',
  'dynamo',
  'steamIn',
  'itemIn',
  'fluidIn',
  'itemOut',
  'fluidOut',
];

/** Preferred output face when a cell has several open ones: sides first, then top, bottom last. */
const FACE_ORDER: readonly Dir[] = ['north', 'east', 'south', 'west', 'up', 'down'];

/**
 * A hatch face counts as facing outward when this many cells straight ahead of it are free. Hatches can be
 * turned to any open side in game, so a face looking into a one-block gap between units (or a recess) is
 * only used when the hatch has no outward face.
 */
const CLEAR_AHEAD = 16;

/**
 * Above this many cells in the (padded) bounding box, the outside flood fill is skipped and any face
 * whose neighbour is not a structure cell counts as open. Only hit by far-apart manual layouts.
 */
const FLOOD_LIMIT = 1_000_000;

/** A cell where every unit containing it has a casing of the same block (hatch-able in principle). */
interface Site {
  pos: Vec3;
  key: CellKey;
  /** Unit ids whose structure contains this cell, ascending. */
  unitIds: number[];
  /** Hatch kinds every containing unit allows here. */
  kinds: ReadonlySet<HatchKind>;
  /**
   * Open faces, best first, with the key of the empty cell in front of each. `rank` orders them: faces
   * with open space ahead (see `CLEAR_AHEAD`) before faces into a gap or recess, then `FACE_ORDER`.
   */
  faces: { dir: Dir; front: CellKey; rank: number }[];
  /** Per containing unit, the legend region of this cell (see `LegendEntry.region`). */
  regions: ReadonlyMap<number, string>;
  /** World-frame sides a hatch of a kind must not face here (`LegendEntry.disallowFaces`, any unit). */
  blocked: ReadonlyMap<HatchKind, ReadonlySet<Dir>>;
}

/** How many hatches of one kind each unit wants (`target`) and may have at most (`max`). */
function quota(def: MultiblockDef, kind: HatchKind): { target: number; max: number } {
  const req = def.requiredHatches?.[kind];
  if (!req) return { target: 1, max: Infinity };
  const max = typeof req.max === 'number' && req.max >= 0 ? Math.floor(req.max) : Infinity;
  const min = Number.isFinite(req.min) ? Math.max(0, Math.floor(req.min)) : 0;
  // An enabled kind always gets at least one hatch, unless the definition forbids it (max 0).
  return { target: Math.min(Math.max(min, 1), max), max };
}

/** A candidate site's rank for the hatch kind being placed. */
interface Entry {
  /** Index into the position-sorted candidate list. */
  i: number;
  /** Units on the site still below their target. */
  score: number;
  /** Units on the site already served. */
  waste: number;
  /** 1 when the face used would wall in a pipe (see `walledIn`), else 0. */
  walled: number;
  /** Index of the open face used, into the site's `faces`. */
  face: number;
  /** That face's position in `FACE_ORDER` (sides before top before bottom). */
  faceRank: number;
}

/** Negative when `a` is the better pick: higher score, then less waste, then a better face, then lower cell. */
function compareEntries(a: Entry, b: Entry): number {
  return (
    b.score - a.score || a.waste - b.waste || a.walled - b.walled || a.faceRank - b.faceRank || a.i - b.i
  );
}

/** Binary heap with the best entry (by `compareEntries`) on top. */
class EntryHeap {
  private items: Entry[] = [];

  push(e: Entry): void {
    const a = this.items;
    a.push(e);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (compareEntries(a[i], a[parent]) >= 0) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }

  pop(): Entry | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0 && last) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && compareEntries(a[l], a[m]) < 0) m = l;
        if (r < a.length && compareEntries(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/** Compare two cells: y, then z, then x (bottom-up, north-to-south, west-to-east). */
function comparePos(a: Vec3, b: Vec3): number {
  return a[1] - b[1] || a[2] - b[2] || a[0] - b[0];
}

/** Kinds to place: enabled, supported by the def (it has a hatch block), deduplicated, fixed order. */
function kindsToPlace(def: MultiblockDef, enabled: readonly HatchKind[]): HatchKind[] {
  const wanted = new Set(enabled);
  return HATCH_PRIORITY.filter((k) => wanted.has(k) && def.hatchBlocks?.[k] !== undefined);
}

function sortedIds(units: readonly Unit[]): number[] {
  return [...new Set(units.map((u) => u.id))].sort((a, b) => a - b);
}

function allUnplaced(def: MultiblockDef, units: readonly Unit[], kinds: HatchKind[]): HatchResult {
  const unplaced: HatchResult['unplaced'] = [];
  for (const kind of kinds) {
    const { target } = quota(def, kind);
    for (const unitId of sortedIds(units)) for (let i = 0; i < target; i++) unplaced.push({ unitId, kind });
  }
  return { hatches: [], unplaced };
}

/** Dense box of cells (the build's bounding box grown by one block), indexed x fastest, then z, then y. */
interface Box {
  ox: number;
  oy: number;
  oz: number;
  nx: number;
  ny: number;
  nz: number;
}

function boxIndex(b: Box, p: Vec3): number {
  const x = p[0] - b.ox;
  const y = p[1] - b.oy;
  const z = p[2] - b.oz;
  if (x < 0 || y < 0 || z < 0 || x >= b.nx || y >= b.ny || z >= b.nz) return -1;
  return (y * b.nz + z) * b.nx + x;
}

/** Index step of one block in each `FACE_ORDER` direction. */
function boxSteps(b: Box): number[] {
  const { nx, nz } = b;
  return FACE_ORDER.map((d) => {
    const [x, y, z] = step([0, 0, 0], d);
    return (y * nz + z) * nx + x;
  });
}

/**
 * Marks the empty cells of the box that are reachable from outside the build (not a sealed pocket, not
 * underground): a flood fill from a padded corner at ground level. Everything below `ground` (the lowest
 * structure layer) is solid ground.
 */
function outsideCells(b: Box, solid: Uint8Array, ground: number): Uint8Array {
  const { nx, ny, nz } = b;
  const volume = nx * ny * nz;
  const blocked = solid.slice();
  // The padding layer under the build is ground.
  for (let y = 0; y < Math.min(ny, ground - b.oy); y++) blocked.fill(1, y * nx * nz, (y + 1) * nx * nz);
  const outside = new Uint8Array(volume);
  const queue = new Int32Array(volume);
  let head = 0;
  let tail = 0;
  const start = (Math.max(0, ground - b.oy) * nz + 0) * nx + 0; // padded corner at ground level, never solid
  outside[start] = 1;
  queue[tail++] = start;
  const layer = nx * nz;
  while (head < tail) {
    const i = queue[head++];
    const x = i % nx;
    const z = ((i - x) / nx) % nz;
    const y = (i - x - z * nx) / layer;
    if (x > 0 && !blocked[i - 1] && !outside[i - 1]) ((outside[i - 1] = 1), (queue[tail++] = i - 1));
    if (x < nx - 1 && !blocked[i + 1] && !outside[i + 1]) ((outside[i + 1] = 1), (queue[tail++] = i + 1));
    if (z > 0 && !blocked[i - nx] && !outside[i - nx]) ((outside[i - nx] = 1), (queue[tail++] = i - nx));
    if (z < nz - 1 && !blocked[i + nx] && !outside[i + nx]) ((outside[i + nx] = 1), (queue[tail++] = i + nx));
    if (y > 0 && !blocked[i - layer] && !outside[i - layer])
      ((outside[i - layer] = 1), (queue[tail++] = i - layer));
    if (y < ny - 1 && !blocked[i + layer] && !outside[i + layer])
      ((outside[i + layer] = 1), (queue[tail++] = i + layer));
  }
  return outside;
}

const NO_REGIONS: ReadonlyMap<number, string> = new Map();
const NO_BLOCKED: ReadonlyMap<HatchKind, Set<Dir>> = new Map();

/** Per def: the rotated local offset of every structure cell, per rotation. */
const offsetCache = new WeakMap<MultiblockDef, Vec3[][]>();

function rotatedOffsets(def: MultiblockDef): Vec3[][] {
  let out = offsetCache.get(def);
  if (!out) {
    const cells = localCells(def);
    out = ([0, 1, 2, 3] as const).map((r) => cells.map((c) => rotateLocal(def, c.local, r)));
    offsetCache.set(def, out);
  }
  return out;
}

/** Per def: the hatch kinds each legend char allows, as one shared set per char. */
const kindsCache = new WeakMap<MultiblockDef, Map<string, ReadonlySet<HatchKind>>>();

function legendKinds(
  def: MultiblockDef,
  char: string,
  allowed: readonly HatchKind[],
): ReadonlySet<HatchKind> {
  let byChar = kindsCache.get(def);
  if (!byChar) kindsCache.set(def, (byChar = new Map()));
  let set = byChar.get(char);
  if (!set) byChar.set(char, (set = new Set(allowed)));
  return set;
}

/**
 * All hatch-able structure cells with at least one open face, sorted by position, and a lookup of the
 * open cells around an empty cell (`null` for one outside the build's box, which is always open; cells in
 * front of controllers are not open). Works on a dense box of cells; above `FLOOD_LIMIT` cells (only
 * far-apart manual layouts) it falls back to maps, where any face whose neighbour is not a structure cell
 * counts as open and the lookup is unavailable.
 */
function findSites(
  def: MultiblockDef,
  units: readonly Unit[],
): { sites: Site[]; openAround: ((k: CellKey) => (CellKey | null)[]) | null } {
  interface Entry {
    pos: Vec3;
    key: CellKey;
    ids: number[];
    ok: boolean;
    blockId?: string;
    kinds: ReadonlySet<HatchKind>;
    regions: ReadonlyMap<number, string>;
    blocked: ReadonlyMap<HatchKind, Set<Dir>>;
  }
  const cells = localCells(def);
  const offsets = rotatedOffsets(def);
  let lo: [number, number, number] = [Infinity, Infinity, Infinity];
  let hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const u of units) {
    const size = rotatedSize(def, u.rotation);
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], u.origin[a]);
      hi[a] = Math.max(hi[a], u.origin[a] + size[a]);
    }
  }
  const box: Box = {
    ox: lo[0] - 1,
    oy: lo[1] - 1,
    oz: lo[2] - 1,
    nx: hi[0] - lo[0] + 2,
    ny: hi[1] - lo[1] + 2,
    nz: hi[2] - lo[2] + 2,
  };
  const volume = box.nx * box.ny * box.nz;
  const dense = Number.isFinite(volume) && volume <= FLOOD_LIMIT;
  const keyOf = dense ? (p: Vec3): CellKey => boxIndex(box, p) : packCell;

  const byKey = new Map<CellKey, Entry>();
  /** Cells in front of controllers: kept free for the player, so no hatch faces them. */
  const controllerFronts = new Set<CellKey>();
  let ground = Infinity;
  for (const unit of units) {
    const rotated = offsets[unit.rotation];
    const [ux, uy, uz] = unit.origin;
    for (let ci = 0; ci < cells.length; ci++) {
      const cell = cells[ci];
      const off = rotated[ci];
      const pos: Vec3 = [ux + off[0], uy + off[1], uz + off[2]];
      if (pos[1] < ground) ground = pos[1];
      if (cell.role === 'controller') controllerFronts.add(keyOf(step(pos, controllerFacing(def, unit))));
      const k = keyOf(pos);
      const casing = cell.role === 'casing';
      const allowed = casing ? (cell.hatches ?? []) : [];
      let entry = byKey.get(k);
      if (!entry) {
        entry = {
          pos,
          key: k,
          ids: [unit.id],
          ok: casing,
          blockId: cell.blockId,
          kinds: legendKinds(def, cell.char, allowed),
          regions: NO_REGIONS,
          blocked: NO_BLOCKED,
        };
        byKey.set(k, entry);
      } else {
        if (!entry.ids.includes(unit.id)) entry.ids.push(unit.id);
        if (!casing || cell.blockId !== entry.blockId) entry.ok = false;
        if ([...entry.kinds].some((kind) => !allowed.includes(kind)))
          entry.kinds = new Set([...entry.kinds].filter((kind) => allowed.includes(kind)));
      }
      if (!casing) continue;
      const legend = def.legend[cell.char];
      if (legend?.region !== undefined) {
        if (entry.regions === NO_REGIONS) entry.regions = new Map();
        (entry.regions as Map<number, string>).set(unit.id, legend.region);
      }
      if (legend?.disallowFaces) {
        if (entry.blocked === NO_BLOCKED) entry.blocked = new Map();
        const blocked = entry.blocked as Map<HatchKind, Set<Dir>>;
        for (const [kind, dirs] of Object.entries(legend.disallowFaces) as [HatchKind, Dir[]][]) {
          let set = blocked.get(kind);
          if (!set) blocked.set(kind, (set = new Set()));
          for (const d of dirs) set.add(rotateDir(d, unit.rotation));
        }
      }
    }
  }

  // Solid cells, and which empty ones the outside reaches (the build stands on the ground: nothing opens
  // below its lowest layer).
  let solidAt: (p: Vec3, k: CellKey) => boolean;
  let isOutside: (p: Vec3, k: CellKey) => boolean;
  let clearAhead: (p: Vec3, k: CellKey, face: number) => boolean;
  let openAround: ((k: CellKey) => (CellKey | null)[]) | null = null;
  if (dense) {
    const solid = new Uint8Array(volume);
    for (const k of byKey.keys()) solid[k as number] = 1;
    const outside = outsideCells(box, solid, ground);
    const steps = boxSteps(box);
    solidAt = (_p, k) => solid[k as number] === 1;
    isOutside = (p, k) => p[1] >= ground && outside[k as number] === 1;
    openAround = (k) => {
      const i = k as number;
      const x = i % box.nx;
      const z = ((i - x) / box.nx) % box.nz;
      const y = (i - x - z * box.nx) / (box.nx * box.nz);
      const out: (CellKey | null)[] = [];
      for (let face = 0; face < FACE_ORDER.length; face++) {
        const [vx, vy, vz] = step([0, 0, 0], FACE_ORDER[face]);
        const [ax, ay, az] = [x + vx, y + vy, z + vz];
        if (ax < 0 || ay < 0 || az < 0 || ax >= box.nx || ay >= box.ny || az >= box.nz) {
          if (ay + box.oy >= ground) out.push(null);
          continue;
        }
        const n = i + steps[face];
        if (ay + box.oy >= ground && outside[n] === 1 && !controllerFronts.has(n)) out.push(n);
      }
      return out;
    };
    clearAhead = (p, k, face) => {
      const dir = FACE_ORDER[face];
      // Looking down, the ground is as good as a wall.
      if (dir === 'down' && p[1] - (CLEAR_AHEAD - 1) < ground) return false;
      const v = step([0, 0, 0], dir);
      // Cells left inside the box along this direction; beyond it nothing is solid.
      const left =
        v[0] > 0
          ? box.nx - 1 - (p[0] - box.ox)
          : v[0] < 0
            ? p[0] - box.ox
            : v[1] > 0
              ? box.ny - 1 - (p[1] - box.oy)
              : v[1] < 0
                ? p[1] - box.oy
                : v[2] > 0
                  ? box.nz - 1 - (p[2] - box.oz)
                  : p[2] - box.oz;
      const s = steps[face];
      let i = k as number;
      for (let n = 1; n < CLEAR_AHEAD && n <= left; n++) {
        i += s;
        if (solid[i] === 1) return false;
      }
      return true;
    };
  } else {
    solidAt = (_p, k) => byKey.has(k);
    isOutside = (p, k) => p[1] >= ground && !byKey.has(k);
    clearAhead = (p, _k, face) => {
      const dir = FACE_ORDER[face];
      if (dir === 'down' && p[1] - (CLEAR_AHEAD - 1) < ground) return false;
      for (let n = 1, q = p; n < CLEAR_AHEAD; n++) {
        q = step(q, dir);
        if (byKey.has(packCell(q))) return false;
      }
      return true;
    };
  }

  const sites: Site[] = [];
  for (const e of byKey.values()) {
    if (!e.ok || e.kinds.size === 0) continue;
    const faces: Site['faces'] = [];
    for (let order = 0; order < FACE_ORDER.length; order++) {
      const dir = FACE_ORDER[order];
      const front = step(e.pos, dir);
      const fk = keyOf(front);
      if (solidAt(front, fk) || controllerFronts.has(fk) || !isOutside(front, fk)) continue;
      const clear = clearAhead(front, fk, order);
      faces.push({ dir, front: fk, rank: (clear ? 0 : FACE_ORDER.length) + order });
    }
    if (faces.length === 0) continue;
    faces.sort((a, b) => a.rank - b.rank);
    sites.push({
      pos: e.pos,
      key: e.key,
      unitIds: e.ids.length > 1 ? [...e.ids].sort((a, b) => a - b) : e.ids,
      kinds: e.kinds,
      faces,
      regions: e.regions,
      blocked: e.blocked,
    });
  }
  return { sites: sites.sort((a, b) => comparePos(a.pos, b.pos)), openAround };
}

/**
 * UNIT 3 — Hatch placement.
 *
 * Place one hatch of every enabled kind for every unit (respecting `def.requiredHatches` min/max where set):
 * - Only on casing cells whose legend allows that kind, with an exposed outward face
 *   (the neighbouring cell in that direction is not part of any unit).
 * - Prefer cells shared by as many units as possible for kinds in `def.shareableHatches`
 *   (one hatch serves all of them); ties broken deterministically.
 * - One hatch per cell; never on controllers; never on a cell another kind already uses.
 * - Never throws: hatches that cannot be placed go to `unplaced`.
 * Pure and deterministic: same input -> same output, no mutation of arguments.
 *
 * Details:
 * - Kinds are placed in `HATCH_PRIORITY` order. Enabled kinds the def has no hatch block for are ignored.
 * - A face is open when the cell in front of it is empty and connected to the outside of the build
 *   (sealed pockets, air interiors and the ground under the lowest layer do not count), and it is not the
 *   cell in front of a controller. Two hatches of different kinds never face the
 *   same empty cell, so each can get its own pipe.
 * - A cell inside several units is only usable if every one of them has a casing there that allows the
 *   kind (same block id). Such a cell hosts a hatch only for shareable kinds of a `wallshare` def, and
 *   the hatch serves all of those units; otherwise only cells of exactly one unit are used.
 * - A hatch is never placed where it would push a unit above `requiredHatches[kind].max`.
 * - Greedy: repeatedly take the cell serving the most units still below their target; ties prefer fewer
 *   already-served units on the cell, then a face with open space ahead over one into a gap or recess,
 *   then a side face over top over bottom, then the lowest y, z, x.
 * - Unit ids are expected to be unique. The result is independent of the order of `units` and
 *   `enabled`: hatches are listed in placement order, `unplaced` by kind priority then unit id.
 */
export function placeHatches(
  def: MultiblockDef,
  units: readonly Unit[],
  enabled: readonly HatchKind[],
): HatchResult {
  let kinds: HatchKind[] = [];
  try {
    kinds = kindsToPlace(def, enabled);
    if (kinds.length === 0 || units.length === 0) return { hatches: [], unplaced: [] };
    return place(def, units, kinds);
  } catch {
    // Malformed definition (e.g. unknown legend char): nothing can be placed, but never throw.
    return allUnplaced(def, units, kinds);
  }
}

function place(def: MultiblockDef, units: readonly Unit[], kinds: HatchKind[]): HatchResult {
  const { sites, openAround } = findSites(def, units);
  const unitIds = sortedIds(units);
  const shareable = new Set(def.shareableHatches ?? []);
  const used = new Set<CellKey>();
  /** Empty cell in front of a hatch -> kind of that hatch. */
  const fronts = new Map<CellKey, HatchKind>();
  const around = new Map<CellKey, (CellKey | null)[]>();
  const openCells = (k: CellKey): (CellKey | null)[] => {
    let list = around.get(k);
    if (!list) around.set(k, (list = openAround ? openAround(k) : []));
    return list;
  };
  /** Ways out of the empty cell `k` for a pipe of `kind`: open cells beside it not facing another kind. */
  const exits = (k: CellKey, kind: HatchKind): number => {
    let n = 0;
    for (const c of openCells(k)) if (c === null || (fronts.get(c) ?? kind) === kind) n++;
    return n;
  };
  /**
   * Whether a hatch of `kind` facing the empty cell `k` would be walled in: `k` has no way out for its pipe,
   * or `k` is the last way out of the cell in front of a neighbouring hatch of another kind.
   */
  const walledIn = (k: CellKey, kind: HatchKind): boolean => {
    if (!openAround) return false;
    if (exits(k, kind) === 0) return true;
    for (const c of openCells(k)) {
      if (c === null) continue;
      const other = fronts.get(c);
      if (other !== undefined && other !== kind && exits(c, other) === 1) return true;
    }
    return false;
  };
  const hatches: HatchPlacement[] = [];
  const unplaced: HatchResult['unplaced'] = [];

  for (const kind of kinds) {
    const { target, max } = quota(def, kind);
    if (target <= 0) continue;
    const canShare = def.wallshare && shareable.has(kind);
    const candidates = sites.filter(
      (s) => s.kinds.has(kind) && !used.has(s.key) && (canShare || s.unitIds.length === 1),
    );
    const count = new Map<number, number>(unitIds.map((id) => [id, 0]));

    /**
     * One greedy pass: place hatches of `kind` on the best candidates until no unit on any free
     * candidate still `needs` one there. Every unit on a chosen cell is served (`count` + 1).
     */
    const pass = (needs: (site: Site, unitId: number) => boolean, served: (site: Site) => void): void => {
      /** Current score of candidate `i`, or null when it cannot take this kind any more. */
      const evaluate = (i: number): Entry | null => {
        const c = candidates[i];
        if (used.has(c.key)) return null;
        let score = 0;
        for (const id of c.unitIds) {
          if ((count.get(id) ?? 0) >= max) return null;
          if (needs(c, id)) score++;
        }
        if (score === 0) return null;
        const blocked = c.blocked.get(kind);
        // The best open face, preferring one whose pipe keeps a way out (and leaves one to its neighbours).
        let face = -1;
        let walled = 1;
        for (let fi = 0; fi < c.faces.length; fi++) {
          const f = c.faces[fi];
          if ((fronts.get(f.front) ?? kind) !== kind || blocked?.has(f.dir)) continue;
          if (face < 0) face = fi;
          if (!walledIn(f.front, kind)) {
            face = fi;
            walled = 0;
            break;
          }
        }
        if (face < 0) return null;
        return { i, score, waste: c.unitIds.length - score, walled, face, faceRank: c.faces[face].rank };
      };

      // Greedy pick of the best candidate, via a lazy max-heap. A candidate's rank only ever gets worse
      // (counts grow, so score falls and waste rises; this kind's own fronts never close its faces), so
      // a popped entry whose re-evaluated rank is unchanged beats every other candidate's current rank.
      const heap = new EntryHeap();
      for (let i = 0; i < candidates.length; i++) {
        const e = evaluate(i);
        if (e) heap.push(e);
      }
      for (;;) {
        const top = heap.pop();
        if (!top) break;
        const now = evaluate(top.i);
        if (!now) continue;
        if (compareEntries(now, top) !== 0) {
          heap.push(now);
          continue;
        }
        const best = candidates[now.i];
        const bestFace = best.faces[now.face];
        used.add(best.key);
        fronts.set(bestFace.front, kind);
        for (const id of best.unitIds) count.set(id, (count.get(id) ?? 0) + 1);
        served(best);
        hatches.push({ kind, cell: best.pos, face: bestFace.dir, unitIds: [...best.unitIds] });
      }
    };

    // Regions that each need one hatch of this kind come first (e.g. every Distillation Tower layer),
    // then the remaining count up to the target anywhere allowed.
    const regions = def.requiredHatches?.[kind]?.regions ?? [];
    const missing = new Map<number, number>(unitIds.map((id) => [id, 0]));
    for (const region of regions) {
      const done = new Set<number>();
      pass(
        (site, id) => site.regions.get(id) === region && !done.has(id),
        (site) => {
          for (const id of site.unitIds) if (site.regions.get(id) === region) done.add(id);
        },
      );
      for (const id of unitIds) if (!done.has(id)) missing.set(id, (missing.get(id) ?? 0) + 1);
    }
    pass(
      (_, id) => (count.get(id) ?? 0) < target,
      () => {},
    );

    for (const id of unitIds) {
      const short = Math.max(target - (count.get(id) ?? 0), missing.get(id) ?? 0);
      for (let n = 0; n < short; n++) unplaced.push({ unitId: id, kind });
    }
  }

  return { hatches, unplaced };
}
