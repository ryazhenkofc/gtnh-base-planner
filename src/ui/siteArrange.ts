import { arrangeOnFloors } from '../import/gtnhplanner';
import type { createSiteBuilder } from '../model/site/build';
import { optimizeSite, type LayoutScore } from '../model/site/optimize';
import type { SiteState } from '../model/site/types';

/** What optimising changed: the router's numbers for the arrangement it started from, and for the result. */
export interface Optimized {
  /** Whether an annealed layout replaced the arranged one. */
  improved: boolean;
  start: LayoutScore;
  result: LayoutScore;
  /** Groups that were repacked with other limits. */
  reshaped: number;
}

/** A site arranged inside its own size (see `arrangeOnFloors`). */
export interface Arranged {
  site: SiteState;
  fits: boolean;
  needed: [number, number];
  floors: number;
  /** Present when the arrangement was optimised as well (see `optimizeSite`). */
  optimized?: Optimized;
}

/**
 * `arrangeOnFloors` with the plain result the worker sends back. With `optimize`, an arrangement that fits
 * is then annealed and the best layout by the router's numbers is kept.
 */
export function arrangeHere(
  site: SiteState,
  below: boolean,
  builder: ReturnType<typeof createSiteBuilder>,
  optimize = false,
): Arranged {
  const r = arrangeOnFloors(site, builder, below);
  const out: Arranged = {
    site: r.site,
    fits: r.arranged.fits,
    needed: r.arranged.needed,
    floors: r.arranged.floors,
  };
  if (optimize && r.arranged.fits) {
    const o = optimizeSite(r.site, builder, { below });
    out.site = o.site;
    out.optimized = { improved: o.improved, start: o.start, result: o.result, reshaped: o.reshaped };
  }
  return out;
}
