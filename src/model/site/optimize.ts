import { annealGroups, type AnnealOptions } from './anneal';
import { localFootprints, localHeights } from './build';
import type { SiteBuild, SiteBuilder } from './buildTypes';
import { groupShapes } from './shapes';
import type { SiteGroup, SiteState } from './types';

/**
 * Optimises an arranged site in two stages, and keeps whatever the real router likes best.
 *
 * 1. Explore: anneal the groups' places from several seeds on a cheap estimate of pipe length
 *    (`annealGroups`), then route the start layout and each different result. The estimate cannot see hatches
 *    or walls, so it is only good for finding candidates: its best layout often routes worse than the start.
 * 2. Polish: anneal again from the best layout found, this time judging every step by the router itself
 *    (`scoreBuild`, cached per layout), for a number of steps or a time budget.
 *
 * Groups of several units may also be packed another way (other `limits`: rows, layers), see `groupShapes`; the
 * result says how many were. Ranking, in order: build problems (overlaps, groups outside, unrouted nets, ...), terminals left
 * unconnected, pipe and cable blocks, then the width + depth of the layout. The start wins ties, so the
 * result is never worse than the arrangement it was given.
 */

export interface OptimizeOptions extends Pick<AnnealOptions, 'budgetMs' | 'iterations' | 'now'> {
  /** Explore runs, from seeds 1 to `seeds`. Default `DEFAULT_SEEDS`. */
  seeds?: number;
  /** Let groups be repacked with other limits (units along X and Z, layers). Default true. */
  reshape?: boolean;
  /** Whether the site is built with connections from below (see `SiteBuildOptions.below`). */
  below?: boolean;
  /** Router-judged steps per polish run; 0 skips the polish. Default `DEFAULT_REFINE_STEPS`. */
  refineSteps?: number;
  /** Polish runs, one after the other from the best layout so far. Default `DEFAULT_REFINE_RUNS`. */
  refineRuns?: number;
  /** Milliseconds for all polish runs together (the cooling follows the clock). Default `DEFAULT_REFINE_MS`. */
  refineMs?: number;
}

export const DEFAULT_SEEDS = 4;
export const DEFAULT_REFINE_STEPS = 500;
export const DEFAULT_REFINE_RUNS = 2;
export const DEFAULT_REFINE_MS = 6000;

/** Start temperature of a polish run, as a share of the typical uphill step of a random move. */
const REFINE_HEAT = 0.2;

/** What the router made of one layout. */
export interface LayoutScore {
  problems: number;
  unconnected: number;
  blocks: number;
  span: number;
}

export interface OptimizeResult {
  site: SiteState;
  /** Whether an optimised layout replaced the start. */
  improved: boolean;
  /** The start layout, and the one returned. */
  start: LayoutScore;
  result: LayoutScore;
  /** Different layouts that were routed and compared. */
  tried: number;
  /** Groups that were repacked (their limits differ from the start's). */
  reshaped: number;
}

export function scoreBuild(build: SiteBuild): LayoutScore {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const pg of build.groups) {
    x0 = Math.min(x0, pg.min[0]);
    x1 = Math.max(x1, pg.max[0]);
    z0 = Math.min(z0, pg.min[2]);
    z1 = Math.max(z1, pg.max[2]);
  }
  return {
    problems: build.warnings.length,
    unconnected: build.stats.terminals - build.stats.connected,
    blocks: build.stats.pipeBlocks + build.stats.cableBlocks,
    span: x1 > x0 ? x1 - x0 + (z1 - z0) : 0,
  };
}

/** Whether `a` is strictly better than `b`. */
export function better(a: LayoutScore, b: LayoutScore): boolean {
  for (const k of ['problems', 'unconnected', 'blocks', 'span'] as const)
    if (a[k] !== b[k]) return a[k] < b[k];
  return false;
}

/** One number for the annealer, ordered like `better` for any realistic layout. */
export function scoreValue(s: LayoutScore): number {
  return s.problems * 5000 + s.unconnected * 200 + s.blocks + 0.1 * s.span;
}

export function optimizeSite(
  site: SiteState,
  builder: SiteBuilder,
  opts: OptimizeOptions = {},
): OptimizeResult {
  const below = !!opts.below;
  const measured = builder(site, { pipes: false, cables: false, below });
  const footprints = localFootprints(measured);
  const heights = localHeights(measured);
  const sizeOf = (id: string) => footprints.get(id);
  const shapes = opts.reshape === false ? undefined : groupShapes(site, builder, below);
  const heightOf = (id: string) => heights.get(id) ?? 1;

  /** The router's verdict on a layout, remembered: the annealer comes back to the same layouts often. */
  const scores = new Map<string, LayoutScore>();
  const route = (groups: SiteGroup[]): LayoutScore => {
    const key = layoutKey(groups);
    let score = scores.get(key);
    if (!score) {
      score = scoreBuild(builder({ ...site, groups }, { pipes: true, cables: true, below }));
      scores.set(key, score);
    }
    return score;
  };

  const start = route(site.groups);
  let best = { groups: site.groups, score: start };
  const consider = (groups: SiteGroup[]) => {
    const score = route(groups);
    if (better(score, best.score)) best = { groups, score };
  };

  const seeds = Math.max(1, opts.seeds ?? DEFAULT_SEEDS);
  for (let seed = 1; seed <= seeds; seed++) {
    const r = annealGroups(site, sizeOf, {
      seed,
      heightOf,
      shapes,
      iterations: opts.iterations,
      budgetMs: opts.budgetMs,
      now: opts.now,
    });
    if (r.improved) consider(r.groups);
  }

  const steps = opts.refineSteps ?? DEFAULT_REFINE_STEPS;
  const runs = Math.max(1, opts.refineRuns ?? DEFAULT_REFINE_RUNS);
  if (steps > 0) {
    const now = opts.now ?? (() => performance.now());
    const deadline = now() + (opts.refineMs ?? DEFAULT_REFINE_MS);
    for (let run = 1; run <= runs; run++) {
      const left = deadline - now();
      if (left <= 0) break;
      const r = annealGroups({ ...site, groups: best.groups }, sizeOf, {
        seed: run,
        heightOf,
        shapes,
        iterations: steps,
        budgetMs: left / (runs - run + 1),
        now: opts.now,
        heat: REFINE_HEAT,
        evaluate: (groups) => scoreValue(route(groups)),
      });
      if (r.improved) consider(r.groups);
    }
  }

  const improved = best.groups !== site.groups;
  return {
    site: improved ? { ...site, groups: best.groups } : site,
    improved,
    start,
    result: best.score,
    tried: scores.size - 1,
    reshaped: improved ? best.groups.filter((g, i) => limitsKey(g) !== limitsKey(site.groups[i])).length : 0,
  };
}

function layoutKey(groups: readonly SiteGroup[]): string {
  return groups.map((g) => `${g.origin[0]},${g.origin[1]},${g.rotation},${limitsKey(g)}`).join(';');
}

function limitsKey(g: SiteGroup): string {
  return `${g.limits.x}/${g.limits.y}/${g.limits.z}`;
}
