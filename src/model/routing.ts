import { controllerFacing, rotateDir, step, unitCells } from './geometry';
import type { Dir, HatchKind, HatchPlacement, MultiblockDef, RouteNet, Unit, Vec3 } from './types';

/** Hatch kinds that get pipe/conveyor networks. */
export const ROUTED_KINDS = ['itemIn', 'itemOut', 'fluidIn', 'fluidOut'] as const;

type RoutedKind = (typeof ROUTED_KINDS)[number];

/** Search margin around the structures and terminals, in blocks. */
const MARGIN = 4;

/**
 * Largest search grid (cells) routing will allocate, about 60 MB of scratch memory. Only far-apart manual
 * layouts from links or files reach it; above it nothing is routed and every terminal reports unconnected.
 */
export const MAX_GRID_CELLS = 4_000_000;

/** `occ` values: free, solid (structure or grid border); pipe of kind k is `PIPE + k`. */
const FREE = 0;
const SOLID = 1;
const PIPE = 2;

/** A dense voxel grid over the search box plus a 1-cell solid border, so the BFS needs no bounds checks. */
interface Grid {
  /** World coords of index 0. */
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
  occ: Uint8Array;
  /** Bitmask of routed kinds (bit = index in ROUTED_KINDS) whose terminal sits in this cell. */
  termMask: Uint8Array;
  /** Lowest y index above the ground (and the solid border). */
  floor: number;
  /** Neighbour index offsets, in `DIRS`-like order. */
  offsets: Int32Array;
}

function isRouted(kind: HatchKind): kind is RoutedKind {
  return (ROUTED_KINDS as readonly HatchKind[]).includes(kind);
}

function indexOf(g: Grid, p: Vec3): number {
  return p[0] - g.ox + g.dx * (p[1] - g.oy + g.dy * (p[2] - g.oz));
}

function posOf(g: Grid, i: number): Vec3 {
  const x = i % g.dx;
  const rest = (i - x) / g.dx;
  const y = rest % g.dy;
  const z = (rest - y) / g.dy;
  return [x + g.ox, y + g.oy, z + g.oz];
}

/** Grid for the search box, or null when it would exceed `MAX_GRID_CELLS`. */
function buildGrid(solids: Vec3[], terminals: Vec3[], ground: number): Grid | null {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const list of [solids, terminals])
    for (const p of list) {
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[2] < minZ) minZ = p[2];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
      if (p[2] > maxZ) maxZ = p[2];
    }
  // Search box = bounds grown by MARGIN; plus one border cell on each side that is always solid.
  const pad = MARGIN + 1;
  const ox = minX - pad;
  const oy = minY - pad;
  const oz = minZ - pad;
  const dx = maxX - minX + 1 + 2 * pad;
  const dy = maxY - minY + 1 + 2 * pad;
  const dz = maxZ - minZ + 1 + 2 * pad;
  if (dx * dy * dz > MAX_GRID_CELLS) return null;
  const occ = new Uint8Array(dx * dy * dz);
  const termMask = new Uint8Array(dx * dy * dz);
  const g: Grid = {
    ox,
    oy,
    oz,
    dx,
    dy,
    dz,
    occ,
    termMask,
    floor: Math.max(1, Math.min(dy - 2, ground - oy)),
    offsets: Int32Array.from([-dx * dy, dx * dy, 1, -1, dx, -dx]),
  };
  for (let z = 0; z < dz; z++)
    for (let y = 0; y < dy; y++)
      for (let x = 0; x < dx; x++)
        if (x === 0 || y === 0 || z === 0 || x === dx - 1 || y === dy - 1 || z === dz - 1)
          occ[x + dx * (y + dy * z)] = SOLID;
  for (const p of solids) occ[indexOf(g, p)] = SOLID;
  // Everything below the build's lowest layer is ground: pipes stay above it.
  for (let z = 0; z < dz; z++)
    for (let y = 0; y < Math.min(dy, ground - oy); y++)
      for (let x = 0; x < dx; x++) occ[x + dx * (y + dy * z)] = SOLID;
  return g;
}

interface Scratch {
  queue: Int32Array;
  parent: Int32Array;
  /** Visit stamp per cell; a cell is visited in the current search when `seen[i] === stamp`. */
  seen: Uint32Array;
  stamp: number;
}

/**
 * Multi-source BFS from every pipe of `kind` to the nearest cell with `target[i] === 1`.
 * Returns the reached target index (parents filled in `s.parent`) or -1.
 */
