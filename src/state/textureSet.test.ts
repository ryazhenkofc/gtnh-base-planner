import { afterEach, describe, expect, it, vi } from 'vitest';

const TEXTURES_KEY = 'gtnh-planner:textures';

/** A fresh copy of the store module over a fake localStorage holding `saved`. */
async function load(saved?: string) {
  const data = new Map<string, string>(saved === undefined ? [] : [[TEXTURES_KEY, saved]]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
  vi.resetModules();
  const mod = await import('./store');
  return { ...mod, data };
}

afterEach(() => vi.unstubAllGlobals());

describe('texture set', () => {
  it('is Modernity until the person chooses the classic one', async () => {
    const fresh = await load();
    let set = '';
    fresh.textureSet.subscribe((v) => (set = v))();
    expect(set).toBe('modernity');
    expect((await load('classic')).data.get(TEXTURES_KEY)).toBe('classic');
  });

  it('keeps a saved classic choice', async () => {
    const { textureSet } = await load('classic');
    let set = '';
    textureSet.subscribe((v) => (set = v))();
    expect(set).toBe('classic');
  });

  it('does not save the classic fallback', async () => {
    const { useClassicTextures, textureSet, data } = await load();
    expect(data.get(TEXTURES_KEY)).toBe('modernity');
    useClassicTextures();
    let set = '';
    textureSet.subscribe((v) => (set = v))();
    expect(set).toBe('classic');
    expect(data.get(TEXTURES_KEY)).toBe('modernity');
  });
});
