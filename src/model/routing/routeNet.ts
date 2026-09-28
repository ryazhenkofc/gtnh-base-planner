import type { Dir, Vec3 } from '../core/types';
import type { HatchKind } from '../multiblock/types';

/** A routed pipe or cable network, as the renderer draws it. */

export interface RouteNet {
  kind: HatchKind;
  /** Polylines of pipe cells (centres at cell + 0.5). */
  paths: Vec3[][];
  /** Number of pipe blocks. */
  length: number;
  connected: number;
  total: number;
  /**
   * Side each connected hatch takes its pipe from. Hatches can be turned in game, so a pipe may reach a
   * hatch through any open side; this can differ from the face chosen when the hatch was placed.
   */
  attachments?: { cell: Vec3; face: Dir }[];
  /** Site view: net id (hatches with the same `net` get stubs to it), colour and faded look. */
  id?: number;
  color?: string;
  dim?: boolean;
  /** Site view: directed steps between neighbouring cells, for flow arrows. */
  flows?: [Vec3, Vec3][];
}
