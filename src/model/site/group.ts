import { isSingleBlock } from '../../data/generic';
import { rotateDir, rotatedSize, step, unitCells } from '../geometry';
import { layoutCandidates, packUnits } from '../layout/packer';
import { resolveLayout } from '../plan';
import { placeHatches } from '../hatches/placement';
import type {
  Dir,
  HatchKind,
  HatchPlacement,
  HatchResult,
  MultiblockDef,
  PackResult,
  PlanLimits,
  Rotation,
  Unit,
  Vec3,
  WallStats,
} from '../types';
import { computeWallStats } from '../walls';

/** Hatch kinds that carry a link's resource into or out of a group. */
export const IN_KINDS: readonly HatchKind[] = ['itemIn', 'fluidIn', 'steamIn', 'energy'];
export const OUT_KINDS: readonly HatchKind[] = ['itemOut', 'fluidOut', 'dynamo'];
/** Kinds only links place (a site group never enables them by hand). */
export const IO_KINDS: readonly HatchKind[] = ['itemIn', 'itemOut', 'fluidIn', 'fluidOut', 'steamIn'];

/** A hatch of a site group, with the resource it carries. */
export interface SiteHatch extends HatchPlacement {
  resource?: string;
  /** Sides it may never face (GT `disallowFaces`, e.g. Distillation Tower layer outputs never face up). */
  blocked?: Dir[];
  /** Net id once the site has been routed. */
  net?: number;
}

/** Per hatch kind, the side (in the group's own frame) its pipes leave by: to a port or another group. */
export type Toward = Partial<Record<HatchKind, Dir>>;

/** How far out on its side a `Toward` direction points: far enough to act as a direction, not a spot. */
const TOWARD_REACH = 1000;

/**
 * `PlaceOptions.toward` points for a group's units: far out from the middle of their box on each kind's
 * side, at ground level (ports and most pipes are there).
 */
function towardPoints(
  def: MultiblockDef,
  units: readonly Unit[],
  toward: Toward,
): Partial<Record<HatchKind, Vec3>> {
  const out: Partial<Record<HatchKind, Vec3>> = {};
  const entries = Object.entries(toward) as [HatchKind, Dir][];
  if (entries.length === 0 || units.length === 0) return out;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const u of units) {
    const sz = rotatedSize(def, u.rotation);
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], u.origin[i]);
      hi[i] = Math.max(hi[i], u.origin[i] + sz[i]);
    }
  }
  for (const [kind, dir] of entries) {
    const v = step([0, 0, 0], dir);
    out[kind] = [(lo[0] + hi[0]) / 2 + v[0] * TOWARD_REACH, lo[1], (lo[2] + hi[2]) / 2 + v[2] * TOWARD_REACH];
  }
  return out;
}

/** Resources a group must take or give per hatch kind, in a stable order. */
export type Demand = Partial<Record<HatchKind, string[]>>;

export interface GroupBuild {
  /** The def the group was built with (sized, with hatch counts raised to the demand). */
  def: MultiblockDef;
  /** Units and hatches in group-local coordinates, normalised so the min corner is (0, 0, 0). */
  units: Unit[];
  hatches: SiteHatch[];
  /** Local bounding box size. */
  size: Vec3;
  pack: PackResult;
  loosened: boolean;
  unplaced: HatchResult['unplaced'];
  stats: WallStats;
  /** A unit that ended up without a hatch for one of the resources it needs. */
  missing: { kind: HatchKind; resource: string; unitId: number }[];
}

const demandDefs = new WeakMap<MultiblockDef, Map<string, MultiblockDef>>();

/**
 * `def` with `requiredHatches[kind].min` raised to the number of resources of that kind, so the hatch
 * placer puts one hatch per resource on every unit. Memoised per (def, demand) so the packer's per-def
 * caches stay warm.
 */
export function withDemand(def: MultiblockDef, demand: Demand): MultiblockDef {
  const counts = Object.entries(demand)
    .filter(([, list]) => list && list.length > 0)
    .map(([k, list]) => [k as HatchKind, list!.length] as const)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  if (counts.length === 0) return def;
  const k = JSON.stringify(counts);
  let byKey = demandDefs.get(def);
  if (!byKey) demandDefs.set(def, (byKey = new Map()));
  let out = byKey.get(k);
  if (!out) {
    const req = { ...def.requiredHatches };
    for (const [kind, n] of counts) {
      const r = req[kind];
      req[kind] = { ...r, min: Math.max(r?.min ?? 0, n) };
    }
    out = { ...def, requiredHatches: req };
    byKey.set(k, out);
  }
  return out;
}

