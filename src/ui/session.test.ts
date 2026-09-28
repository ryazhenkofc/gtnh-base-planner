import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { encodePlan } from '../share/codec';
import { encodeSite, emptySite } from '../share/siteCodec';
import { MODE_STORAGE_KEY } from '../share/sitePersist';
import { appMode } from '../state/site';
import { defaultPlan } from '../state/store';
import { initSession } from './session';
import { initSiteSession } from './siteSession';

vi.spyOn(console, 'warn').mockImplementation(() => {});

function stubBrowser(hash: string, mode: 'machine' | 'site') {
  const store = new Map<string, string>([[MODE_STORAGE_KEY, mode]]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  const location = { hash, pathname: '/', search: '', href: `http://localhost/${hash}` };
  vi.stubGlobal('location', location);
  vi.stubGlobal('history', {
    state: null,
    replaceState: (_s: unknown, _t: string, url: string) => {
      location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
    },
  });
}

/** Starts both sessions the way App.svelte's onMount does. */
async function start(): Promise<void> {
  await Promise.all([initSession(), initSiteSession()]);
}

describe('share links pick the view', () => {
  beforeEach(() => appMode.set('machine'));
  afterEach(() => vi.unstubAllGlobals());

  for (const mode of ['machine', 'site'] as const) {
    it(`a #p= link opens the machine view (last view: ${mode})`, async () => {
      stubBrowser(`#p=${await encodePlan(defaultPlan())}`, mode);
      await start();
      expect(get(appMode)).toBe('machine');
    });

    it(`a #s= link opens the template view (last view: ${mode})`, async () => {
      stubBrowser(`#s=${await encodeSite(emptySite())}`, mode);
      await start();
      expect(get(appMode)).toBe('site');
    });

    it(`no link keeps the last view (${mode})`, async () => {
      stubBrowser('', mode);
      await start();
      expect(get(appMode)).toBe(mode);
    });
  }
});
