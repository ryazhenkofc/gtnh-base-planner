import { arrangeOnFloors } from '../import/gtnhplanner';
import type { createSiteBuilder } from '../model/site/build';
import type { SiteState } from '../model/site/types';

/** A site arranged inside its own size (see `arrangeOnFloors`). */
export interface Arranged {
  site: SiteState;
  fits: boolean;
  needed: [number, number];
  floors: number;
}

/** `arrangeOnFloors` with the plain result the worker sends back. */
export function arrangeHere(
  site: SiteState,
  below: boolean,
  builder: ReturnType<typeof createSiteBuilder>,
): Arranged {
  const r = arrangeOnFloors(site, builder, below);
  return { site: r.site, fits: r.arranged.fits, needed: r.arranged.needed, floors: r.arranged.floors };
}