/**
 * Give each hatch of `kind` one of `resources`, so that every unit gets each resource once where it can:
 * each hatch takes the resource the most of its (still unserved) units need, lowest index on ties.
 */
function assign(hatches: SiteHatch[], kind: HatchKind, resources: string[], unitIds: number[]): SiteHatch[] {
  const need = new Map(unitIds.map((id) => [id, new Set(resources)]));
  const uses = new Map(resources.map((r) => [r, 0]));
  return hatches.map((h) => {
    if (h.kind !== kind || resources.length === 0) return h;
    let best = resources[0];
    let bestScore = -1;
    for (const r of resources) {
      let score = 0;
      for (const id of h.unitIds) if (need.get(id)?.has(r)) score++;
      // Nobody needs anything here any more: spread the spare hatches over the resources.
      const tie = score === bestScore && score === 0 && (uses.get(r) ?? 0) < (uses.get(best) ?? 0);
      if (score > bestScore || tie) {
        best = r;
        bestScore = score;
      }
    }
    for (const id of h.unitIds) need.get(id)?.delete(best);
    uses.set(best, (uses.get(best) ?? 0) + 1);
    return { ...h, resource: best };
  });
}

/** GT single-block machines: a grid with one free block between them, so each keeps open faces for IO. */
function singleBlockLayout(count: number, limits: PlanLimits): Unit[] {
  const perRow = Math.max(1, Math.min(limits.x ?? Math.ceil(Math.sqrt(count)), count));
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    origin: [(i % perRow) * 2, 0, Math.floor(i / perRow) * 3] as Vec3,
    rotation: 0 as Rotation,
  }));
}

/** Faces a single-block machine offers for IO, in order (its front, north, stays free for the player). */
const SINGLE_FACES: readonly Dir[] = ['south', 'east', 'west', 'up'];

/** Local disallowed faces of the hatch cell (from the legend of the unit that holds it). */
function blockedFaces(def: MultiblockDef, units: Unit[], h: HatchPlacement): Dir[] | undefined {
  const unit = units.find((u) => u.id === h.unitIds[0]);
  if (!unit) return undefined;
  const cell = unitCells(def, unit).find(
    (c) => c.pos[0] === h.cell[0] && c.pos[1] === h.cell[1] && c.pos[2] === h.cell[2],
  );
  const dirs = cell?.role === 'casing' ? def.legend[cell.char]?.disallowFaces?.[h.kind] : undefined;
  return dirs?.map((d) => rotateDir(d, unit.rotation));
}

/**
 * Pack one group and place its hatches, in group-local coordinates. `demand` lists the resources per hatch
 * kind; `base` the other hatch kinds to place (energy, maintenance, muffler, ...).
 */
export function buildGroup(
  raw: MultiblockDef,
  count: number,
  limits: PlanLimits,
  base: readonly HatchKind[],
  demand: Demand,
  below = false,
  toward: Toward = {},
): GroupBuild {
  if (isSingleBlock(raw)) return buildSingleBlocks(raw, count, limits, demand);
  const def = withDemand(raw, demand);
  const enabled = [...new Set([...base, ...(Object.keys(demand) as HatchKind[])])].filter(
    (k) => def.hatchBlocks[k] !== undefined && (!IO_KINDS.includes(k) || (demand[k]?.length ?? 0) > 0),
  );
  const packed = packUnits(def, count, limits);
  const targets = towardPoints(def, packed.units, toward);
  // With `below`, hatches may face down from the lowest layer (see `PlaceOptions`); with `toward`, each
  // kind's hatches lean to the side its pipes leave by.
  const place: typeof placeHatches = (d, u, e, a) => placeHatches(d, u, e, a, { below, toward: targets });
  const resolved = resolveLayout(def, packed, enabled, limits, { placeHatches: place, layoutCandidates });
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const u of resolved.pack.units) {
    const s = rotatedSize(def, u.rotation);
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], u.origin[i]);
      hi[i] = Math.max(hi[i], u.origin[i] + s[i]);
    }
  }
  if (resolved.pack.units.length === 0) {
    lo.fill(0);
    hi.fill(0);
  }
  const shift = (p: Vec3): Vec3 => [p[0] - lo[0], p[1] - lo[1], p[2] - lo[2]];
  const units = resolved.pack.units.map((u) => ({ ...u, origin: shift(u.origin) }));
  let hatches: SiteHatch[] = resolved.hatches.hatches.map((h) => {
    const out: SiteHatch = { ...h, cell: shift(h.cell) };
    const blocked = blockedFaces(def, resolved.pack.units, h);
    if (blocked?.length) out.blocked = blocked;
    return out;
  });
  const unitIds = units.map((u) => u.id);
  const missing: GroupBuild['missing'] = [];
  for (const [kind, list] of Object.entries(demand) as [HatchKind, string[]][]) {
    if (!list?.length) continue;
    hatches = assign(hatches, kind, list, unitIds);
    for (const id of unitIds)
      for (const r of list)
        if (!hatches.some((h) => h.kind === kind && h.resource === r && h.unitIds.includes(id)))
          missing.push({ kind, resource: r, unitId: id });
  }
  return {
    def,
    units,
    hatches,
    size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
    pack: resolved.pack,
    loosened: resolved.loosened,
    unplaced: resolved.hatches.unplaced,
    stats: computeWallStats(def, units, hatches),
    missing,
  };
}

