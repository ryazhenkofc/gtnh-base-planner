import type { RouteOptions } from './routing';
import type {
  HatchKind,
  HatchPlacement,
  HatchResult,
  MultiblockDef,
  PackResult,
  PlanLimits,
  RouteNet,
  Unit,
} from './types';

export interface LayoutDeps {
  placeHatches: (def: MultiblockDef, units: Unit[], enabled: HatchKind[]) => HatchResult;
  layoutCandidates: (def: MultiblockDef, count: number, limits: PlanLimits) => Iterable<Unit[]>;
}

export interface ResolvedLayout {
  pack: PackResult;
  hatches: HatchResult;
  /** True when a looser layout than the most compact one was chosen to fit every hatch. */
  loosened: boolean;
}

/** How many alternative layouts to try before settling for the one with the fewest unplaced hatches. */
export const MAX_LAYOUT_TRIES = 24;

/**
 * Pick the most compact layout on which every enabled hatch can be placed.
 *
 * The densest packing shares the most walls, but it can leave a unit without enough open, unshared cells
 * for hatches that cannot be shared (energy, maintenance, muffler). Starting from `base` (the compact
 * layout from `packUnits`) this walks `layoutCandidates` best-first and returns the first layout with no
 * unplaced hatches; if none of the first `maxTries` works, the one with the fewest unplaced hatches wins
 * (the earliest, i.e. most compact, on ties). Deterministic.
 */
export function resolveLayout(
  def: MultiblockDef,
  base: PackResult,
  enabled: HatchKind[],
  limits: PlanLimits,
  deps: LayoutDeps,
  maxTries = MAX_LAYOUT_TRIES,
): ResolvedLayout {
  const first = deps.placeHatches(def, base.units, enabled);
  if (first.unplaced.length === 0 || base.units.length === 0) {
    return { pack: base, hatches: first, loosened: false };
  }

  let best = { units: base.units, hatches: first, layers: layers(base.units) };
  // No layout within the limits has fewer layers than this.
  const cap = (v: number | null) =>
    v === null || !Number.isFinite(v) ? Infinity : Math.max(1, Math.floor(v));
  const perLayer = cap(limits.x) * cap(limits.z);
  const fewestLayers = Math.max(1, Math.ceil(base.units.length / perLayer));
  let tries = 0;
  for (const units of deps.layoutCandidates(def, base.placed, limits)) {
    if (sameLayout(units, base.units)) continue;
    if (tries++ >= maxTries) break;
    const hatches = deps.placeHatches(def, units, enabled);
    const h = layers(units);
    // Fewest unplaced hatches first, then the lowest build (tall stacks are awkward in game), then rank.
    const better =
      hatches.unplaced.length < best.hatches.unplaced.length ||
      (hatches.unplaced.length === best.hatches.unplaced.length && h < best.layers);
    if (better) best = { units, hatches, layers: h };
    // A layout with every hatch placed on as few layers as the limits allow cannot be beaten by a later
    // (less compact) one.
    if (best.hatches.unplaced.length === 0 && best.layers <= fewestLayers) break;
  }
  const loosened = best.units !== base.units;
  return { pack: loosened ? { ...base, units: best.units } : base, hatches: best.hatches, loosened };
}

/** Number of distinct unit heights (stacked layers). */
function layers(units: Unit[]): number {
  return new Set(units.map((u) => u.origin[1])).size;
}

function sameLayout(a: Unit[], b: Unit[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (u, i) =>
      u.rotation === b[i].rotation &&
      u.origin[0] === b[i].origin[0] &&
      u.origin[1] === b[i].origin[1] &&
      u.origin[2] === b[i].origin[2],
  );
}

export interface RoutedLayoutDeps extends LayoutDeps {
  routePipes: (
    def: MultiblockDef,
    units: Unit[],
    hatches: HatchPlacement[],
    opts: RouteOptions,
  ) => RouteNet[];
  /** Looser versions of a layout (same arrangement, wider walkways and gaps), most compact first. */
  loosenings: (def: MultiblockDef, units: Unit[]) => Iterable<Unit[]>;
}

export interface ResolvedRoutedLayout extends ResolvedLayout {
  /** The pipe and cable networks of the chosen layout. */
  pipes: RouteNet[];
}

/** How many looser layouts to route before settling for the one with the fewest unconnected hatches. */
export const MAX_ROUTED_TRIES = 12;

/**
 * Negotiation rounds for each layout tried: most layouts whose pipes fit settle in a few rounds, and the
 * rounds spent on ones that never settle are what makes resolving slow.
 */
export const TRIAL_ROUNDS = 8;

/** Hatches the networks leave unconnected. */
export function unconnected(nets: readonly RouteNet[]): number {
  return nets.reduce((n, r) => n + r.total - r.connected, 0);
}

/**
 * `resolveLayout`, then make sure every routed hatch gets its pipe or cable: when the chosen layout leaves
 * some hatch unconnected (typically a one-block walkway between rows of units that cannot hold a line per
 * kind), walk its `loosenings` from the most compact and take the first one on which every hatch is
 * placed (no more unplaced than before) and connected. At most `maxTries` looser layouts are routed, the
 * loosest always among them; if none connects everything, the layout with the fewest unplaced, then
 * unconnected hatches wins (the most compact on ties). Deterministic.
 */
export function resolveRoutedLayout(
  def: MultiblockDef,
  base: PackResult,
  enabled: HatchKind[],
  limits: PlanLimits,
  opts: RouteOptions,
  deps: RoutedLayoutDeps,
  maxTries = MAX_ROUTED_TRIES,
): ResolvedRoutedLayout {
  const start = resolveLayout(def, base, enabled, limits, deps);
  const trial = { ...opts, rounds: Math.min(opts.rounds ?? TRIAL_ROUNDS, TRIAL_ROUNDS) };
  const route = (units: Unit[], hatches: HatchResult) => deps.routePipes(def, units, hatches.hatches, trial);
  const first = route(start.pack.units, start.hatches);
  let best = { units: start.pack.units, hatches: start.hatches, pipes: first, missing: unconnected(first) };
  if (best.missing > 0 && maxTries > 0) {
    const looser = [...deps.loosenings(def, start.pack.units)];
    // The first tries in order, then the loosest (most room for pipes) if it was not reached.
    const tries =
      looser.length <= maxTries ? looser : [...looser.slice(0, maxTries - 1), looser[looser.length - 1]];
    for (const units of tries) {
      const hatches = deps.placeHatches(def, units, enabled);
      if (hatches.unplaced.length > best.hatches.unplaced.length) continue;
      const pipes = route(units, hatches);
      const missing = unconnected(pipes);
      if (hatches.unplaced.length < best.hatches.unplaced.length || missing < best.missing)
        best = { units, hatches, pipes, missing };
      if (best.missing === 0) break;
    }
  }
  if (best.missing > 0 && trial.rounds !== opts.rounds) {
    // Nothing fit in the trial rounds: give the best layout the full negotiation.
    const pipes = deps.routePipes(def, best.units, best.hatches.hatches, opts);
    const missing = unconnected(pipes);
    if (missing < best.missing) best = { ...best, pipes, missing };
  }
  if (best.units === start.pack.units) return { ...start, pipes: best.pipes };
  return {
    pack: { ...base, units: best.units },
    hatches: best.hatches,
    loosened: true,
    pipes: best.pipes,
  };
}
