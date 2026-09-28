import { derived, writable } from 'svelte/store';
import {
  buildSiteFromGtnh,
  type GtnhProject,
  type ImportOptions,
  type ImportReport,
  type MachineChoice,
} from '../import/gtnhplanner';
import { createSiteBuilder, type SiteBuild, type SiteBuildOptions } from '../model/site/build';
import type { SiteState } from '../model/site/types';
import type { SceneModel } from '../model/types';
import { isolate, site, siteCables, sitePipes } from '../state/site';
import { connectBelow } from '../state/store';
import { withDimensions } from './dimensions';
import { warnOnce } from './notices';
import type { SiteWorkerRequest, SiteWorkerResponse } from './siteWorker';

export interface SiteResult {
  build: SiteBuild | null;
  error: string | null;
  /** The build has no pipes yet: they are routed once editing pauses (see `holdRouting`). */
  pending?: boolean;
}

/**
 * The built site; recomputes when the site or the pipe / cable toggles change (not on selection). Large
 * templates take seconds to pack and route, so the build runs in a worker: the last result stays on screen
 * (and `siteBusy` is true) until the new one arrives, with the groups shown before their pipes when routing
 * is slow. Changes made meanwhile are coalesced into one more build. Without workers (tests, old browsers,
 * a worker that fails to load) it builds right here. While the user moves groups (`holdRouting`), builds
 * skip routing: the groups follow at once and the pipes are routed when input has been quiet for a moment.
 */
export const siteBuild = writable<SiteResult>({ build: null, error: null }, () =>
  // Only while something shows the site (the machine view never builds it).
  derived([site, sitePipes, siteCables, connectBelow], (x) => x).subscribe(
    ([$site, $pipes, $cables, $below]) => request($site, { pipes: $pipes, cables: $cables, below: $below }),
  ),
);
/** A build has been running for a while for a site newer than the one shown. */
export const siteBusy = writable(false);

/** Quick builds do not flash the busy notice. */
const BUSY_DELAY_MS = 250;
let busyTimer: ReturnType<typeof setTimeout> | undefined;
function setBusy(on: boolean, now = false): void {
  if (on) {
    if (now) {
      clearTimeout(busyTimer);
      siteBusy.set(true);
    } else busyTimer ??= setTimeout(() => siteBusy.set(true), BUSY_DELAY_MS);
    return;
  }
  clearTimeout(busyTimer);
  busyTimer = undefined;
  siteBusy.set(false);
}

