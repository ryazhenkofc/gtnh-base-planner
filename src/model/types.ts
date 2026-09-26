/**
 * Shared contracts for the whole app. Units of work import from here; change only additively.
 *
 * Coordinate system (same as Minecraft and three.js): X = east, Y = up, Z = south.
 * A `Vec3` is `[x, y, z]` in whole blocks. Local multiblock coords run from 0 to size-1 on each axis.
 */

export type Vec3 = readonly [number, number, number];

/** Face / direction. `north` = -Z, `south` = +Z, `east` = +X, `west` = -X, `up` = +Y, `down` = -Y. */
export type Dir = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
export type HorizontalDir = 'north' | 'south' | 'east' | 'west';

/** Quarter turns clockwise around +Y when seen from above (east -> south -> west -> north). */
export type Rotation = 0 | 1 | 2 | 3;

/**
 * Kinds of hatches/buses a multiblock can take. Coke Oven uses one hatch block in 3 modes. `steamIn` is the
 * steam input hatch of steam multiblocks, kept apart from `fluidIn` because both can be on one machine.
 */
export type HatchKind =
  'itemIn' | 'itemOut' | 'fluidIn' | 'fluidOut' | 'energy' | 'dynamo' | 'maintenance' | 'muffler' | 'steamIn';

export type ViewMode = 'simple' | 'detailed';

/** One character of a structure drawing. */
export interface LegendEntry {
  /** Block id from `src/data/blocks.ts`. */
  blockId: string;
  /** Hatch kinds that may replace this block. Omitted = no hatches here. */
  hatches?: HatchKind[];
  /**
   * Sides (local frame) a hatch of the given kind must not face here, e.g. GT's `disallowOnly(UP, DOWN)`
   * for Distillation Tower layer outputs.
   */
  disallowFaces?: Partial<Record<HatchKind, Dir[]>>;
  /** Region this cell belongs to, for `HatchRequirement.regions` (e.g. one per Distillation Tower layer). */
  region?: string;
}

export interface HatchRequirement {
  min: number;
  max?: number;
  /**
   * Regions (see `LegendEntry.region`) that each need at least one hatch of this kind per unit, e.g. an
   * output hatch on every Distillation Tower layer, or Oil Cracker inputs on a side and in the middle.
   */
  regions?: string[];
}

/**
 * How a multiblock grows along one local axis (GT `beginVariableStructureBlock`), e.g. Distillation Tower
 * height or Assembly Line length. The JSON holds the smallest form (`size[axis] === min`), with one copy of
 * the repeating slab `[from, to)`; a size of `n` inserts `(n - min) / (to - from)` more copies right after
 * it (see `sizedDef` in `src/model/resize.ts`). A slab cell with a `region` gets a numbered region per copy
 * (`layer` -> `layer1`, `layer2`, ...), and `requiredHatches.*.regions` naming it expand to match.
 */
export interface ResizeRule {
  axis: 'x' | 'y' | 'z';
  /** First local index of the repeating slab. */
  from: number;
  /** One past its last local index. */
  to: number;
  /** Smallest and largest total size along `axis`; `min` is the size in the JSON. */
  min: number;
  max: number;
  /** Size a new plan starts with. */
  default: number;
  /** What the size is called in the UI. */
  label: 'height' | 'length';
}

/**
 * A multiblock definition (one JSON file in `src/data/multiblocks/`).
 *
 * `layers[y][z]` is a string of length `size[0]`; character `x` is the cell at local (x, y, z).
 * Reserved characters: `~` controller, `-` must stay air, ` ` (space) not part of the structure.
 * Every other character must be a key of `legend`.
 */
export interface MultiblockDef {
  id: string;
  name: string;
  /** Voltage tier or short tag shown in the picker, e.g. "LV", "Steam". */
  tier?: string;
  /** Link to the GT5-Unofficial (or other) source file the structure was transcribed from. */
  source?: string;
  /** [x, y, z] */
  size: Vec3;
  layers: string[][];
  legend: Record<string, LegendEntry>;
  controller: {
    /** Local position of the `~` cell. */
    pos: Vec3;
    /** Direction the controller's front face looks (outward normal, local frame). */
    facing: HorizontalDir;
    blockId: string;
  };
  /** Block id used when a hatch of that kind is placed. */
  hatchBlocks: Partial<Record<HatchKind, string>>;
  /** Hatch kinds whose single block may serve several controllers at once. */
  shareableHatches: HatchKind[];
  /** Required hatch counts per unit (e.g. EBF muffler min 1 max 1). */
  requiredHatches?: Partial<Record<HatchKind, HatchRequirement>>;
  /** Hatch kinds enabled by default in a new plan. */
  defaultHatches: HatchKind[];
  /** Whether casings of two units may overlap (shared walls) when the blocks match. */
  wallshare: boolean;
  /** Present when the structure has a variable size (see `ResizeRule`). */
  resize?: ResizeRule;
  notes?: string;
}

