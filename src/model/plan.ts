import type { HatchKind, HatchResult, MultiblockDef, PackResult, PlanLimits, Unit } from './types';

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
    // A single-layer layout with every hatch placed cannot be beaten by a later (less compact) one.
    if (best.hatches.unplaced.length === 0 && best.layers === 1) break;
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
