import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** A `localStorage` that lives in a Map, so the store can be loaded fresh against known contents. */
function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
  return data;
}

async function load() {
  vi.resetModules();
  return import('./checklist');
}

afterEach(() => vi.unstubAllGlobals());

describe('checklist', () => {
  it('starts empty, ticks and unticks rows, and clears them all', async () => {
    stubStorage();
    const c = await load();
    expect([...get(c.checked)]).toEqual([]);
    c.toggleChecked('block:a');
    c.toggleChecked('io:item');
    expect([...get(c.checked)].sort()).toEqual(['block:a', 'io:item']);
    c.toggleChecked('block:a');
    expect([...get(c.checked)]).toEqual(['io:item']);
    c.clearChecked();
    expect(get(c.checked).size).toBe(0);
  });

  it('remembers ticks across reloads', async () => {
    const data = stubStorage();
    const first = await load();
    first.toggleChecked('block:a');
    expect(JSON.parse(data.get('gtnh-planner:checklist')!)).toEqual(['block:a']);
    const second = await load();
    expect([...get(second.checked)]).toEqual(['block:a']);
  });

  it('ignores stored data it cannot read', async () => {
    stubStorage({ 'gtnh-planner:checklist': '{nope' });
    expect(get((await load()).checked).size).toBe(0);
    stubStorage({ 'gtnh-planner:checklist': '["a", 3, null, "b"]' });
    expect([...get((await load()).checked)]).toEqual(['a', 'b']);
  });

  it('still works when the browser has no storage', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const c = await load();
    c.toggleChecked('block:a');
    expect(get(c.checked).has('block:a')).toBe(true);
  });
});

describe('sort order', () => {
  it('cycles grouped, most first, fewest first and back', async () => {
    stubStorage();
    const c = await load();
    expect(get(c.sortMode)).toBe('grouped');
    c.cycleSort();
    expect(get(c.sortMode)).toBe('most');
    c.cycleSort();
    expect(get(c.sortMode)).toBe('fewest');
    c.cycleSort();
    expect(get(c.sortMode)).toBe('grouped');
  });

  it('is remembered across reloads, and an unknown stored value means grouped', async () => {
    const data = stubStorage();
    const first = await load();
    first.cycleSort();
    expect(data.get('gtnh-planner:blocks-sort')).toBe('most');
    expect(get((await load()).sortMode)).toBe('most');
    stubStorage({ 'gtnh-planner:blocks-sort': 'sideways' });
    expect(get((await load()).sortMode)).toBe('grouped');
  });
});
