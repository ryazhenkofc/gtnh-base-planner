import type { Side } from './buildTypes';
import type { Endpoint } from './types';

/** Ids and keys of things on a site. */

/** Unit ids on a site: group index × stride + the unit's id within its group (more than `COUNT_MAX`). */
export const GROUP_STRIDE = 10000;

export function groupIndexOfUnit(unitId: number): number {
  return Math.floor(unitId / GROUP_STRIDE);
}

export function endNode(resource: string, end: Endpoint, side: Side): string {
  return 'group' in end
    ? `${resource}\u0000g\u0000${end.group}\u0000${side}`
    : `${resource}\u0000p\u0000${end.port}`;
}
