import { controllerFacing, localCells, packCell, rotateDir, step, toWorld, type CellKey } from './geometry';
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
  kinds: Set<HatchKind>;
  /**
   * Open faces, best first, with the key of the empty cell in front of each. `rank` orders them: faces
   * with open space ahead (see `CLEAR_AHEAD`) before faces into a gap or recess, then `FACE_ORDER`.
   */
  faces: { dir: Dir; front: CellKey; rank: number }[];
  /** Per containing unit, the legend region of this cell (see `LegendEntry.region`). */
  regions: Map<number, string>;
  /** World-frame sides a hatch of a kind must not face here (`LegendEntry.disallowFaces`, any unit). */
  blocked: Map<HatchKind, Set<Dir>>;
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
  /** Index of the open face used, into the site's `faces`. */
  face: number;
  /** That face's position in `FACE_ORDER` (sides before top before bottom). */
  faceRank: number;
}

/** Negative when `a` is the better pick: higher score, then less waste, then a better face, then lower cell. */
function compareEntries(a: Entry, b: Entry): number {
  return b.score - a.score || a.waste - b.waste || a.faceRank - b.faceRank || a.i - b.i;
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

/**
 * Returns a predicate telling whether an empty cell is reachable from outside the build (not a
 * sealed pocket, not underground). Flood-fills the empty cells of the bounding box grown by one block;
 * everything below `ground` (the lowest structure layer) is solid ground.
 */
function outsideTest(solid: ReadonlyMap<CellKey, Vec3>, ground: number): (p: Vec3) => boolean {
  const notSolid = (p: Vec3): boolean => p[1] >= ground && !solid.has(packCell(p));
  let min: [number, number, number] = [Infinity, Infinity, Infinity];
  let max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of solid.values()) {
    min = [Math.min(min[0], p[0]), Math.min(min[1], p[1]), Math.min(min[2], p[2])];
    max = [Math.max(max[0], p[0]), Math.max(max[1], p[1]), Math.max(max[2], p[2])];
  }
  const ox = min[0] - 1;
  const oy = min[1] - 1;
  const oz = min[2] - 1;
  const nx = max[0] - min[0] + 3;
  const ny = max[1] - min[1] + 3;
  const nz = max[2] - min[2] + 3;
  const volume = nx * ny * nz;
  if (!Number.isFinite(volume) || volume > FLOOD_LIMIT) return notSolid;

  const idx = (x: number, y: number, z: number): number => (y * nz + z) * nx + x;
  const blocked = new Uint8Array(volume);
  for (const p of solid.values()) blocked[idx(p[0] - ox, p[1] - oy, p[2] - oz)] = 1;
  // The padding layer under the build is ground.
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) blocked[idx(x, 0, z)] = 1;
  const outside = new Uint8Array(volume);
  const queue = new Int32Array(volume);
  let head = 0;
  let tail = 0;
  const start = idx(0, 1, 0); // padded corner at ground level, never solid
  outside[start] = 1;
  queue[tail++] = start;
  while (head < tail) {
    const i = queue[head++];
    const x = i % nx;
    const z = Math.floor(i / nx) % nz;
    const y = Math.floor(i / (nx * nz));
    const visit = (j: number): void => {
      if (!blocked[j] && !outside[j]) {
        outside[j] = 1;
        queue[tail++] = j;
      }
    };
    if (x > 0) visit(i - 1);
    if (x < nx - 1) visit(i + 1);
    if (z > 0) visit(i - nx);
    if (z < nz - 1) visit(i + nx);
    if (y > 0) visit(i - nx * nz);
    if (y < ny - 1) visit(i + nx * nz);
  }
  return (p: Vec3): boolean => {
    const x = p[0] - ox;
    const y = p[1] - oy;
    const z = p[2] - oz;
    if (p[1] < ground) return false;
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return true;
    return outside[idx(x, y, z)] === 1;
  };
}

