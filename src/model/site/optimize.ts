import { annealGroups, type AnnealOptions } from './anneal';
import { localFootprints, localHeights } from './build';
import type { SiteBuild, SiteBuilder } from './buildTypes';
import type { SiteGroup, SiteState } from './types';

/**
 * Optimises an arranged site: anneals the groups' places from several seeds (`annealGroups`), builds and
 * routes the start layout and each different result with the real router, and keeps the best by what the
 * router made of them. The annealer only estimates pipe length, and its tighter layouts can leave a hatch
 * without a way out, so a result must beat the start on the router's own numbers to replace it.
 *
 * Ranking, in order: build problems (overlaps, groups outside, unrouted nets, ...), terminals left
 * unconnected, pipe and cable blocks, then the width + depth of the layout. The start wins ties.
 */

export interface OptimizeOptions extends Pick<AnnealOptions, 'budgetMs' | 'iterations' | 'now'> {
  /** Annealing runs, from seeds 1 to `seeds`. Default `DEFAULT_SEEDS`. */
  seeds?: number;
  /** Whether the site is built with connections from below (see `SiteBuildOptions.below`). */
  below?: boolean;
  /** Called after each layout has been tried, with how many are done of how many. */
  onProgress?: (done: number, total: number) => void;
}

export const DEFAULT_SEEDS = 4;

/** What the router made of one layout. */
export interface LayoutScore {
  problems: number;
  unconnected: number;
  blocks: number;
  span: number;
}

export interface OptimizeResult {
  site: SiteState;
  /** Whether an annealed layout replaced the start. */
  improved: boolean;
  /** The start layout, and the one returned. */
  start: LayoutScore;
  result: LayoutScore;
  /** Different annealed layouts that were routed and compared. */
  tried: number;
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
  const heightOf = (id: string) => heights.get(id) ?? 1;
  const route = (s: SiteState) => scoreBuild(builder(s, { pipes: true, cables: true, below }));

  const seeds = Math.max(1, opts.seeds ?? DEFAULT_SEEDS);
  const layouts: SiteGroup[][] = [];
  const seen = new Set([layoutKey(site.groups)]);
  for (let seed = 1; seed <= seeds; seed++) {
    const r = annealGroups(site, sizeOf, {
      seed,
      heightOf,
      iterations: opts.iterations,
      budgetMs: opts.budgetMs,
      now: opts.now,
    });
    const key = layoutKey(r.groups);
    if (!r.improved || seen.has(key)) continue;
    seen.add(key);
    layouts.push(r.groups);
  }

  const total = layouts.length + 1;
  let done = 1;
  const start = route(site);
  opts.onProgress?.(done, total);
  let best = { site, score: start };
  for (const groups of layouts) {
    const candidate = { ...site, groups };
    const score = route(candidate);
    if (better(score, best.score)) best = { site: candidate, score };
    opts.onProgress?.(++done, total);
  }
  return { site: best.site, improved: best.site !== site, start, result: best.score, tried: layouts.length };
}

function layoutKey(groups: readonly SiteGroup[]): string {
  return groups.map((g) => `${g.origin[0]},${g.origin[1]},${g.rotation}`).join(';');
}
