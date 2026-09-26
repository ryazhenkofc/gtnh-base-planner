import { t } from '../i18n/en';
import type { SceneModel } from '../model/types';

/**
 * The scene with its footprint from `min` to `max` (x, z, in blocks) measured on the ground plane `y`:
 * "WIDTH n" along X and "DEPTH n" along Z. An empty footprint is left unmeasured.
 */
export function withDimensions(
  scene: SceneModel,
  min: [number, number],
  max: [number, number],
  y: number,
): SceneModel {
  const w = max[0] - min[0];
  const d = max[1] - min[1];
  if (w <= 0 || d <= 0) return scene;
  const labels: [string, string] = [
    `${t.site.width.toUpperCase()}  ${w}`,
    `${t.site.depth.toUpperCase()}  ${d}`,
  ];
  return { ...scene, dimensions: { min, max, y, labels } };
}

/** The build's footprint (voxel bounds) measured at its lowest layer. */
export function withBuildDimensions(scene: SceneModel): SceneModel {
  if (scene.voxels.length === 0) return scene;
  const { min, max } = scene.bounds;
  return withDimensions(scene, [min[0], min[2]], [max[0], max[2]], min[1]);
}
