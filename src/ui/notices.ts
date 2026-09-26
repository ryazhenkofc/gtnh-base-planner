import { writable } from 'svelte/store';

/** Short, quiet messages shown above the stats line. */
export interface Notice {
  id: number;
  text: string;
  /** Notices sharing a slot replace each other (e.g. the latest layout warning only). */
  slot?: string;
}

export const notices = writable<Notice[]>([]);

let nextId = 1;

export function dismissNotice(id: number): void {
  notices.update((list) => list.filter((n) => n.id !== id));
}

/**
 * Show `text` for `ms` milliseconds (0 = until dismissed). The same text is never shown twice at once,
 * and a notice with a `slot` replaces the previous notice in that slot.
 */
export function notify(text: string, ms = 4000, slot?: string): void {
  const id = nextId++;
  notices.update((list) =>
    [...list.filter((n) => n.text !== text && (!slot || n.slot !== slot)), { id, text, slot }].slice(-3),
  );
  if (ms > 0) setTimeout(() => dismissNotice(id), ms);
}

/** Remove the notice in `slot`, if any (its warning no longer applies). */
export function clearSlot(slot: string): void {
  notices.update((list) => (list.some((n) => n.slot === slot) ? list.filter((n) => n.slot !== slot) : list));
}

const warned = new Set<string>();

/** `console.warn` once per distinct message (stubbed modules would otherwise spam the console). */
export function warnOnce(context: string, err: unknown): void {
  const msg = `${context}: ${err instanceof Error ? err.message : String(err)}`;
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg);
}
