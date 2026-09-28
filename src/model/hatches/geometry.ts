import type { Dir, Vec3 } from '../core/types';
import { FACE_ORDER } from './constants';

/** Face and cell helpers of hatch placement. */

/**
 * The axis lines along the face through the empty cell `front` in front of a hatch face looking `dir` (a
 * line along `dir` itself runs into the structure), where `open(d)` says the cell next to `front` towards
 * `d` is open: a line only counts when it is open on both sides, so a pipe can run along it (a front in a
 * recess, walled in along the line, has none). Hatches of one kind whose fronts share such a line and a
 * direction take one straight pipe or cable.
 */
export function lineKeys(front: Vec3, dir: Dir, open: (d: Dir) => boolean): string[] {
  const [x, y, z] = front;
  const out: string[] = [];
  if (dir !== 'east' && dir !== 'west' && open('east') && open('west')) out.push(`${dir}|x|${y}|${z}`);
  if (dir !== 'up' && dir !== 'down' && open('up') && open('down')) out.push(`${dir}|y|${x}|${z}`);
  if (dir !== 'north' && dir !== 'south' && open('north') && open('south')) out.push(`${dir}|z|${x}|${y}`);
  return out;
}

/** 0 for a face rank that looks into open space, 1 for one into a gap or recess (see `Site.faces`). */
export function openRank(rank: number): number {
  return rank < FACE_ORDER.length ? 0 : 1;
}

/** Compare two cells: y, then z, then x (bottom-up, north-to-south, west-to-east). */
export function comparePos(a: Vec3, b: Vec3): number {
  return a[1] - b[1] || a[2] - b[2] || a[0] - b[0];
}
