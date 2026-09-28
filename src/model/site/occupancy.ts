import { controllerFacing, key, step, unitCells } from '../geometry';
import type { Vec3 } from '../core/types';
import type { PlacedGroup, SiteWarning } from './buildTypes';
import type { SiteState } from './types';

/** Which cells the placed groups take, and where they collide with each other or leave the site. */
export interface SiteOccupancy {
  /** Cell key -> index of the group there (-1 for a port), and whether that group needs the cell as air. */
  occ: Map<string, { gi: number; air: boolean }>;
  /** Cells two groups both need (or a group needs outside the site): drawn as conflicts. */
  conflictCells: Set<string>;
  /** Every structure cell, for the router. */
  solids: Vec3[];
  /** Cells no pipe may take, e.g. in front of each controller. */
  keepFree: Vec3[];
  warnings: SiteWarning[];
}

export function analyzeOccupancy(site: SiteState, groups: readonly PlacedGroup[]): SiteOccupancy {
  const [w, d] = site.size;
  const occ = new Map<string, { gi: number; air: boolean }>();
  const conflictCells = new Set<string>();
  const overlapPairs = new Set<string>();
  const outside = new Set<number>();
  const solids: Vec3[] = [];
  const keepFree: Vec3[] = [];
  for (const pg of groups) {
    if (!pg.def) continue;
    for (const u of pg.units) {
      for (const c of unitCells(pg.def, u)) {
        const k = key(c.pos);
        const air = c.role === 'air';
        solids.push(c.pos);
        if (c.pos[0] < 0 || c.pos[2] < 0 || c.pos[0] >= w || c.pos[2] >= d) {
          outside.add(pg.index);
          if (!air) conflictCells.add(k);
        }
        const prev = occ.get(k);
        if (!prev) occ.set(k, { gi: pg.index, air });
        else if (prev.gi !== pg.index && !(prev.air && air)) {
          conflictCells.add(k);
          const a = site.groups[Math.min(prev.gi, pg.index)].id;
          const b = site.groups[Math.max(prev.gi, pg.index)].id;
          overlapPairs.add(`${a}\u0000${b}`);
        }
      }
      keepFree.push(
        step(
          unitCells(pg.def, u).find((c) => c.role === 'controller')?.pos ?? u.origin,
          controllerFacing(pg.def, u),
        ),
      );
    }
  }
  const warnings: SiteWarning[] = [];
  for (const gi of outside) warnings.push({ type: 'outside', group: site.groups[gi].id });
  for (const p of overlapPairs) {
    const [a, b] = p.split('\u0000');
    warnings.push({ type: 'overlap', groups: [a, b] });
  }
  return { occ, conflictCells, solids, keepFree, warnings };
}
