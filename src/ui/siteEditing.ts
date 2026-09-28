import { get, writable } from 'svelte/store';
import { getSiteDef } from '../data/generic';
import { t } from '../i18n/en';
import type { SiteState } from '../model/site/types';
import type { Vec3 } from '../model/types';
import { site, siteGroup } from '../state/site';
import { type ArrowKey, screenStep } from './keys';
import { notify } from './notices';
import { freeOrigin } from './siteCommands';
import {
  updateSite,
  withGroupDuplicated,
  withGroupMoved,
  withGroupPatched,
  withGroupRemoved,
  withGroupRotated,
  withGrownToFit,
} from './siteActions';
import { coalesceNext, mergeIntoLast, undoAction } from './siteHistory';
import { holdRouting, siteBuild } from './sitePipeline';

/* Editing the selected template group: shared by the keyboard, the nudge pad and dragging in the view. */

/** Camera azimuth (`OrbitControls.theta`): arrows move the selected group as seen on screen. */
export const viewTheta = writable(Math.PI / 4);
/** Shift is held: moves step 5 blocks. */
export const shiftHeld = writable(false);
export const FAST_STEP = 5;

/** A request to aim the camera at a box (inclusive min, exclusive max); `seq` makes repeats distinct. */
export const frameRequest = writable<{ min: Vec3; max: Vec3; seq: number } | null>(null);
let frameSeq = 0;

/**
 * A group's ground footprint [x, z] in blocks, from the last build, for its current turn (the build may
 * still show an older one). Null before the group has been built.
 */
function footprintOf(s: SiteState, id: string): [number, number] | null {
  const g = s.groups.find((x) => x.id === id);
  const pg = get(siteBuild).build?.groups.find((x) => x.group.id === id);
  if (!g || !pg?.def || pg.group.multiblockId !== g.multiblockId) return null;
  const w = pg.max[0] - pg.min[0];
  const d = pg.max[2] - pg.min[2];
  return (g.rotation - pg.group.rotation) % 2 === 0 ? [w, d] : [d, w];
}

/** The site grown so group `id` (with footprint `fp`) is inside it, with a corridor around it. */
export function grownFor(s: SiteState, id: string, fp: [number, number] | null): SiteState {
  const g = s.groups.find((x) => x.id === id);
  if (!g || !fp) return s;
  const max: [number, number] = [g.origin[0] + fp[0], g.origin[1] + fp[1]];
  return withGrownToFit(s, g.origin, max, Math.max(1, s.corridor));
}

/** Apply `fn` to the site and grow it when group `id` ends up past an edge (one undo step). */
function editGroup(id: string, fn: (s: SiteState) => SiteState): void {
  updateSite((s) => {
    const next = fn(s);
    return next === s ? s : grownFor(next, id, footprintOf(next, id));
  });
}

let stopGrowWatch: (() => void) | null = null;
/**
 * The group's size is about to change (count, limits, height): once its new build arrives, grow the site
 * if the group no longer fits. The growth is part of the same undo step.
 */
export function growAfterBuild(id: string): void {
  stopGrowWatch?.();
  let done = false;
  const unsub = siteBuild.subscribe(($b) => {
    if (done || !$b.build) return;
    const s = get(site);
    const g = s.groups.find((x) => x.id === id);
    const pg = $b.build.groups.find((x) => x.group.id === id);
    if (!g) done = true;
    // Wait for the build of the group as it is now.
    else if (pg && JSON.stringify(pg.group) === JSON.stringify(g)) {
      done = true;
      const next = grownFor(s, id, footprintOf(s, id));
      if (next !== s) {
        mergeIntoLast();
        site.set(next);
      }
    }
    // Unsubscribing inside the first, synchronous call is not possible yet: do it right after.
    if (done) queueMicrotask(() => stop());
  });
  const stop = () => {
    unsub();
    if (stopGrowWatch === stop) stopGrowWatch = null;
  };
  stopGrowWatch = stop;
}

/** Set the selected group's X (`axis` 0) or Z (1) corner, growing the site if it leaves it. */
export function setSelectedOrigin(axis: 0 | 1, n: number): void {
  const gid = selectedId();
  const g = gid ? get(site).groups.find((x) => x.id === gid) : undefined;
  if (!gid || !g) return;
  const o: [number, number] = [...g.origin];
  o[axis] = n;
  holdRouting();
  editGroup(gid, (s) => withGroupPatched(s, gid, { origin: o }));
}

function selectedId(): string | null {
  const gid = get(siteGroup);
  return gid && get(site).groups.some((g) => g.id === gid) ? gid : null;
}

export function groupName(id: string): string {
  const g = get(site).groups.find((x) => x.id === id);
  return g?.label ?? (g && getSiteDef(g.multiblockId)?.name) ?? id;
}

/**
 * Move the selected group by whole blocks along the site axes. With `coalesce` (key presses), quick
 * repeats are one undo step; a drag is always its own step.
 */
export function moveSelectedBy(dx: number, dz: number, coalesce = true): void {
  const gid = selectedId();
  if (!gid || (dx === 0 && dz === 0)) return;
  if (coalesce) coalesceNext(`move:${gid}`);
  holdRouting();
  editGroup(gid, (s) => withGroupMoved(s, gid, dx, dz));
}

/** Move the selected group one step (or `FAST_STEP`) in the screen direction of an arrow key. */
export function moveSelected(key: ArrowKey, fast: boolean): void {
  const [dx, dz] = screenStep(key, get(viewTheta));
  const n = fast ? FAST_STEP : 1;
  moveSelectedBy(dx * n, dz * n);
}

export function rotateSelected(dir: 1 | -1): void {
  const gid = selectedId();
  if (!gid) return;
  coalesceNext(`turn:${gid}`);
  holdRouting();
  editGroup(gid, (s) => withGroupRotated(s, gid, dir));
}

export function duplicateSelected(): void {
  const gid = selectedId();
  if (!gid) return;
  const s = get(site);
  const dup = withGroupDuplicated(s, gid, freeOrigin(s, get(siteBuild).build));
  if (dup === s) return;
  const id = dup.groups[dup.groups.length - 1].id;
  site.set(grownFor(dup, id, footprintOf(s, gid)));
  siteGroup.set(id);
  notify(t.site.duplicated, 3000, 'edit', undoAction());
}

/** Remove the selected group at once; the notice offers Undo. */
export function removeSelected(): void {
  const gid = selectedId();
  if (!gid) return;
  const name = groupName(gid);
  siteGroup.set(null);
  updateSite((s) => withGroupRemoved(s, gid));
  notify(t.site.removed(name), 6000, 'edit', undoAction());
}

/** Aim the camera at the selected group (or do nothing when it is not built yet). */
export function frameSelected(): void {
  const gid = selectedId();
  const g = get(siteBuild).build?.groups.find((x) => x.group.id === gid);
  if (!g) return;
  frameRequest.set({ min: g.min, max: g.max, seq: ++frameSeq });
}
