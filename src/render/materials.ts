import type * as THREE from 'three';
import type { Dir, ViewMode } from '../model/core/types';
import type { HatchKind } from '../model/multiblock/types';
import type { VoxelKind } from '../model/render/types';

/** What a voxel looks like; the renderer groups instances by identical visuals. */
export interface BlockVisual {
  blockId: string;
  kind: VoxelKind;
  /** Controller front / hatch face (gets the front texture in DETAILED view). */
  facing?: Dir;
  hatchKind?: HatchKind;
  /** Hatches: the casing drawn under the hatch overlay (see `Voxel.baseBlockId`). */
  baseBlockId?: string;
}

/**
 * Supplies materials for SIMPLE (flat colours, UNIT 6) and DETAILED (textures, UNIT 7) views.
 * `materials()` returns six materials in three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
 * (see `BOX_FACE_ORDER`). Providers cache materials; callers must not dispose them.
 */
export interface MaterialProvider {
  readonly mode: ViewMode;
  /** Resolves when textures are loaded (SIMPLE resolves immediately). */
  load(): Promise<void>;
  materials(visual: BlockVisual, colors: Record<HatchKind, string>): THREE.Material[];
  dispose(): void;
}

export const BOX_FACE_ORDER: readonly Dir[] = ['east', 'west', 'up', 'down', 'south', 'north'];
