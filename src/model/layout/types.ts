import type { Vec3 } from '../core/types';
import type { PackResult } from '../plan/types';

/** Internal types of the layout packer (see `packer.ts`). */

export interface Shape {
  size: Vec3;
  grid: Int32Array;
  /** Cell right in front of the controller (relative to the unit origin), which must stay free. */
  front: Vec3 | null;
}

/**
 * Spacing along one axis: unit i sits at floor(i / 2) * (inner + outer) + (i % 2) * inner.
 * Uniform spacing has inner === outer.
 */
export interface Spacing {
  inner: number;
  outer: number;
}

/** A rotation parity plus a spacing per axis, with what the axis-aligned neighbour checks allow. */
export interface Mode {
  parity: 0 | 1;
  size: Vec3;
  spacing: [Spacing, Spacing, Spacing];
  /** Most units per axis under the best rotation pattern (Infinity = unbounded). */
  pairCaps: Vec3;
  /** Uses a two-block gap or walkway somewhere: only for routed layouts (see `loosenings`). */
  wide: boolean;
  seq: number;
}

export interface DefCache {
  shapes: Shape[];
  pairs: Map<string, boolean>;
  modes: Mode[] | null;
  results: Map<string, PackResult>;
}

/** Fill orders: which horizontal axis fills fastest (height is always filled last, bottom-up). */
export type Order = 'xzy' | 'zxy';

export interface Candidate {
  mode: Mode;
  counts: Vec3;
  /** Lattice cells actually used along each axis. */
  used: Vec3;
  order: Order;
  faces: number;
  height: number;
  area: number;
  squareness: number;
  seq: number;
}
