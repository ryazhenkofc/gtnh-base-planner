import { get, writable } from 'svelte/store';
import { t } from '../i18n/en';
import type { SiteState } from '../model/site/types';
import { site, siteGroup } from '../state/site';
import { notify, type NoticeAction } from './notices';

/**
 * Undo and redo for the template. Every change of the `site` store is a step, so imports, ARRANGE and
 * file loads can be undone like a move. Steps that share a `coalesce` key and follow each other quickly
 * (holding an arrow key, say) become one step.
 */

export const MAX_STEPS = 200;
/** Changes with the same coalesce key closer together than this are one undo step. */
export const COALESCE_MS = 1000;

export interface HistoryState<T> {
  past: T[];
  future: T[];
  /** The key and time of the last recorded change, for coalescing. */
  last: { key: string; at: number } | null;
}

export function emptyHistory<T>(): HistoryState<T> {
  return { past: [], future: [], last: null };
}

/** Record that the value changed from `prev`; `key` (optional) merges quick repeats into one step. */
export function recorded<T>(h: HistoryState<T>, prev: T, key: string | null, now: number): HistoryState<T> {
  if (key && h.last?.key === key && now - h.last.at < COALESCE_MS && h.past.length > 0)
    return { past: h.past, future: [], last: { key, at: now } };
  return {
    past: [...h.past, prev].slice(-MAX_STEPS),
    future: [],
    last: key ? { key, at: now } : null,
  };
}

export function undone<T>(h: HistoryState<T>, current: T): { history: HistoryState<T>; value: T } | null {
  if (h.past.length === 0) return null;
  const value = h.past[h.past.length - 1];
  return { history: { past: h.past.slice(0, -1), future: [...h.future, current], last: null }, value };
}

export function redone<T>(h: HistoryState<T>, current: T): { history: HistoryState<T>; value: T } | null {
  if (h.future.length === 0) return null;
  const value = h.future[h.future.length - 1];
  return { history: { past: [...h.past, current], future: h.future.slice(0, -1), last: null }, value };
}

// Store wiring

const history = writable<HistoryState<SiteState>>(emptyHistory());
export const canUndo = {
  subscribe: (fn: (v: boolean) => void) => history.subscribe((h) => fn(h.past.length > 0)),
};
export const canRedo = {
  subscribe: (fn: (v: boolean) => void) => history.subscribe((h) => fn(h.future.length > 0)),
};

let current: SiteState | null = null;
let applying = false;
let pendingKey: string | null = null;
let mergeNext = false;
let stop: (() => void) | null = null;

/** Start recording (after the stored template has loaded, so loading it is not a step). */
export function startSiteHistory(): () => void {
  stop?.();
  history.set(emptyHistory());
  current = null;
  const unsub = site.subscribe((next) => {
    const prev = current;
    current = next;
    const key = pendingKey;
    const merge = mergeNext;
    pendingKey = null;
    mergeNext = false;
    if (prev === null || prev === next || applying) return;
    // A follow-up of the last step (the site growing to fit it) is undone together with it.
    if (merge) return;
    history.update((h) => recorded(h, prev, key, Date.now()));
  });
  stop = () => {
    unsub();
    stop = null;
  };
  return stop;
}

/** The next change of the site is part of the last step (undo takes both back at once). */
export function mergeIntoLast(): void {
  mergeNext = true;
}

/** The next change of the site merges with the previous one if it has the same key and follows quickly. */
export function coalesceNext(key: string): void {
  pendingKey = key;
}

function apply(r: { history: HistoryState<SiteState>; value: SiteState } | null): boolean {
  if (!r) return false;
  history.set(r.history);
  applying = true;
  try {
    site.set(r.value);
  } finally {
    applying = false;
  }
  // A group that no longer exists cannot stay selected.
  const gid = get(siteGroup);
  if (gid && !r.value.groups.some((g) => g.id === gid)) siteGroup.set(null);
  return true;
}

export function undo(): boolean {
  return current ? apply(undone(get(history), current)) : false;
}

export function redo(): boolean {
  return current ? apply(redone(get(history), current)) : false;
}

/** Undo with a short notice saying what happened. */
export function undoSite(): void {
  notify(undo() ? t.site.undone : t.site.nothingToUndo, 2000, 'edit');
}

export function redoSite(): void {
  notify(redo() ? t.site.redone : t.site.nothingToRedo, 2000, 'edit');
}

/** The Undo link for a notice about a change that is easy to regret (ARRANGE, remove). */
export function undoAction(): NoticeAction {
  return { label: t.site.undo, run: undoSite };
}