/** One placed multiblock. `origin` is the world position of the min corner of its rotated bounding box. */
export interface Unit {
  id: number;
  origin: Vec3;
  rotation: Rotation;
}

export type CellRole = 'casing' | 'controller' | 'air';

/** A structure cell of a unit in world space. */
export interface UnitCell {
  pos: Vec3;
  local: Vec3;
  role: CellRole;
  /** Legend char, `~` or `-`. */
  char: string;
  /** Block id for casing/controller cells; undefined for air. */
  blockId?: string;
  /** Hatch kinds allowed at this cell (casing only). */
  hatches?: HatchKind[];
}

export interface PlanLimits {
  /** Max number of units along X / Y (stacked layers) / Z, or null for unlimited. */
  x: number | null;
  y: number | null;
  z: number | null;
}

/** Everything that defines a plan. Derived data is never stored. */
export interface PlanState {
  v: 1;
  multiblockId: string;
  count: number;
  limits: PlanLimits;
  enabledHatches: HatchKind[];
  /** Colour overrides, `#rrggbb`. */
  colors: Partial<Record<HatchKind, string>>;
  /** When set, units are placed exactly here instead of auto-packing. */
  manualUnits?: Unit[];
  /**
   * Size along the multiblock's `resize` axis (height / length). Only for resizable multiblocks; absent
   * means `resize.default`.
   */
  size?: number;
}

export interface PackResult {
  units: Unit[];
  requested: number;
  placed: number;
  /** Why fewer than requested were placed. */
  reason?: 'limits' | 'geometry';
}

export interface HatchPlacement {
  kind: HatchKind;
  /** World cell occupied by the hatch block. */
  cell: Vec3;
  /** Outward face the hatch exposes (pipes attach here). */
  face: Dir;
  /** Units served by this hatch (length > 1 = shared). */
  unitIds: number[];
  /** Site view: id of the net (`RouteNet.id`) this hatch belongs to. */
  net?: number;
}

export interface HatchResult {
  hatches: HatchPlacement[];
  /** Requested hatches that could not be placed. */
  unplaced: { unitId: number; kind: HatchKind }[];
}

export interface WallStats {
  /** Unique blocks in the build, hatches and controllers included. */
  totalBlocks: number;
  /** Unique block counts by block id (hatch blocks under their hatch block id). */
  byBlock: Record<string, number>;
  controllers: number;
  hatches: number;
  /** Unit id pairs that share a full face contact with compatible blocks. */
  sharedWalls: [number, number][];
  /** Unit id pairs whose overlap is invalid (different blocks, controller/air overlap). */
  conflicts: [number, number][];
  /** World cells that are part of a conflict (for highlighting). */
  conflictCells: Vec3[];
  /** Blocks saved versus building every unit separately. */
  savedBlocks: number;
}

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

export type VoxelKind = 'casing' | 'controller' | 'hatch';

export interface Voxel {
  pos: Vec3;
  blockId: string;
  kind: VoxelKind;
  unitIds: number[];
  /** Controller front / hatch face. */
  facing?: Dir;
  hatchKind?: HatchKind;
  conflict?: boolean;
}

/** Everything the renderer needs, derived purely from a plan. */
export interface SceneModel {
  voxels: Voxel[];
  hatches: HatchPlacement[];
  pipes: RouteNet[] | null;
  bounds: { min: Vec3; max: Vec3 };
  /** Hatch colours to use in both view modes. */
  colors: Record<HatchKind, string>;
  /** Site view: discs on hatch and port faces; replaces the discs derived from hatch voxels. */
  markers?: { pos: Vec3; face: Dir; color: string }[];
  /** Site view: text above groups and ports (`pos` in world units, not cells; `color` draws a swatch). */
  labels?: { pos: [number, number, number]; text: string; color?: string; small?: boolean }[];
  /** Site view: the ground area, drawn as a grid from (0, 0) to `size` on y = 0. */
  site?: { size: [number, number] };
}
