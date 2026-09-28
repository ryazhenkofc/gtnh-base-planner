import { key } from '../geometry';
import type { MultiblockDef, PlanLimits, Vec3 } from '../types';
import { coord, modeCaps } from './modes';
import type { Candidate, Mode, Order, Spacing } from './types';

/** Enumerating and ranking lattice layouts, scored analytically before any cell is checked. */

/** Axis indices [fast, slow] of the horizontal fill for an order. */
function orderAxes(order: Order): [0 | 2, 0 | 2] {
  return order === 'xzy' ? [0, 2] : [2, 0];
}

/** Lattice coordinates of the `idx`-th unit in fill order. */
export function decode(idx: number, counts: Vec3, order: Order): Vec3 {
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
export function ordinal(p: Vec3, counts: Vec3, order: Order): number {
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
export function candidates(
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
