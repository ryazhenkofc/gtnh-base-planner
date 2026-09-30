import { getSiteDef, isSingleBlock } from '../../data/generic';
import type { PlanLimits } from '../multiblock/types';
import type { Shape } from './anneal';
import type { SiteBuilder } from './buildTypes';
import type { SiteGroup, SiteLink, SiteState } from './types';

/**
 * The ways each group of a site can be packed: the same machines and count with other `limits` (units along X,
 * layers, units along Z), measured by building them. The annealer moves between them.
 *
 * Candidates per group, in this order (the list is cut at `MAX_SHAPES`): one layer with rows along X or Z and
 * a few in-between grids, then two layers, then three. A candidate only counts when it places every unit,
 * leaves no more hatches or resources unplaced than the group's current packing does, stays under
 * `MAX_HEIGHT` and has a footprint or height the others do not.
 */

/** Layers tried, other shapes kept per group besides the current one, and the tallest a stack may be. */
const MAX_LAYERS = 3;
const MAX_SHAPES = 6;
const MAX_HEIGHT = 24;

/** Limits worth trying for `count` units of a multiblock `size` = [x, y, z] blocks. */
function candidateLimits(count: number, size: readonly number[]): PlanLimits[] {
  const out: PlanLimits[] = [];
  const ratio = size[2] / Math.max(1, size[0]);
  for (let y = 1; y <= Math.min(MAX_LAYERS, count); y++) {
    const perLayer = Math.ceil(count / y);
    const rows = new Set<number>([1, perLayer]);
    for (const r of [Math.sqrt(perLayer), Math.sqrt(perLayer * ratio), Math.sqrt(perLayer / ratio)])
      for (const x of [Math.floor(r), Math.ceil(r)]) rows.add(Math.min(perLayer, Math.max(1, x)));
    for (const x of [...rows].sort((a, b) => a - b)) {
      const z = Math.ceil(perLayer / x);
      // With fewer layers every unit would fit, so the packer would stay lower: the same as a smaller `y`.
      if (x * z * (y - 1) >= count) continue;
      out.push({ x, y, z });
    }
  }
  return out;
}

export function groupShapes(site: SiteState, builder: SiteBuilder, below: boolean): Map<string, Shape[]> {
  const variants: { of: SiteGroup; limits: PlanLimits }[] = [];
  for (const g of site.groups) {
    const def = getSiteDef(g.multiblockId);
    if (!def || isSingleBlock(def) || g.count < 2) continue;
    const seen = new Set([limitsKey(g.limits)]);
    for (const limits of candidateLimits(g.count, def.size)) {
      const k = limitsKey(limits);
      if (seen.has(k)) continue;
      seen.add(k);
      variants.push({ of: g, limits });
    }
  }
  const out = new Map<string, Shape[]>();
  if (variants.length === 0) return out;

  // Variants get ids of their own and a copy of every link end of their group, so they need the same hatches.
  const vid = (i: number) => `~s${i}`;
  const extra: SiteLink[] = [];
  for (const l of site.links)
    variants.forEach((v, i) => {
      for (const side of ['from', 'to'] as const) {
        const e = l[side];
        if ('group' in e && e.group === v.of.id)
          extra.push({ ...l, id: `${l.id}~${side}${i}`, [side]: { group: vid(i) } });
      }
    });
  const trial: SiteState = {
    ...site,
    groups: [...site.groups, ...variants.map((v, i) => ({ ...v.of, id: vid(i), limits: v.limits }))],
    links: [...site.links, ...extra],
  };
  const built = new Map(
    builder(trial, { pipes: false, cables: false, below }).groups.map((pg) => [pg.group.id, pg.build]),
  );
  const shapeOf = (id: string, limits: PlanLimits): Shape | null => {
    const b = built.get(id);
    return b ? { limits, size: [b.size[0], b.size[2]], height: b.size[1] } : null;
  };
  const sameFoot = (a: Shape, b: Shape) =>
    a.size[0] === b.size[0] && a.size[1] === b.size[1] && a.height === b.height;

  for (const g of site.groups) {
    const now = shapeOf(g.id, g.limits);
    const current = built.get(g.id);
    if (!now || !current) continue;
    const list: Shape[] = [now];
    variants.forEach((v, i) => {
      if (v.of.id !== g.id || list.length > MAX_SHAPES) return;
      const b = built.get(vid(i));
      const shape = shapeOf(vid(i), v.limits);
      if (!b || !shape) return;
      if (b.pack.placed < b.pack.requested) return;
      if (b.unplaced.length > current.unplaced.length || b.missing.length > current.missing.length) return;
      if (shape.height > MAX_HEIGHT || list.some((s) => sameFoot(s, shape))) return;
      list.push(shape);
    });
    if (list.length > 1) out.set(g.id, list);
  }
  return out;
}

function limitsKey(l: PlanLimits): string {
  return `${l.x}/${l.y}/${l.z}`;
}
