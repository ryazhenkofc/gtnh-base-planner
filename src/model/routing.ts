import { controllerFacing, rotateDir, step, unitCells } from './geometry';
import type { Dir, HatchKind, HatchPlacement, MultiblockDef, RouteNet, Unit, Vec3 } from './types';

/** Hatch kinds that get pipe/conveyor networks. */
export const PIPE_KINDS = ['itemIn', 'itemOut', 'fluidIn', 'fluidOut', 'steamIn'] as const;

/** Hatch kinds that get cable networks (energy in, dynamo out). */
export const CABLE_KINDS = ['energy', 'dynamo'] as const;

/** Every kind routing can connect, in routing order: pipes first, then cables. */
export const ROUTED_KINDS = [...PIPE_KINDS, ...CABLE_KINDS] as const;

export type RoutedKind = (typeof ROUTED_KINDS)[number];

/** Whether a routed kind is a cable (drawn thinner) rather than a pipe. */
export function isCable(kind: HatchKind): boolean {
  return (CABLE_KINDS as readonly HatchKind[]).includes(kind);
}

/** Search margin around the structures and terminals, in blocks. */
const MARGIN = 4;

/**
 * Largest search grid (cells) routing will allocate, about 100 MB of scratch memory. Only far-apart manual
 * layouts from links or files reach it; above it nothing is routed and every terminal reports unconnected.
 */
export const MAX_GRID_CELLS = 4_000_000;

/** `occ` values: free, solid (structure, reserved cell or grid border). */
const FREE = 0;
const SOLID = 1;

/** A dense voxel grid over the search box plus a 1-cell solid border, so the search needs no bounds checks. */
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
  /** Neighbour index offsets: -z, +z, +x, -x, +y, -y. */
  offsets: Int32Array;
}

function isRoutable(kind: HatchKind): kind is RoutedKind {
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

/** Default extra cost of a pipe bend, in blocks: straighter runs for the same or fewer pipe blocks. */
export const DEFAULT_TURN_COST = 2;

/**
 * Negotiated routing (PathFinder): every kind is routed as if the others were not there, but a cell
 * another kind already uses costs more (`present` × that factor), and cells contested in earlier rounds
 * stay dearer (`history`). Kinds whose network still shares a cell are ripped up and routed again, with
 * both penalties growing, until no cell is shared. Fixed limits keep the work bounded and deterministic.
 */
const MAX_ROUNDS = 24;
const PRESENT_START = 2;
const PRESENT_GROWTH = 1.6;
const HISTORY_STEP = 1;
/** Negotiation also stops after this many rounds without fewer contested cells than before. */
const MAX_STALLED_ROUNDS = 5;

/** Extra cost of taking a cell beside another kind's hatch (it may be that hatch's only way out). */
const BESIDE_HATCH_COST = 1;

/** Arrival direction of a cell that is part of the network (no bend is priced leaving it). */
const NO_DIR = 6;

/**
 * Indexed binary min-heap of cells keyed by `key[cell]` (ties: lower cell first), with decrease-key, so
 * it never holds a cell twice.
 */
class CellHeap {
  items: Int32Array;
  size = 0;

  constructor(
    private key: Float64Array,
    /** Heap slot per cell, -1 when the cell is not queued. */
    private pos: Int32Array,
  ) {
    this.items = new Int32Array(1024);
  }

  clear(): void {
    for (let i = 0; i < this.size; i++) this.pos[this.items[i]] = -1;
    this.size = 0;
  }

  private less(a: number, b: number): boolean {
    const ka = this.key[a];
    const kb = this.key[b];
    return ka < kb || (ka === kb && a < b);
  }

  /** Queue `cell`, or move it up after its key dropped. */
  update(cell: number): void {
    let i = this.pos[cell];
    if (i < 0) {
      if (this.size === this.items.length) {
        const items = new Int32Array(this.size * 2);
        items.set(this.items);
        this.items = items;
      }
      i = this.size++;
    }
    const { items, pos } = this;
    while (i > 0) {
      const p = (i - 1) >> 1;
      const up = items[p];
      if (!this.less(cell, up)) break;
      items[i] = up;
      pos[up] = i;
      i = p;
    }
    items[i] = cell;
    pos[cell] = i;
  }

  /** Removes and returns the cell with the smallest key. */
  pop(): number {
    const { items, pos } = this;
    const top = items[0];
    pos[top] = -1;
    const n = --this.size;
    if (n > 0) {
      const last = items[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && this.less(items[c + 1], items[c])) c++;
        if (!this.less(items[c], last)) break;
        items[i] = items[c];
        pos[items[c]] = i;
        i = c;
      }
      items[i] = last;
      pos[last] = i;
    }
    return top;
  }
}

