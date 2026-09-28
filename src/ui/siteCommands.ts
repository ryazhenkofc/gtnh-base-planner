import { get } from 'svelte/store';
import { getSiteDef } from '../data/generic';
import { t } from '../i18n/en';
import { localFootprints, type SiteBuild } from '../model/site/build';
import type { SiteState } from '../model/site/types';
import { SITE_MAX_SIZE } from '../share/siteCodec';
import { appMode, site, siteGroup } from '../state/site';
import { plan } from '../state/store';
import { notify } from './notices';
import { withArranged, withGroupAdded, withGrownToFit, withPlanAdded, withSiteSize } from './siteActions';
import { growAfterBuild } from './siteEditing';
import { undoAction } from './siteHistory';
import { siteBuild } from './sitePipeline';

/** Where a new group goes: east of every built group, or at the start of the site. */
export function freeOrigin(s: SiteState, build: SiteBuild | null): [number, number] {
  const edge = 1 + Math.max(1, s.corridor);
  const xs = (build?.groups ?? []).filter((g) => g.def).map((g) => g.max[0]);
  return [xs.length ? Math.max(...xs) + Math.max(1, s.corridor) : edge, edge];
}

/** `s` grown to hold its last group, estimated as one unit of its machine (the build refines it). */
function grownForNew(s: SiteState): SiteState {
  const g = s.groups[s.groups.length - 1];
  const def = g && getSiteDef(g.multiblockId);
  if (!def) return s;
  const max: [number, number] = [g.origin[0] + def.size[0], g.origin[1] + def.size[2]];
  return withGrownToFit(s, g.origin, max, Math.max(1, s.corridor));
}

export function addGroup(multiblockId: string): void {
  const s = get(site);
  const next = withGroupAdded(s, multiblockId, freeOrigin(s, get(siteBuild).build));
  if (next === s) return;
  site.set(grownForNew(next));
  siteGroup.set(next.groups[next.groups.length - 1].id);
}

/** The single-machine plan becomes a new group; the view switches to the site. */
export function addPlanToSite(): void {
  const s = get(site);
  const next = withPlanAdded(s, get(plan), freeOrigin(s, get(siteBuild).build));
  if (next === s) return;
  const id = next.groups[next.groups.length - 1].id;
  // Several units take more room than one: grow again once the group is built.
  growAfterBuild(id);
  site.set(grownForNew(next));
  siteGroup.set(id);
  appMode.set('site');
  notify(t.site.addedToSite);
}

export function arrange(): void {
  const s = get(site);
  const build = get(siteBuild).build;
  if (!build) return;
  let r = withArranged(s, localFootprints(build));
  // Too small for the arrangement: grow the template to what it needs (as far as it can grow).
  if (!r.fits) {
    const bigger = withSiteSize(
      s,
      Math.min(SITE_MAX_SIZE, Math.max(s.size[0], r.needed[0])),
      Math.min(SITE_MAX_SIZE, Math.max(s.size[1], r.needed[1])),
    );
    if (bigger !== s) r = withArranged(bigger, localFootprints(build));
  }
  const grown = r.site.size[0] !== s.size[0] || r.site.size[1] !== s.size[1];
  site.set(r.site);
  notify(
    r.fits
      ? grown
        ? t.site.arrangedGrown(r.site.size[0], r.site.size[1])
        : t.site.arranged
      : t.site.needs(r.needed[0], r.needed[1]),
    r.fits ? 6000 : 8000,
    'arrange',
    undoAction(),
  );
}