function buildSingleBlocks(
  def: MultiblockDef,
  count: number,
  limits: PlanLimits,
  demand: Demand,
): GroupBuild {
  const units = singleBlockLayout(count, limits);
  const flows = Object.entries(demand).flatMap(([kind, list]) =>
    (list ?? []).map((r) => [kind as HatchKind, r] as const),
  );
  const hatches: SiteHatch[] = [];
  const missing: GroupBuild['missing'] = [];
  for (const u of units)
    flows.forEach(([kind, resource], i) => {
      // More flows than faces: the extras share the top face (a pipe may still come in from any side).
      hatches.push({
        kind,
        resource,
        cell: u.origin,
        face: SINGLE_FACES[Math.min(i, SINGLE_FACES.length - 1)],
        unitIds: [u.id],
      });
    });
  const size: Vec3 = units.length
    ? [Math.max(...units.map((u) => u.origin[0])) + 1, 1, Math.max(...units.map((u) => u.origin[2])) + 1]
    : [0, 0, 0];
  const stats: WallStats = {
    totalBlocks: units.length,
    byBlock: { [def.controller.blockId]: units.length },
    controllers: units.length,
    hatches: 0,
    sharedWalls: [],
    conflicts: [],
    conflictCells: [],
    savedBlocks: 0,
  };
  return {
    def,
    units,
    hatches,
    size,
    pack: { units, requested: count, placed: units.length },
    loosened: false,
    unplaced: [],
    stats,
    missing,
  };
}

/** Place a local point of a group of local size `size` on the site: turn it `r` times, then move it. */
export function groupPoint(p: Vec3, size: Vec3, r: Rotation, origin: [number, number]): Vec3 {
  let [x, y, z] = p;
  let sx = size[0];
  let sz = size[2];
  for (let i = 0; i < r; i++) {
    const nx = sz - 1 - z;
    z = x;
    x = nx;
    [sx, sz] = [sz, sx];
  }
  return [x + origin[0], y, z + origin[1]];
}

/** Size of the group's bounding box after rotation. */
export function rotatedGroupSize(size: Vec3, r: Rotation): Vec3 {
  return r % 2 === 0 ? size : [size[2], size[1], size[0]];
}

/** A unit of a group, placed on the site (see `groupPoint`). */
export function placeUnit(
  def: MultiblockDef,
  u: Unit,
  size: Vec3,
  r: Rotation,
  origin: [number, number],
): Unit {
  const s = rotatedSize(def, u.rotation);
  const a = groupPoint(u.origin, size, r, origin);
  const b = groupPoint([u.origin[0] + s[0] - 1, u.origin[1], u.origin[2] + s[2] - 1], size, r, origin);
  return {
    id: u.id,
    origin: [Math.min(a[0], b[0]), u.origin[1], Math.min(a[2], b[2])],
    rotation: ((u.rotation + r) % 4) as Rotation,
  };
}

export function placeHatch(h: SiteHatch, size: Vec3, r: Rotation, origin: [number, number]): SiteHatch {
  const out: SiteHatch = { ...h, cell: groupPoint(h.cell, size, r, origin), face: rotateDir(h.face, r) };
  if (h.blocked) out.blocked = h.blocked.map((d) => rotateDir(d, r));
  return out;
}