/** One hatch to connect: the free cells beside it where a pipe may attach, its placed face's cell first. */
interface Terminal {
  hatch: Vec3;
  cells: number[];
}

/** One kind's network. */
interface Tree {
  /** Pipe cells in insertion order. */
  net: number[];
  /** Paths as grid indices, each from an existing pipe (or the seed) to a newly connected terminal. */
  paths: number[][];
  connected: number;
}

/** Shared state of one routing run. */
interface Router {
  g: Grid;
  turnCost: number;
  /** Per cell: bitmask of kinds whose current network uses it. */
  used: Uint8Array;
  /** Per cell: bitmask of kinds that may enter it (free, and not another kind's reserved cell). */
  pass: Uint8Array;
  /** Per cell: price of a pipe block there before congestion: 1, plus beside-hatch and history costs. */
  price: Float32Array;
  /** Per cell: 1 on the previous network of the kind being repaired (free to keep, see `routePipes`). */
  keep: Uint8Array;
  /** Per cell: number of unconnected terminals of the kind being routed that may attach here. */
  target: Uint16Array;
  dist: Float64Array;
  parent: Int32Array;
  arrive: Uint8Array;
  /** Visit stamp per cell; `dist` is valid when `seen[i] === stamp`. */
  seen: Uint32Array;
  stamp: number;
  /** Network stamp per cell; the cell is in the current network when `inNet[i] === netStamp`. */
  inNet: Uint32Array;
  netStamp: number;
  heap: CellHeap;
}

/** Set bits per byte value. */
const POPCOUNT = Uint8Array.from({ length: 256 }, (_, m) => {
  let n = 0;
  for (; m !== 0; m &= m - 1) n++;
  return n;
});

/**
 * Grow one network of kind `k` from `seed` over the cheapest cells until every terminal it can reach is
 * connected: one Dijkstra search from the network, continued (not restarted) after each new branch, whose
 * cells join the network at cost 0. A step costs the cell's price plus `turnCost` for a bend. With `legal`,
 * cells of other kinds' networks are walls; otherwise they only cost more (`present`).
 */
function growTree(
  r: Router,
  terms: readonly Terminal[],
  at: ReadonlyMap<number, readonly number[]>,
  via: Int32Array,
  seed: number,
  k: number,
  present: number,
  legal: boolean,
): Tree {
  const { g, used, pass, price, keep, target, dist, parent, arrive, seen, inNet, heap, turnCost } = r;
  const { offsets } = g;
  const bit = 1 << k;
  const others = ~bit & 0xff;
  const stamp = ++r.stamp;
  const ns = ++r.netStamp;
  heap.clear();
  via.fill(-1);
  let remaining = terms.length;
  let connected = 0;
  const net: number[] = [];
  const paths: number[][] = [];

  const reach = (cell: number): void => {
    for (const ti of at.get(cell) ?? []) {
      if (via[ti] !== -1) continue;
      via[ti] = cell;
      connected++;
      remaining--;
      for (const c of terms[ti].cells) target[c]--;
    }
  };
  const join = (cell: number): void => {
    if (inNet[cell] === ns) return;
    inNet[cell] = ns;
    net.push(cell);
    seen[cell] = stamp;
    dist[cell] = 0;
    parent[cell] = -1;
    arrive[cell] = NO_DIR;
    heap.update(cell);
    if (target[cell] !== 0) reach(cell);
  };

  join(seed);
  paths.push([seed]);
  while (remaining > 0 && heap.size > 0) {
    const cur = heap.pop();
    const d = dist[cur];

    if (target[cur] !== 0 && inNet[cur] !== ns) {
      // Cheapest unconnected terminal: its path back to the network becomes a branch.
      const path: number[] = [];
      let i = cur;
      for (; inNet[i] !== ns; i = parent[i]) path.push(i);
      path.push(i);
      path.reverse();
      for (let j = 1; j < path.length; j++) join(path[j]);
      paths.push(path);
      continue;
    }
    const a = arrive[cur];
    for (let dir = 0; dir < 6; dir++) {
      const n = cur + offsets[dir];
      if ((pass[n] & bit) === 0 || inNet[n] === ns) continue;
      const u = used[n] & others;
      if (u !== 0 && legal) continue;
      let cost = 0;
      if (keep[n] === 0) {
        cost = price[n];
        if (u !== 0) cost *= 1 + present * POPCOUNT[u];
        if (a !== NO_DIR && a !== dir) cost += turnCost;
      }
      const nd = d + cost;
      if (seen[n] === stamp && dist[n] <= nd) continue;
      seen[n] = stamp;
      dist[n] = nd;
      parent[n] = cur;
      arrive[n] = dir;
      heap.update(n);
    }
  }
  // Drop the seed's placeholder path when a branch starts at the seed anyway.
  if (paths.length > 1) paths.shift();
  return { net, paths, connected };
}