function searchNearest(g: Grid, s: Scratch, net: number[], target: Uint8Array, k: number): number {
  const { occ, termMask, offsets } = g;
  const { queue, parent, seen } = s;
  const stamp = ++s.stamp;
  const own = PIPE + k;
  const bit = 1 << k;
  let head = 0;
  let tail = 0;
  for (const i of net) {
    seen[i] = stamp;
    parent[i] = -1;
    queue[tail++] = i;
  }
  while (head < tail) {
    const cur = queue[head++];
    for (let d = 0; d < 6; d++) {
      const n = cur + offsets[d];
      if (seen[n] === stamp) continue;
      const o = occ[n];
      if (o !== FREE && o !== own) continue;
      const m = termMask[n];
      if (m !== 0 && (m & bit) === 0) continue; // another kind's terminal
      seen[n] = stamp;
      parent[n] = cur;
      if (target[n] !== 0) return n;
      queue[tail++] = n;
    }
  }
  return -1;
}

/** Arrival directions 0..5 (index into `Grid.offsets`) plus "no direction" for network cells. */
const NO_DIR = 6;
const STATES = 7;

/** Default extra cost of a pipe bend, in blocks: straighter runs for the same or fewer pipe blocks. */
export const DEFAULT_TURN_COST = 2;

/** Above this many (cell, direction) states the turn-aware search falls back to plain BFS (~96 MB). */
const MAX_TURN_STATES = 8_000_000;

/**
 * Terminals worth trying in the turn-aware search. A plain BFS from the network finds the nearest
 * terminal by steps; that BFS path, with its bends priced in, is a real connection of cost `bound`. Any
 * terminal more than `bound` steps away costs more than that, so only terminals within `bound` steps
 * (usually one to three) can win. Returns them in BFS order (empty when none is reachable).
 */
function candidatesWithin(
  g: Grid,
  s: Scratch,
  net: readonly number[],
  target: Uint8Array,
  k: number,
  turnCost: number,
): number[] {
  const { occ, termMask, offsets } = g;
  const { queue, parent, seen } = s;
  const stamp = ++s.stamp;
  const own = PIPE + k;
  const bit = 1 << k;
  let head = 0;
  let tail = 0;
  for (const i of net) {
    seen[i] = stamp;
    parent[i] = -1;
    queue[tail++] = i;
  }
  const found: number[] = [];
  let bound = Infinity;
  for (let depth = 1; head < tail && depth <= bound; depth++) {
    const end = tail;
    while (head < end) {
      const cur = queue[head++];
      for (let d = 0; d < 6; d++) {
        const n = cur + offsets[d];
        if (seen[n] === stamp) continue;
        const o = occ[n];
        if (o !== FREE && o !== own) continue;
        const m = termMask[n];
        if (m !== 0 && (m & bit) === 0) continue; // another kind's terminal
        seen[n] = stamp;
        parent[n] = cur;
        queue[tail++] = n;
        if (target[n] === 0) continue;
        found.push(n);
        if (bound === Infinity) bound = depth + turnCost * bendsTo(parent, n);
      }
    }
  }
  return found;
}

/** Direction changes along the BFS parent chain ending at `cell`. */
function bendsTo(parent: Int32Array, cell: number): number {
  let bends = 0;
  let prevStep = 0;
  for (let i = cell; parent[i] !== -1; i = parent[i]) {
    const step = i - parent[i];
    if (prevStep !== 0 && step !== prevStep) bends++;
    prevStep = step;
  }
  return bends;
}

/** Scratch buffers of the turn-aware search, one entry per (cell, arrival direction) state. */
interface TurnScratch {
  dist: Int32Array;
  parent: Int32Array;
  /** Visit stamp per state; a state is live in the current search when `seen[st] === stamp`. */
  seen: Uint32Array;
  stamp: number;
  turnCost: number;
}

/**
 * Cheapest connection from any remaining terminal to the network, where a step costs 1 and a bend
 * `turnCost` more: Dijkstra over (cell, arrival direction) states with a bucket queue (Dial's algorithm;
 * costs are small integers). It runs from the terminals towards the network, because there are far
 * fewer terminals than network cells and the cost of a path is the same in both directions. Returns the
 * state at which the network was reached (its parent chain in `t.parent` leads to the terminal), or -1.
 */
