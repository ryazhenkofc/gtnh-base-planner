import type { PlanState } from '../model/plan/types';
import * as codec from '../share/codec';
import * as persist from '../share/persist';

/**
 * Optional helpers from the share unit that may not exist in every checkout of `src/share/*`.
 * Looked up by name at run time so this file type-checks either way; callers fall back when missing.
 */
export interface OptionalShareApi {
  plansEqual?: (a: PlanState, b: PlanState) => boolean;
  planHashUrl?: (state: PlanState) => Promise<string>;
  downloadPlanJson?: (state: PlanState, name?: string) => void;
  readPlanFile?: (file: File) => Promise<PlanState>;
}

const modules = [persist, codec] as unknown as Record<string, unknown>[];

function lookup<K extends keyof OptionalShareApi>(name: K): OptionalShareApi[K] {
  for (const m of modules) {
    const fn = m[name];
    if (typeof fn === 'function') return fn as OptionalShareApi[K];
  }
  return undefined;
}

export const shareApi: OptionalShareApi = {
  plansEqual: lookup('plansEqual'),
  planHashUrl: lookup('planHashUrl'),
  downloadPlanJson: lookup('downloadPlanJson'),
  readPlanFile: lookup('readPlanFile'),
};
