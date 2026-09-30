import { writable } from 'svelte/store';
import { SORT_MODES, type SortMode } from '../model/bom';

const KEY = 'gtnh-planner:checklist';

function stored(): Set<string> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Keys of the required-blocks rows the user has ticked off; remembered per browser. */
export const checked = writable<Set<string>>(stored());
checked.subscribe((keys) => {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify([...keys]));
  } catch {
    // Not important enough to report.
  }
});

export function toggleChecked(key: string): void {
  checked.update((keys) => {
    const next = new Set(keys);
    if (!next.delete(key)) next.add(key);
    return next;
  });
}

export function clearChecked(): void {
  checked.set(new Set());
}

const SORT_KEY = 'gtnh-planner:blocks-sort';

function storedSort(): SortMode {
  try {
    const v = globalThis.localStorage?.getItem(SORT_KEY);
    return SORT_MODES.find((m) => m === v) ?? 'grouped';
  } catch {
    return 'grouped';
  }
}

/** How the required-blocks list is ordered; remembered per browser. */
export const sortMode = writable<SortMode>(storedSort());
sortMode.subscribe((mode) => {
  try {
    globalThis.localStorage?.setItem(SORT_KEY, mode);
  } catch {
    // Not important enough to report.
  }
});

/** Next order in the cycle grouped → most first → fewest first. */
export function cycleSort(): void {
  sortMode.update((m) => SORT_MODES[(SORT_MODES.indexOf(m) + 1) % SORT_MODES.length]);
}