function searchFromTerminals(
  g: Grid,
  t: TurnScratch,
  terms: readonly number[],
  target: Uint8Array,
  inNet: Uint8Array,
  k: number,
): number {
  const { occ, termMask, offsets } = g;
  const { dist, parent, seen, turnCost } = t;
  const stamp = ++t.stamp;
  const own = PIPE + k;
  const bit = 1 << k;
  // A step costs 1..1 + turnCost, so the costs in flight span fewer than B buckets.
  const B = turnCost + 2;
  const buckets: number[][] = Array.from({ length: B }, () => []);
  let pending = 0;
  for (const i of terms) {
    if (target[i] === 0) continue;
    const st = i * STATES + NO_DIR;
    seen[st] = stamp;
    dist[st] = 0;
    parent[st] = -1;
    buckets[0].push(st);
    pending++;
  }
  for (let cost = 0; pending > 0; cost++) {
    const bucket = buckets[cost % B];
    for (let q = 0; q < bucket.length; q++) {
      const st = bucket[q];
      pending--;
      if (dist[st] !== cost) continue; // superseded by a cheaper arrival
      const cell = (st / STATES) | 0;
      if (inNet[cell] === 1) return st;
      const dir = st - cell * STATES;
      for (let d = 0; d < 6; d++) {
        const n = cell + offsets[d];
        const o = occ[n];
        if (o !== FREE && o !== own) continue;
        const m = termMask[n];
        if (m !== 0 && (m & bit) === 0) continue; // another kind's terminal
        const nc = cost + 1 + (dir !== NO_DIR && dir !== d ? turnCost : 0);
        const ns = n * STATES + d;
        if (seen[ns] === stamp && dist[ns] <= nc) continue;
        seen[ns] = stamp;
        dist[ns] = nc;
        parent[ns] = st;
        buckets[nc % B].push(ns);
        pending++;
      }
    }
    bucket.length = 0;
  }
  return -1;
}

/** One hatch to connect: the free cells beside it where a pipe may attach, its placed face's cell first. */
interface Terminal {
  hatch: Vec3;
  cells: number[];
}

interface Growth {
  /** Pipe cells in insertion order. */
  net: number[];
  /** Paths as grid indices, each from an existing pipe (or the seed) to a newly connected terminal. */
  paths: number[][];
  connected: number;
  /** Per terminal: the pipe cell it attaches to, or -1 when not connected. */
  via: Int32Array;
}

/**
 * Grow one network from `seed` (a terminal cell), connecting the nearest remaining terminal until none is
 * reachable. A terminal is connected as soon as the network passes through any of its cells. With
 * `turns`, "nearest" means cheapest counting each bend as `turnCost` extra blocks.
 */
function grow(
  g: Grid,
  s: Scratch,
  terms: readonly Terminal[],
  seed: number,
  k: number,
  turns: TurnScratch | null,
): Growth {
  // target[cell] = how many unconnected terminals may attach at that cell.
  const target = new Uint8Array(g.occ.length);
  const at = new Map<number, number[]>();
  terms.forEach((t, ti) => {
    for (const c of t.cells) {
      let list = at.get(c);
      if (!list) at.set(c, (list = []));
      list.push(ti);
      target[c]++;
    }
  });
  const via = new Int32Array(terms.length).fill(-1);
  let connected = 0;
  let remaining = terms.length;
  const reach = (cell: number): void => {
    for (const ti of at.get(cell) ?? []) {
      if (via[ti] !== -1) continue;
      via[ti] = cell;
      connected++;
      remaining--;
      for (const c of terms[ti].cells) target[c]--;
    }
  };

  const inNet = new Set<number>([seed]);
  const net = [seed];
  const paths: number[][] = [];
  const netMark = turns ? new Uint8Array(g.occ.length) : null;
  if (netMark) netMark[seed] = 1;
  reach(seed);
  while (remaining > 0) {
    const path: number[] = [];
    if (turns && netMark) {
      const candidates = candidatesWithin(g, s, net, target, k, turns.turnCost);
      const hit = candidates.length ? searchFromTerminals(g, turns, candidates, target, netMark, k) : -1;
      if (hit < 0) break;
      // The chain runs network -> terminal already.
      for (let st = hit; st !== -1; st = turns.parent[st]) path.push((st / STATES) | 0);
    } else {
      const hit = searchNearest(g, s, net, target, k);
      if (hit < 0) break;
      for (let i = hit; i !== -1; i = s.parent[i]) path.push(i);
      path.reverse();
    }
    for (const i of path) {
      if (target[i] !== 0) reach(i);
      if (!inNet.has(i)) {
        inNet.add(i);
        net.push(i);
        if (netMark) netMark[i] = 1;
      }
    }
    paths.push(path);
  }
  return { net, paths, connected, via };
}

/** Marks a free cell solid so no pipe passes through it. */
function reserve(g: Grid, p: Vec3): void {
  const x = p[0] - g.ox;
  const y = p[1] - g.oy;
  const z = p[2] - g.oz;
  if (x < 0 || y < 0 || z < 0 || x >= g.dx || y >= g.dy || z >= g.dz) return;
  const i = indexOf(g, p);
  if (g.occ[i] === FREE) g.occ[i] = SOLID;
}

