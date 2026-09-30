import type { Side } from './buildTypes';
import type { Endpoint } from './types';

/** Ids and keys of things on a site. */

/** Unit ids on a site: group index × stride + the unit's id within its group (more than `COUNT_MAX`). */
export const GROUP_STRIDE = 10000;

export function groupIndexOfUnit(unitId: number): number {
  return Math.floor(unitId / GROUP_STRIDE);
}

/** Port blocks carry a unit id too (so they can be picked and dragged): this plus the port's index. */
export const PORT_UNIT_BASE = 1_000_000_000;

export function portUnitId(portIndex: number): number {
  return PORT_UNIT_BASE + portIndex;
}

/** The index in `SiteState.ports` a unit id stands for, or -1 when it is a group's unit. */
export function portIndexOfUnit(unitId: number): number {
  return unitId >= PORT_UNIT_BASE ? unitId - PORT_UNIT_BASE : -1;
}

export function endNode(resource: string, end: Endpoint, side: Side): string {
  return 'group' in end
    ? `${resource}\u0000g\u0000${end.group}\u0000${side}`
    : `${resource}\u0000p\u0000${end.port}`;
}