/** The builder used when there is no worker (shared with imports, so their packs are reused). */
let localBuilder: ReturnType<typeof createSiteBuilder> | null = null;
const here = () => (localBuilder ??= createSiteBuilder());
function buildHere(s: SiteState, opts: SiteBuildOptions, pending = false): SiteResult {
  try {
    return { build: here()(s, opts), error: null, pending };
  } catch (err) {
    warnOnce('buildSite', err);
    return { build: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** `pending`: a build without pipes while editing; the routed one follows. */
type BuildRequest = { site: SiteState; opts: SiteBuildOptions; pending: boolean };
type ImportResult = { site: SiteState; report: ImportReport };
interface PendingImport {
  project: GtnhProject;
  choices: Map<string, MachineChoice>;
  opts: ImportOptions;
  resolve: (r: ImportResult) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null = null;
let workerFailed = typeof Worker === 'undefined';
let nextId = 0;
/** What the worker is on, if anything. */
let inFlight: { id: number; build: BuildRequest } | { id: number; import: PendingImport } | null = null;
/** The newest build not sent yet (older ones are dropped). */
let queued: BuildRequest | null = null;

function importHere(imp: PendingImport): void {
  try {
    imp.resolve(buildSiteFromGtnh(imp.project, imp.choices, imp.opts, here()));
  } catch (err) {
    imp.reject(err instanceof Error ? err : new Error(String(err)));
  }
}

/** The worker cannot be used: finish what it was doing here, and build here from now on. */
function fallBack(err: unknown): void {
  warnOnce('siteWorker', err);
  worker?.terminate();
  worker = null;
  workerFailed = true;
  const was = inFlight;
  inFlight = null;
  if (was && 'import' in was) importHere(was.import);
  const req = queued ?? (was && 'build' in was ? was.build : null);
  queued = null;
  setBusy(false);
  if (req) siteBuild.set(buildHere(req.site, req.opts, req.pending));
}

/** Drops whatever the worker is doing (its result is no longer wanted). */
function stopWorker(): void {
  worker?.terminate();
  worker = null;
  const was = inFlight;
  inFlight = null;
  if (was && 'import' in was) was.import.reject(new Error('Import replaced by a newer one.'));
}

function startWorker(): Worker | null {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(new URL('./siteWorker.ts', import.meta.url), { type: 'module' });
  } catch (err) {
    fallBack(err);
    return null;
  }
  worker.onmessage = (e: MessageEvent<SiteWorkerResponse>) => {
    const msg = e.data;
    const job = inFlight;
    if (!job || msg.id !== job.id) return;
    if ('partial' in msg && msg.partial) {
      // Groups first; the routed build of the same request is still coming.
      if (!queued) siteBuild.set({ build: msg.build, error: null, pending: true });
      setBusy(true, true);
      return;
    }
    inFlight = null;
    if ('import' in job) {
      if ('imported' in msg) job.import.resolve(msg.imported);
      else job.import.reject(new Error('error' in msg ? msg.error : 'Import failed'));
    } else if ('error' in msg) {
      warnOnce('buildSite', msg.error);
      siteBuild.set({ build: null, error: msg.error });
    } else if ('build' in msg) siteBuild.set({ build: msg.build, error: null, pending: job.build.pending });
    sendQueued();
  };
  worker.onerror = (e) => {
    e.preventDefault();
    fallBack(e.message || 'Site worker failed');
  };
  worker.onmessageerror = () => fallBack('Site worker message could not be read');
  return worker;
}

function post(w: Worker, msg: SiteWorkerRequest): void {
  try {
    w.postMessage(msg);
  } catch (err) {
    // Not cloneable (should not happen: sites and projects are plain data).
    fallBack(err);
  }
}

function sendQueued(): void {
  if (!queued) {
    setBusy(false);
    return;
  }
  const w = startWorker();
  const req = queued;
  queued = null;
  if (!w) {
    siteBuild.set(buildHere(req.site, req.opts, req.pending));
    setBusy(false);
    return;
  }
  inFlight = { id: ++nextId, build: req };
  post(w, { id: inFlight.id, type: 'build', site: req.site, opts: req.opts });
}

/** Pipes are not routed while the user is editing; they follow this long after the last edit. */
export const ROUTE_IDLE_MS = 600;
let quietAt = 0;
let latest: { site: SiteState; opts: SiteBuildOptions } | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * The user is moving or turning something: until input has paused for ROUTE_IDLE_MS, builds place the
 * groups without routing (fast), and the last routed pipes stay on screen, faded.
 */
export function holdRouting(): void {
  quietAt = Date.now() + ROUTE_IDLE_MS;
}

function request(s: SiteState, opts: SiteBuildOptions): void {
  latest = { site: s, opts };
  clearTimeout(idleTimer);
  const wait = quietAt - Date.now();
  if ((opts.pipes || opts.cables) && wait > 0) {
    idleTimer = setTimeout(() => {
      if (latest) submit(latest.site, latest.opts, false);
    }, wait);
    submit(s, { ...opts, pipes: false, cables: false }, true);
    return;
  }
  submit(s, opts, false);
}

function submit(s: SiteState, opts: SiteBuildOptions, pending: boolean): void {
  if (workerFailed) {
    siteBuild.set(buildHere(s, opts, pending));
    return;
  }
  queued = { site: s, opts, pending };
  setBusy(true);
  // The worker is busy with a site that is gone (an import or an opened file replaced it): drop that build
  // rather than wait for it. Its group cache would not help the new site anyway.
  if (inFlight && 'build' in inFlight && replaced(inFlight.build.site, s)) stopWorker();
  if (inFlight === null) sendQueued();
}

/** Whether `next` shares fewer than half of its groups (same id, machine and count) with `prev`. */
function replaced(prev: SiteState, next: SiteState): boolean {
  const key = (g: SiteState['groups'][number]) => `${g.id}|${g.multiblockId}|${g.count}`;
  const old = new Set(prev.groups.map(key));
  const kept = next.groups.filter((g) => old.has(key(g))).length;
  return kept * 2 < Math.max(next.groups.length, prev.groups.length);
}

/**
 * Imports a GTNH Planner project into a new site (see `buildSiteFromGtnh`) in the build worker, so a large
 * chain does not freeze the page and the build that follows reuses the packed groups. The worker's current
 * job is dropped: the import replaces the site.
 */
export function importSite(
  project: GtnhProject,
  choices: Map<string, MachineChoice>,
  opts: ImportOptions,
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const imp: PendingImport = { project, choices, opts, resolve, reject };
    // Builds of the current site are no longer wanted either: the imported site replaces it.
    queued = null;
    if (inFlight) stopWorker();
    const w = workerFailed ? null : startWorker();
    if (!w) {
      importHere(imp);
      return;
    }
    inFlight = { id: ++nextId, import: imp };
    post(w, { id: inFlight.id, type: 'import', project, choices, opts });
  });
}

/** Pipes of the last routed build: shown faded while a pending build has none. */
let lastPipes: SceneModel['pipes'] = null;

/**
 * The scene with nets of every resource but the isolated one faded (cheap: no re-routing), and the
 * site's width and depth named beside its edges. While pipes wait for editing to pause, the last routed
 * ones are shown, all faded.
 */

export const siteScene = derived([siteBuild, isolate], ([$b, $iso]): SceneModel | null => {
  const scene = $b.build?.scene ?? null;
  if (!scene) return scene;
  if (!$b.pending) lastPipes = scene.pipes;
  else if (!scene.pipes && lastPipes) {
    const faded = lastPipes.map((p) => ({ ...p, dim: true }));
    return { ...(scene.site ? withDimensions(scene, [0, 0], scene.site.size, 0) : scene), pipes: faded };
  }
  const measured = scene.site ? withDimensions(scene, [0, 0], scene.site.size, 0) : scene;
  if (!scene.pipes) return measured;
  const nets = $b.build!.nets;
  const resourceOf = new Map(nets.map((n) => [n.id, n.resource]));
  return {
    ...measured,
    pipes: scene.pipes.map((p) => ({ ...p, dim: !!$iso && resourceOf.get(p.id ?? -1) !== $iso })),
  };
});