/**
 * Free cells connected to the outside of the build (flood fill from a corner just inside the solid grid
 * border at ground level, which the search margin keeps free). Cells in sealed pockets are unreachable in game, so a pipe
 * never attaches there.
 */
function outsideCells(g: Grid, s: Scratch): Uint8Array {
  const { occ, offsets } = g;
  const open = new Uint8Array(occ.length);
  const start = 1 + g.dx * (g.floor + g.dy);
  const queue = s.queue;
  let head = 0;
  let tail = 0;
  open[start] = 1;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++];
    for (let d = 0; d < 6; d++) {
      const n = cur + offsets[d];
      if (open[n] === 1 || occ[n] !== FREE) continue;
      open[n] = 1;
      queue[tail++] = n;
    }
  }
  return open;
}

/** Hatch sides tried for a pipe after the placed one: sides, then top, then bottom. */
const ATTACH_ORDER: readonly Dir[] = ['north', 'east', 'south', 'west', 'up', 'down'];

function dirBetween(from: Vec3, to: Vec3): Dir {
  if (to[0] !== from[0]) return to[0] > from[0] ? 'east' : 'west';
  if (to[1] !== from[1]) return to[1] > from[1] ? 'up' : 'down';
  return to[2] > from[2] ? 'south' : 'north';
}

/**
 * The hatches with each routed hatch turned to the side its pipe attaches to (see `RouteNet.attachments`).
 * Hatches without a pipe keep their placed face. Returns `hatches` itself when nothing changes.
 */
export function withPipeFaces(hatches: HatchPlacement[], nets: RouteNet[] | null): HatchPlacement[] {
  const faces = new Map<string, Dir>();
  for (const n of nets ?? [])
    for (const a of n.attachments ?? []) faces.set(`${n.kind}|${a.cell.join()}`, a.face);
  if (faces.size === 0) return hatches;
  let changed = false;
  const out = hatches.map((h) => {
    const face = faces.get(`${h.kind}|${h.cell.join()}`);
    if (!face || face === h.face) return h;
    changed = true;
    return { ...h, face };
  });
  return changed ? out : hatches;
}

/**
 * UNIT 4 — Pipe routing.
 *
 * For each routed kind, connect the cells in front of all its hatches (hatch cell + face) into one network
 * by growing it towards the cheapest unconnected terminal, where a bend costs `turnCost` extra blocks
 * (Dijkstra over cell + direction; `turnCost` 0 = plain BFS shortest paths). Straight runs make better
 * trunks for later branches, so the default penalty usually needs no more pipe blocks, often fewer.
 * - Pipes never pass through structure cells (including air interiors), another kind's network or the
 *   ground below the build's lowest layer.
 * - Search is bounded to the structure bounding box grown by 4 blocks (and to `MAX_GRID_CELLS`).
 * - Reports `connected` / `total` terminals and `length` in pipe blocks.
 * Pure; < 30 ms for 60 units.
 *
 * Kinds are routed in `ROUTED_KINDS` order, so earlier kinds' pipes are obstacles for later ones.
 * Terminals of other kinds are always obstacles. The network grows from the first reachable terminal
 * (hatch order); a terminal inside a structure cell can never be connected.
 */
export interface RouteOptions {
  /** Extra cost of a bend, in pipe blocks (0 = plain shortest paths). Default `DEFAULT_TURN_COST`. */
  turnCost?: number;
}