/**
 * Route kind `k`: grow from the first terminal with a free side; if that network turns out isolated while
 * others exist (e.g. it only opens into an enclosed pocket), retry from the next one. Leaves `via` holding
 * the attachment cell per terminal of the best try.
 */
function routeKind(
  r: Router,
  terms: readonly Terminal[],
  at: ReadonlyMap<number, readonly number[]>,
  via: Int32Array,
  k: number,
  present: number,
  legal: boolean,
): Tree | null {
  const { target } = r;
  let best: Tree | null = null;
  let bestVia: Int32Array | null = null;
  for (const t of terms) {
    if (t.cells.length === 0) continue;
    for (const tt of terms) for (const c of tt.cells) target[c]++;
    const res = growTree(r, terms, at, via, t.cells[0], k, present, legal);
    // Clear what is left of the target counts.
    for (let ti = 0; ti < terms.length; ti++)
      if (via[ti] === -1) for (const c of terms[ti].cells) target[c]--;
    if (!best || res.connected > best.connected) {
      best = res;
      bestVia = via.slice();
    }
    if (res.connected > 1 || terms.length === 1) break;
  }
  if (bestVia) via.set(bestVia);
  return best;
}

/**
 * Free cells connected to the outside of the build (flood fill from a corner just inside the solid grid
 * border at ground level, which the search margin keeps free). Cells in sealed pockets are unreachable in
 * game, so a pipe never attaches there.
 */
