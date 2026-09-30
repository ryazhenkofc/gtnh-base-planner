import { get } from 'svelte/store';
import { getSiteDef } from '../data/generic';
import { t } from '../i18n/en';
import type { SiteBuild } from '../model/site/buildTypes';
import type { SiteState } from '../model/site/types';
import { appMode, site, siteGroup } from '../state/site';
import { connectBelow, plan } from '../state/store';
import { notify } from './notices';
import { withGroupAdded, withGrownToFit, withPlanAdded } from './siteActions';
import { growAfterBuild } from './siteEditing';
import { undoAction } from './siteHistory';
import { arrangeInSize, siteBuild } from './sitePipeline';

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

/**
 * Arranges the groups along the flow inside the template's own size: what is too wide for the ground goes on
 * floors above it, and a group bigger than the ground stacks its machines up. The size is never changed. It
 * runs in the build worker, as a big template takes seconds to measure.
 */
export async function arrange(): Promise<void> {
  const s = get(site);
  if (!s.groups.length) return;
  notify(t.site.arranging, 120000, 'arrange');
  let r;
  try {
    r = await arrangeInSize(s, get(connectBelow));
  } catch {
    // Replaced by a newer job (an import, say): that one reports for itself.
    return;
  }
  // The template was edited while it was being arranged: the result no longer fits it.
  if (get(site) !== s) return;
  site.set(r.site);
  notify(
    r.fits
      ? r.floors > 1
        ? t.site.arrangedFloors(r.floors)
        : t.site.arranged
      : t.site.needs(r.needed[0], r.needed[1]),
    r.fits ? 6000 : 8000,
    'arrange',
    undoAction(),
  );
}
