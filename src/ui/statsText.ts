import { t } from '../i18n/en';
import type { PipelineResult } from './pipeline';

export interface StatsParts {
  main: string[];
  selected: string | null;
}

/** The quiet bottom line: units · blocks · shared walls · hatches · saved (+ conflicts, pipes, selection). */
export function statsParts(r: PipelineResult, selectedIds: number[]): StatsParts {
  const main: string[] = [];
  const units = r.pack?.units ?? [];
  if (r.pack) main.push(t.units(r.pack.placed));
  if (r.stats) {
    main.push(t.blocks(r.stats.totalBlocks));
    main.push(t.sharedWalls(r.stats.sharedWalls.length));
    main.push(t.hatchCount(r.stats.hatches));
    main.push(t.saved(r.stats.savedBlocks));
    if (r.stats.conflicts.length) main.push(t.conflicts(r.stats.conflicts.length));
  }
  if (r.pipes) main.push(t.pipeLength(r.pipes.reduce((s, n) => s + n.length, 0)));

  const nums = selectedIds
    .map((id) => units.findIndex((u) => u.id === id) + 1)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  return { main, selected: nums.length ? t.selected(nums) : null };
}
