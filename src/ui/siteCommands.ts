import { get } from 'svelte/store';
import { t } from '../i18n/en';
import { localFootprints, type SiteBuild } from '../model/site/build';
import type { SiteState } from '../model/site/types';
import { appMode, site, siteGroup } from '../state/site';
import { plan } from '../state/store';
import { notify } from './notices';
import { withArranged, withGroupAdded, withPlanAdded } from './siteActions';
import { undoAction } from './siteHistory';
import { siteBuild } from './sitePipeline';

/** Where a new group goes: east of every built group, or at the start of the site. */
export function freeOrigin(s: SiteState, build: SiteBuild | null): [number, number] {
  const edge = 1 + Math.max(1, s.corridor);
  const xs = (build?.groups ?? []).filter((g) => g.def).map((g) => g.max[0]);
  return [xs.length ? Math.max(...xs) + Math.max(1, s.corridor) : edge, edge];
}

export function addGroup(multiblockId: string): void {
  const s = get(site);
  const next = withGroupAdded(s, multiblockId, freeOrigin(s, get(siteBuild).build));
  if (next === s) return;
  site.set(next);
  siteGroup.set(next.groups[next.groups.length - 1].id);
}

/** The single-machine plan becomes a new group; the view switches to the site. */
export function addPlanToSite(): void {
  const s = get(site);
  const next = withPlanAdded(s, get(plan), freeOrigin(s, get(siteBuild).build));
  if (next === s) return;
  site.set(next);
  siteGroup.set(next.groups[next.groups.length - 1].id);
  appMode.set('site');
  notify(t.site.addedToSite);
}

export function arrange(): void {
  const s = get(site);
  const build = get(siteBuild).build;
  if (!build) return;
  const r = withArranged(s, localFootprints(build));
  site.set(r.site);
  notify(
    r.fits ? t.site.arranged : t.site.needs(r.needed[0], r.needed[1]),
    r.fits ? 6000 : 8000,
    'arrange',
    undoAction(),
  );
}