export function routePipes(
  def: MultiblockDef,
  units: Unit[],
  hatches: HatchPlacement[],
  opts: RouteOptions = {},
): RouteNet[] {
  const solids: Vec3[] = [];
  let ground = Infinity;
  for (const u of units)
    for (const c of unitCells(def, u)) {
      solids.push(c.pos);
      ground = Math.min(ground, c.pos[1]);
    }
  for (const h of hatches) solids.push(h.cell);

  // Routed hatches per kind in hatch order, one per cell.
  const byKind = new Map<RoutedKind, HatchPlacement[]>();
  const seenCells = new Set<string>();
  for (const h of hatches) {
    if (!isRouted(h.kind)) continue;
    const id = `${h.kind}|${h.cell.join()}`;
    if (seenCells.has(id)) continue;
    seenCells.add(id);
    let list = byKind.get(h.kind);
    if (!list) byKind.set(h.kind, (list = []));
    list.push(h);
  }
  if (byKind.size === 0) return [];

  const fronts = [...byKind.values()].flat().map((h) => step(h.cell, h.face));
  const g = buildGrid(solids, fronts, ground);
  if (!g) {
    return ROUTED_KINDS.flatMap((kind) => {
      const list = byKind.get(kind);
      return list ? [{ kind, paths: [], length: 0, connected: 0, total: list.length }] : [];
    });
  }
  const cells = g.occ.length;
  const s: Scratch = {
    queue: new Int32Array(cells),
    parent: new Int32Array(cells),
    seen: new Uint32Array(cells),
    stamp: 0,
  };
  const open = outsideCells(g, s);

  // Cells that must stay free: in front of each controller (the player opens it there), and in front of
  // every hatch that is not piped: a muffler only vents into air (GT stops the machine otherwise), an
  // energy or dynamo hatch takes its cable there, a maintenance hatch needs the player.
  for (const u of units)
    for (const c of unitCells(def, u))
      if (c.role === 'controller') reserve(g, step(c.pos, controllerFacing(def, u)));
  for (const h of hatches) if (!isRouted(h.kind)) reserve(g, step(h.cell, h.face));

  // Sides a hatch may not be turned to (e.g. Distillation Tower layer outputs never face up or down).
  const blocked = new Map<string, Set<Dir>>();
  const hatchAt = new Map(hatches.map((h) => [h.cell.join(), h.kind]));
  for (const u of units)
    for (const c of unitCells(def, u)) {
      const kind = hatchAt.get(c.pos.join());
      const dirs = kind && c.role === 'casing' ? def.legend[c.char]?.disallowFaces?.[kind] : undefined;
      if (!kind || !dirs) continue;
      const id = `${kind}|${c.pos.join()}`;
      let set = blocked.get(id);
      if (!set) blocked.set(id, (set = new Set()));
      for (const d of dirs) set.add(rotateDir(d, u.rotation));
    }
  const turnCost = Math.max(0, Math.floor(opts.turnCost ?? DEFAULT_TURN_COST));
  const turns: TurnScratch | null =
    turnCost > 0 && cells * STATES <= MAX_TURN_STATES
      ? {
          dist: new Int32Array(cells * STATES),
          parent: new Int32Array(cells * STATES),
          seen: new Uint32Array(cells * STATES),
          stamp: 0,
          turnCost,
        }
      : null;

  // The cell in front of each hatch's placed face stays reserved for its kind, so every hatch keeps at
  // least that way in; its other open sides are free for any pipe.
  ROUTED_KINDS.forEach((kind, k) => {
    for (const h of byKind.get(kind) ?? []) g.termMask[indexOf(g, step(h.cell, h.face))] |= 1 << k;
  });

  const out: RouteNet[] = [];
  ROUTED_KINDS.forEach((kind, k) => {
    const list = byKind.get(kind);
    if (!list) return;
    const bit = 1 << k;
    // Free cells beside each hatch (earlier kinds' pipes are solid by now), placed face first.
    const usable = (i: number): boolean =>
      open[i] === 1 && g.occ[i] === FREE && (g.termMask[i] === 0 || (g.termMask[i] & bit) !== 0);
    const terms: Terminal[] = list.map((h) => {
      const no = blocked.get(`${h.kind}|${h.cell.join()}`);
      const sides = [h.face, ...ATTACH_ORDER.filter((d) => d !== h.face && !no?.has(d))];
      return { hatch: h.cell, cells: sides.map((d) => indexOf(g, step(h.cell, d))).filter(usable) };
    });
    const total = terms.length;
    // Seed from the first hatch with a free side; if it turns out isolated while others exist
    // (e.g. it only opens into an enclosed pocket), retry from the next one.
    let best: Growth | null = null;
    for (const t of terms) {
      if (t.cells.length === 0) continue;
      const res = grow(g, s, terms, t.cells[0], k, turns);
      if (!best || res.connected > best.connected) best = res;
      if (res.connected > 1 || total === 1) break;
    }
    if (!best) {
      out.push({ kind, paths: [], length: 0, connected: 0, total });
      return;
    }
    for (const i of best.net) g.occ[i] = PIPE + k;
    const paths = best.paths.length > 0 ? best.paths : [[best.net[0]]];
    const attachments: { cell: Vec3; face: Dir }[] = [];
    const via = best.via;
    terms.forEach((t, ti) => {
      if (via[ti] !== -1) attachments.push({ cell: t.hatch, face: dirBetween(t.hatch, posOf(g, via[ti])) });
    });
    out.push({
      kind,
      paths: paths.map((p) => p.map((i) => posOf(g, i))),
      length: best.net.length,
      connected: best.connected,
      total,
      attachments,
    });
  });
  return out;
}
