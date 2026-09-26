import { writable } from 'svelte/store';
import { DEFAULT_MULTIBLOCK_ID, getMultiblock } from '../data/catalog';
import type { PlanState, ViewMode } from '../model/types';

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
export const selectedUnits = writable<number[]>([]);
