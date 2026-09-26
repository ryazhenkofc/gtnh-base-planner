import type { HatchKind, PlanLimits, Rotation } from '../types';

/**
 * A site: several groups of multiblocks placed on a bounded ground area, with links that carry one
 * resource from one group (or boundary port) to another. Each group is what a single-machine plan is
 * today: `count` units of one multiblock, packed with the same packer.
 *
 * Coordinates: X = east, Z = south, like the rest of the app. The site covers cells `0 <= x < size[0]`,
 * `0 <= z < size[1]`; everything stands on y = 0.
 */

export type ResourceKind = 'item' | 'fluid' | 'power';

export interface ResourceDef {
  kind: ResourceKind;
  /** Display name, e.g. "Nitrogen Gas". */
  name: string;
  /** `#rrggbb`, used for pipes, hatch markers and the legend. */
  color: string;
}

export interface SiteGroup {
  /** Stable id within the site (`[a-z0-9_-]`), used by links. */
  id: string;
  /** Display name override; defaults to the multiblock name. */
  label?: string;
  /** Catalog id, or a generic id from `src/data/generic.ts` (single-block machine, placeholder). */
  multiblockId: string;
  count: number;
  limits: PlanLimits;
  /** Height / length of a resizable multiblock (see `PlanState.size`). */
  size?: number;
  /**
   * Non-IO hatch kinds to place (energy, maintenance, muffler, dynamo). Item, fluid and steam hatches come
   * from the links that touch the group: one hatch per resource.
   */
  enabledHatches: HatchKind[];
  /** Min corner of the group's (rotated) bounding box on the site: [x, z]. */
  origin: [number, number];
  /** Quarter turns clockwise of the whole group, around its bounding box. */
  rotation: Rotation;
  /** Where an imported group came from (shown in labels and the group list). */
  source?: { name: string; machineCount?: number; tier?: string };
}

/** One end of a link: a group, or a port on the site boundary. */
export type Endpoint = { group: string } | { port: string };

export interface SiteLink {
  id: string;
  from: Endpoint;
  to: Endpoint;
  /** Key into `SiteState.resources`. */
  resource: string;
  /** Per second (items/s, L/s or EU/t), when known. */
  rate?: number;
}

/**
 * A boundary port: where a resource enters the site (`in`, e.g. an ME interface or a tank) or leaves it
 * (`out`). Without `pos` the port is placed automatically on the west (`in`) or east (`out`) edge.
 */
export interface SitePort {
  id: string;
  dir: 'in' | 'out';
  resource: string;
  /** Explicit [x, z] cell inside the site. */
  pos?: [number, number];
  /** An `out` port that destroys what it gets (trash can, void). */
  void?: boolean;
}

export interface SiteState {
  v: 1;
  kind: 'site';
  name?: string;
  /** [width along X, depth along Z] in blocks. */
  size: [number, number];
  /** Free blocks the arranger keeps between groups for pipes. */
  corridor: number;
  groups: SiteGroup[];
  links: SiteLink[];
  ports: SitePort[];
  resources: Record<string, ResourceDef>;
  /** Hatch colour overrides, as in `PlanState.colors`. */
  colors: Partial<Record<HatchKind, string>>;
}

export function isGroupEnd(e: Endpoint): e is { group: string } {
  return 'group' in e;
}

export function endpointKey(e: Endpoint): string {
  return isGroupEnd(e) ? `g:${e.group}` : `p:${e.port}`;
}
