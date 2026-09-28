import { get, writable } from 'svelte/store';
import { getSiteDef } from '../data/generic';
import { t } from '../i18n/en';
import type { Vec3 } from '../model/types';
import { site, siteGroup } from '../state/site';
import { type ArrowKey, screenStep } from './keys';
import { notify } from './notices';
import { freeOrigin } from './siteCommands';
import {
  updateSite,
  withGroupDuplicated,
  withGroupMoved,
  withGroupRemoved,
  withGroupRotated,
} from './siteActions';
import { coalesceNext, undoAction } from './siteHistory';
import { siteBuild } from './sitePipeline';

/* Editing the selected template group: shared by the keyboard, the nudge pad and dragging in the view. */

/** Camera azimuth (`OrbitControls.theta`): arrows move the selected group as seen on screen. */
export const viewTheta = writable(Math.PI / 4);
/** Shift is held: moves step 5 blocks. */
export const shiftHeld = writable(false);
export const FAST_STEP = 5;

/** A request to aim the camera at a box (inclusive min, exclusive max); `seq` makes repeats distinct. */
export const frameRequest = writable<{ min: Vec3; max: Vec3; seq: number } | null>(null);
let frameSeq = 0;

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
  updateSite((s) => withGroupMoved(s, gid, dx, dz));
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
  updateSite((s) => withGroupRotated(s, gid, dir));
}

export function duplicateSelected(): void {
  const gid = selectedId();
  if (!gid) return;
  const s = get(site);
  const next = withGroupDuplicated(s, gid, freeOrigin(s, get(siteBuild).build));
  if (next === s) return;
  site.set(next);
  siteGroup.set(next.groups[next.groups.length - 1].id);
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
