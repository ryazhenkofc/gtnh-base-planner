import { describe, expect, it } from 'vitest';
import type { SiteState } from '../model/site/types';
import {
  decodeSite,
  emptySite,
  encodeSite,
  siteFromJson,
  siteToJson,
  sitesEqual,
  validateSiteState,
} from './siteCodec';
import {
  clearSiteHash,
  hashSiteParam,
  loadStoredSite,
  saveStoredSite,
  SITE_STORAGE_KEY,
} from './sitePersist';

function sample(): SiteState {
  return {
    ...emptySite(),
    name: 'Steel line',
    groups: [
      {
        id: 'ebf',
        multiblockId: 'electric-blast-furnace',
        count: 3,
        limits: { x: null, y: 1, z: null },
        enabledHatches: ['muffler', 'energy', 'maintenance'],
        origin: [4, 4],
        rotation: 1,
        source: { name: 'Steel Ingot', machineCount: 2.4, tier: 'MV' },
      },
      {
        id: 'dt',
        multiblockId: 'distillation-tower',
        count: 1,
        limits: { x: null, y: null, z: null },
        enabledHatches: [],
        origin: [14, 4],
        rotation: 0,
        size: 7,
      },
    ],
    ports: [{ id: 'p1', dir: 'in', resource: 'item:dust' }],
    links: [
      { id: 'l1', from: { port: 'p1' }, to: { group: 'ebf' }, resource: 'item:dust', rate: 1.5 },
      { id: 'l2', from: { group: 'ebf' }, to: { group: 'dt' }, resource: 'item:dust' },
    ],
    resources: { 'item:dust': { kind: 'item', name: 'Steel Dust', color: '#AABBCC' } },
  };
}

describe('validateSiteState', () => {
  it('accepts a valid site and normalises it', () => {
    const s = validateSiteState(sample());
    expect(s.groups[0].enabledHatches).toEqual(['energy', 'maintenance', 'muffler']);
    expect(s.resources['item:dust'].color).toBe('#aabbcc');
    expect(s.groups[1].size).toBe(7);
  });

  it('rejects broken references and wrong port directions', () => {
    const bad1 = sample();
    bad1.links[1].to = { group: 'nope' };
    expect(() => validateSiteState(bad1)).toThrow(/unknown group/);
    const bad2 = sample();
    bad2.links[0] = { id: 'l1', from: { group: 'ebf' }, to: { port: 'p1' }, resource: 'item:dust' };
    expect(() => validateSiteState(bad2)).toThrow(/wrong way/);
    const bad3 = sample();
    bad3.links[0].resource = 'item:other';
    expect(() => validateSiteState(bad3)).toThrow(/unknown resource/);
    const bad4 = sample();
    bad4.groups[1].id = 'ebf';
    expect(() => validateSiteState(bad4)).toThrow(/used twice/);
    expect(() => validateSiteState({ ...sample(), kind: 'plan' })).toThrow(/not a site/);
    expect(() => validateSiteState({ ...sample(), size: [4, 30] })).toThrow(/Site size/);
  });

  it('round-trips through JSON and links', async () => {
    const s = validateSiteState(sample());
    expect(siteFromJson(siteToJson(s))).toEqual(s);
    const code = await encodeSite(s);
    expect(code.length).toBeLessThan(1200);
    expect(await decodeSite(code)).toEqual(s);
    expect(sitesEqual(s, sample())).toBe(true);
  });
});

describe('site persistence', () => {
  function memory(): Storage {
    const m = new Map<string, string>();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => void m.set(k, v),
      removeItem: (k) => void m.delete(k),
      key: (i) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
      clear: () => m.clear(),
    };
  }

  it('saves, loads and keeps unreadable copies', () => {
    const st = memory();
    expect(saveStoredSite(sample(), st)).toBe(true);
    expect(loadStoredSite(st)?.name).toBe('Steel line');
    st.setItem(SITE_STORAGE_KEY, '{"broken":');
    expect(loadStoredSite(st, () => 5)).toBeNull();
    expect(st.getItem(`${SITE_STORAGE_KEY}:backup-5`)).toBe('{"broken":');
  });

  it('reads and clears only its own hash parameter', () => {
    expect(hashSiteParam('#p=abc&s=xyz')).toBe('xyz');
    let url = '';
    clearSiteHash({
      location: { hash: '#p=abc&s=xyz', pathname: '/x/', search: '', href: '' },
      history: {
        state: null,
        replaceState: (_s: unknown, _t: string, u?: string | URL | null) => void (url = String(u)),
      },
    });
    expect(url).toBe('/x/#p=abc');
  });
});
