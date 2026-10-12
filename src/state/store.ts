import { writable } from 'svelte/store';
import { DEFAULT_MULTIBLOCK_ID, getMultiblock } from '../data/catalog';
import type { TextureSet, ViewMode } from '../model/core/types';
import type { PlanState } from '../model/plan/types';

export function defaultPlan(multiblockId = DEFAULT_MULTIBLOCK_ID): PlanState {
  const def = getMultiblock(multiblockId);
  return {
    v: 1,
    multiblockId,
    count: 4,
    limits: { x: null, y: null, z: null },
    enabledHatches: def ? [...def.defaultHatches] : [],
    colors: {},
  };
}

export const plan = writable<PlanState>(defaultPlan());
/** Always DETAILED in the app; the renderer falls back to SIMPLE when the textures cannot load. */
export const viewMode = writable<ViewMode>('detailed');
export const showPipes = writable(false);
export const showCables = writable(false);
export const xray = writable(false);
const TEXTURES_KEY = 'gtnh-planner:textures';
export const textureSet = writable<TextureSet>(storedTextureSet());

function storedTextureSet(): TextureSet {
  try {
    return globalThis.localStorage?.getItem(TEXTURES_KEY) === 'modernity' ? 'modernity' : 'classic';
  } catch {
    return 'classic';
  }
}
textureSet.subscribe((set) => {
  try {
    globalThis.localStorage?.setItem(TEXTURES_KEY, set);
  } catch {
    // Not important enough to report.
  }
});

const BELOW_KEY = 'gtnh-planner:below';

function storedBelow(): boolean {
  try {
    return globalThis.localStorage?.getItem(BELOW_KEY) !== '0';
  } catch {
    return true;
  }
}

/**
 * Hatches may face down from a build's lowest layer and pipes may run in the layer under it (a trench), in
 * the machine and template views alike. On by default; remembered per browser.
 */
export const connectBelow = writable(storedBelow());
connectBelow.subscribe((on) => {
  try {
    globalThis.localStorage?.setItem(BELOW_KEY, on ? '1' : '0');
  } catch {
    // Not important enough to report.
  }
});
export const selectedUnits = writable<number[]>([]);