function outsideCells(g: Grid): Uint8Array {
  const { occ, offsets } = g;
  const open = new Uint8Array(occ.length);
  const start = 1 + g.dx * (g.floor + g.dy);
  const queue = new Int32Array(occ.length);
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

/** Marks a free cell solid so no pipe passes through it. */
function reserve(g: Grid, p: Vec3): void {
  const x = p[0] - g.ox;
  const y = p[1] - g.oy;
  const z = p[2] - g.oz;
  if (x < 0 || y < 0 || z < 0 || x >= g.dx || y >= g.dy || z >= g.dz) return;
  const i = indexOf(g, p);
  if (g.occ[i] === FREE) g.occ[i] = SOLID;
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
 * For each routed kind, connect the cells beside all its hatches into one network that never shares a
 * cell with another kind's. Each network is grown from one hatch towards the cheapest unconnected one,
 * where a bend costs `turnCost` extra blocks. Kinds are negotiated (see `MAX_ROUNDS`): networks may first
 * overlap at a price, and contested cells get dearer each round until every kind has its own cells. If
 * the rounds run out, the kinds are routed one after another around the ones already laid, cheapest
 * uncontested cells first.
 * - Pipes never pass through structure cells (including air interiors), another kind's network or the
 *   ground below the build's lowest layer, nor through the cell in front of a controller or of a hatch
 *   that is not routed (mufflers vent there, maintenance needs the player).
 * - The cell in front of each routed hatch's placed face is reserved for its kind; its other open sides
 *   are free for any pipe, and the hatch attaches through whichever side its pipe reaches.
 * - Search is bounded to the structure bounding box grown by 4 blocks (and to `MAX_GRID_CELLS`).
 * - Reports `connected` / `total` terminals and `length` in pipe blocks.
 * Pure and deterministic. Nets are returned in `ROUTED_KINDS` order.
 */
export interface RouteOptions {
  /** Extra cost of a bend, in pipe blocks (0 = plain shortest paths). Default `DEFAULT_TURN_COST`. */
  turnCost?: number;
  /** Kinds to connect. Default `PIPE_KINDS`; add `CABLE_KINDS` to route energy and dynamo cables too. */
  kinds?: readonly RoutedKind[];
  /** Negotiation rounds before falling back to routing kinds one by one. Default `MAX_ROUNDS`. */
  rounds?: number;
}

export function routePipes(
  def: MultiblockDef,
  units: Unit[],
  hatches: HatchPlacement[],
  opts: RouteOptions = {},
): RouteNet[] {
  const kinds = opts.kinds ?? PIPE_KINDS;
  const solids: Vec3[] = [];
  let ground = Infinity;
  for (const u of units)
    for (const c of unitCells(def, u)) {
      solids.push(c.pos);
      ground = Math.min(ground, c.pos[1]);
    }
  for (const h of hatches) solids.push(h.cell);
  const wanted = new Set<HatchKind>(kinds);
  const isRouted = (kind: HatchKind): kind is RoutedKind => isRoutable(kind) && wanted.has(kind);

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
  const open = outsideCells(g);

  // Cells that must stay free: in front of each controller (the player opens it there), and in front of
  // every hatch that is not routed here: a muffler only vents into air (GT stops the machine otherwise), an
  // energy or dynamo hatch without a routed cable takes its cable there, a maintenance hatch needs the player.
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

  // The cell in front of each hatch's placed face stays reserved for its kind, so every hatch keeps at
  // least that way in; its other open sides are free for any pipe.
  ROUTED_KINDS.forEach((kind, k) => {
    for (const h of byKind.get(kind) ?? []) g.termMask[indexOf(g, step(h.cell, h.face))] |= 1 << k;
  });

  const dist = new Float64Array(cells);
  const r: Router = {
    g,
    turnCost: Math.max(0, Math.floor(opts.turnCost ?? DEFAULT_TURN_COST)),
    used: new Uint8Array(cells),
    pass: new Uint8Array(cells),
    price: new Float32Array(cells).fill(1),
    keep: new Uint8Array(cells),
    target: new Uint16Array(cells),
    dist,
    parent: new Int32Array(cells),
    arrive: new Uint8Array(cells),
    seen: new Uint32Array(cells),
    stamp: 0,
    inNet: new Uint32Array(cells),
    netStamp: 0,
    heap: new CellHeap(dist, new Int32Array(cells).fill(-1)),
  };

  interface KindState {
    kind: RoutedKind;
    k: number;
    terms: Terminal[];
    at: Map<number, number[]>;
    via: Int32Array;
    tree: Tree | null;
  }
  const states: KindState[] = [];
  for (const [k, kind] of ROUTED_KINDS.entries()) {
    const list = byKind.get(kind);
    if (!list) continue;
    const bit = 1 << k;
    const usable = (i: number): boolean =>
      open[i] === 1 && g.occ[i] === FREE && (g.termMask[i] === 0 || (g.termMask[i] & bit) !== 0);
    const terms: Terminal[] = list.map((h) => {
      const no = blocked.get(`${h.kind}|${h.cell.join()}`);
      const sides = [h.face, ...ATTACH_ORDER.filter((d) => d !== h.face && !no?.has(d))];
      return { hatch: h.cell, cells: sides.map((d) => indexOf(g, step(h.cell, d))).filter(usable) };
    });
    const at = new Map<number, number[]>();
    terms.forEach((t, ti) => {
      for (const c of t.cells) {
        let l = at.get(c);
        if (!l) at.set(c, (l = []));
        l.push(ti);
      }
    });
    states.push({ kind, k, terms, at, via: new Int32Array(terms.length), tree: null });
  }
  for (let i = 0; i < cells; i++)
    if (g.occ[i] === FREE) r.pass[i] = g.termMask[i] !== 0 ? g.termMask[i] : 0xff;
  // Cells beside a hatch, other than reserved front cells, cost a little more.
  for (const h of hatches)
    for (const d of ATTACH_ORDER) {
      const i = indexOf(g, step(h.cell, d));
      if (i >= 0 && i < cells && r.pass[i] === 0xff) r.price[i] += BESIDE_HATCH_COST;
    }

  const setUsed = (s: KindState, on: boolean): void => {
    if (!s.tree) return;
    const bit = 1 << s.k;
    for (const i of s.tree.net) r.used[i] = on ? r.used[i] | bit : r.used[i] & ~bit;
  };
  const shared = (s: KindState): boolean => {
    const bit = 1 << s.k;
    return s.tree !== null && s.tree.net.some((i) => (r.used[i] & ~bit) !== 0);
  };

  // Negotiation rounds.
  const rounds = Math.max(0, Math.floor(opts.rounds ?? MAX_ROUNDS));
  let present = PRESENT_START;
  let legal = false;
  let fewest = Infinity;
  let stalled = 0;
  for (let round = 0; round < rounds && !legal && stalled < MAX_STALLED_ROUNDS; round++) {
    for (const s of states) {
      if (round > 0 && !shared(s)) continue;
      setUsed(s, false);
      s.tree = routeKind(r, s.terms, s.at, s.via, s.k, present, false);
      setUsed(s, true);
    }
    let contested = 0;
    for (const s of states)
      for (const i of s.tree?.net ?? [])
        if (POPCOUNT[r.used[i]] > 1) {
          contested++;
          r.price[i] += HISTORY_STEP / POPCOUNT[r.used[i]];
        }
    if (contested === 0) legal = true;
    if (contested < fewest) {
      fewest = contested;
      stalled = 0;
    } else stalled++;
    present *= PRESENT_GROWTH;
  }

  if (!legal) {
    // Out of rounds: repair the networks one by one. Each kind is routed again around every other kind's
    // cells, keeping its own uncontested cells for free, so it only detours around the contested ones
    // (which the kinds repaired later keep). Kinds with the fewest contested cells give theirs up first.
    const order = [...states].sort((a, b) => contestedCells(r, a) - contestedCells(r, b) || a.k - b.k);
    for (const s of order) {
      const own = s.tree?.net ?? [];
      for (const i of own) r.keep[i] = 1;
      setUsed(s, false);
      s.tree = routeKind(r, s.terms, s.at, s.via, s.k, 0, true);
      setUsed(s, true);
      for (const i of own) r.keep[i] = 0;
    }
  }

  return states.map((s) => {
    const { kind, terms, via, tree } = s;
    const total = terms.length;
    if (!tree) return { kind, paths: [], length: 0, connected: 0, total };
    // Each connected hatch attaches through its placed face when the network passes there, else through
    // the first side of `ATTACH_ORDER` it does pass.
    const ns = ++r.netStamp;
    for (const i of tree.net) r.inNet[i] = ns;
    const attachments: { cell: Vec3; face: Dir }[] = [];
    terms.forEach((t, ti) => {
      if (via[ti] === -1) return;
      const cell = t.cells.find((c) => r.inNet[c] === ns) ?? via[ti];
      attachments.push({ cell: t.hatch, face: dirBetween(t.hatch, posOf(g, cell)) });
    });
    return {
      kind,
      paths: tree.paths.map((p) => p.map((i) => posOf(g, i))),
      length: tree.net.length,
      connected: tree.connected,
      total,
      attachments,
    };
  });
}

/** Cells of a kind's network that another kind's network also uses. */
function contestedCells(r: Router, s: { k: number; tree: Tree | null }): number {
  const bit = 1 << s.k;
  let n = 0;
  for (const i of s.tree?.net ?? []) if ((r.used[i] & ~bit) !== 0) n++;
  return n;
}
