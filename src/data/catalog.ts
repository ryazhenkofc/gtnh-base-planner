import type { MultiblockDef } from '../model/multiblock/types';
import { tierRank } from './tiers';

/** All multiblock definitions, loaded from `./multiblocks/*.json` at build time. */
const modules = import.meta.glob<MultiblockDef>('./multiblocks/*.json', { eager: true, import: 'default' });

/** Sorted by tier (Steam first, untiered last), then by name. */
export const catalog: readonly MultiblockDef[] = Object.values(modules).sort(
  (a, b) => tierRank(a.tier) - tierRank(b.tier) || a.name.localeCompare(b.name),
);

export function getMultiblock(id: string): MultiblockDef | undefined {
  return catalog.find((d) => d.id === id);
}

export const DEFAULT_MULTIBLOCK_ID = 'coke-oven';
