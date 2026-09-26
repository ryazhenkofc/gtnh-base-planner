import { rotateDir, rotatedSize, unitBounds, unitCells } from './geometry';
import type { HatchResult, MultiblockDef, Rotation, RouteNet, Unit, Vec3 } from './types';

/** A resolved layout: units, their hatches and (when routed with the layout) its networks. */
export interface PlacedLayout {
  units: Unit[];
  hatches: HatchResult;
  pipes?: RouteNet[];
}

/**
 * The layout turned a quarter clockwise (seen from above) when it is longer along Z than along X, so a
 * build keeps its long side along X whatever the count; otherwise `null`. Turning the whole build (units,
 * hatch cells and faces, pipe paths) keeps it valid and equally good: nothing is placed or routed again.
 * The footprint (the units' bounding boxes) keeps its minimum corner.
 */
export function alongX(def: MultiblockDef, layout: PlacedLayout): PlacedLayout | null {
  if (layout.units.length === 0) return null;
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const u of layout.units) {
    const b = unitBounds(def, u);
    x0 = Math.min(x0, b.min[0]);
    x1 = Math.max(x1, b.max[0]);
    z0 = Math.min(z0, b.min[2]);
    z1 = Math.max(z1, b.max[2]);
  }
  // Decide by the blocks themselves: a structure need not fill its bounding box.
  let bx0 = Infinity;
  let bx1 = -Infinity;
  let bz0 = Infinity;
  let bz1 = -Infinity;
  for (const u of layout.units)
    for (const c of unitCells(def, u)) {
      if (c.role === 'air') continue;
      bx0 = Math.min(bx0, c.pos[0]);
      bx1 = Math.max(bx1, c.pos[0]);
      bz0 = Math.min(bz0, c.pos[2]);
      bz1 = Math.max(bz1, c.pos[2]);
    }
  if (bz1 - bz0 <= bx1 - bx0) return null;
  // Cell (x, z) -> (z0 + z1 - 1 - z, z0 + x - x0): Z becomes X, the minimum corner stays put.
  const cell = (p: Vec3): Vec3 => [z0 + z1 - 1 - p[2] + x0 - z0, p[1], z0 + p[0] - x0];
  const units = layout.units.map((u) => {
    const sz = rotatedSize(def, u.rotation)[2];
    // The unit's far Z edge becomes its new minimum X.
    const origin: Vec3 = [z1 - u.origin[2] - sz + x0, u.origin[1], z0 + u.origin[0] - x0];
    return { ...u, origin, rotation: ((u.rotation + 1) % 4) as Rotation };
  });
  const hatches: HatchResult = {
    ...layout.hatches,
    hatches: layout.hatches.hatches.map((h) => ({ ...h, cell: cell(h.cell), face: rotateDir(h.face, 1) })),
  };
  const pipes = layout.pipes?.map((n) => ({
    ...n,
    paths: n.paths.map((p) => p.map(cell)),
    attachments: n.attachments?.map((a) => ({ cell: cell(a.cell), face: rotateDir(a.face, 1) })),
    flows: n.flows?.map(([a, b]): [Vec3, Vec3] => [cell(a), cell(b)]),
  }));
  return pipes ? { units, hatches, pipes } : { units, hatches };
}