/** All hatch-able structure cells with at least one open face, sorted by position. */
function findSites(def: MultiblockDef, units: readonly Unit[]): Site[] {
  const byKey = new Map<
    CellKey,
    {
      pos: Vec3;
      ids: number[];
      ok: boolean;
      blockId?: string;
      kinds: Set<HatchKind>;
      regions: Map<number, string>;
      blocked: Map<HatchKind, Set<Dir>>;
    }
  >();
  const cells = localCells(def);
  /** Cells in front of controllers: kept free for the player, so no hatch faces them. */
  const controllerFronts = new Set<CellKey>();
  for (const unit of units) {
    for (const cell of cells) {
      const pos = toWorld(def, unit, cell.local);
      if (cell.role === 'controller') controllerFronts.add(packCell(step(pos, controllerFacing(def, unit))));
      const k = packCell(pos);
      const allowed = cell.role === 'casing' ? (cell.hatches ?? []) : [];
      let entry = byKey.get(k);
      if (!entry) {
        entry = {
          pos,
          ids: [unit.id],
          ok: cell.role === 'casing',
          blockId: cell.blockId,
          kinds: new Set(allowed),
          regions: new Map(),
          blocked: new Map(),
        };
        byKey.set(k, entry);
      } else {
        if (!entry.ids.includes(unit.id)) entry.ids.push(unit.id);
        if (cell.role !== 'casing' || cell.blockId !== entry.blockId) entry.ok = false;
        for (const kind of [...entry.kinds]) if (!allowed.includes(kind)) entry.kinds.delete(kind);
      }
      const legend = cell.role === 'casing' ? def.legend[cell.char] : undefined;
      if (legend?.region !== undefined) entry.regions.set(unit.id, legend.region);
      for (const [kind, dirs] of Object.entries(legend?.disallowFaces ?? {}) as [HatchKind, Dir[]][]) {
        let set = entry.blocked.get(kind);
        if (!set) entry.blocked.set(kind, (set = new Set()));
        for (const d of dirs) set.add(rotateDir(d, unit.rotation));
      }
    }
  }

  const solid = new Map<CellKey, Vec3>();
  let ground = Infinity;
  for (const [k, e] of byKey) {
    solid.set(k, e.pos);
    ground = Math.min(ground, e.pos[1]);
  }
  // The build stands on the ground: nothing opens below its lowest layer.
  const isOutside = outsideTest(solid, ground);

  const sites: Site[] = [];
  for (const [k, e] of byKey) {
    if (!e.ok || e.kinds.size === 0) continue;
    const faces: Site['faces'] = [];
    FACE_ORDER.forEach((dir, order) => {
      const front = step(e.pos, dir);
      const fk = packCell(front);
      if (solid.has(fk) || controllerFronts.has(fk) || !isOutside(front)) return;
      let clear = true;
      for (let n = 1, p = front; n < CLEAR_AHEAD && clear; n++) {
        p = step(p, dir);
        if (solid.has(packCell(p))) clear = false;
      }
      faces.push({ dir, front: fk, rank: (clear ? 0 : FACE_ORDER.length) + order });
    });
    if (faces.length === 0) continue;
    faces.sort((a, b) => a.rank - b.rank);
    sites.push({
      pos: e.pos,
      key: k,
      unitIds: [...e.ids].sort((a, b) => a - b),
      kinds: e.kinds,
      faces,
      regions: e.regions,
      blocked: e.blocked,
    });
  }
  return sites.sort((a, b) => comparePos(a.pos, b.pos));
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
  const sites = findSites(def, units);
  const unitIds = sortedIds(units);
  const shareable = new Set(def.shareableHatches ?? []);
  const used = new Set<CellKey>();
  /** Empty cell in front of a hatch -> kind of that hatch. */
  const fronts = new Map<CellKey, HatchKind>();
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
        const face = c.faces.findIndex((f) => (fronts.get(f.front) ?? kind) === kind && !blocked?.has(f.dir));
        if (face < 0) return null;
        return { i, score, waste: c.unitIds.length - score, face, faceRank: c.faces[face].rank };
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
