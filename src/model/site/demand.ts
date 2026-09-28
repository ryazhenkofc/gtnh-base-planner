import { getSiteDef, isSingleBlock } from '../../data/generic';
import type { HatchKind, MultiblockDef } from '../types';
import type { Side, SiteWarning } from './buildTypes';
import type { Demand } from './group';
import type { Endpoint, ResourceDef, SiteState } from './types';

/** What each group needs: the hatch kind and resource of every link end on it. */

/** The hatch kind that carries `res` into (`in`) or out of a machine of `def`, or null when it has none. */
export function hatchKindFor(
  side: Side,
  key: string,
  res: ResourceDef,
  def: MultiblockDef,
): HatchKind | null {
  const any = isSingleBlock(def);
  const has = (k: HatchKind) => any || def.hatchBlocks[k] !== undefined;
  let kind: HatchKind;
  if (res.kind === 'power') kind = side === 'in' ? 'energy' : 'dynamo';
  else if (res.kind === 'item') kind = side === 'in' ? 'itemIn' : 'itemOut';
  else if (side === 'out') kind = 'fluidOut';
  else {
    const steamy = /steam/i.test(key) || /steam/i.test(res.name);
    kind = !any && has('steamIn') && (!has('fluidIn') || steamy) ? 'steamIn' : 'fluidIn';
  }
  return has(kind) ? kind : null;
}

/** A site's resource by key; an unknown key gets a grey item placeholder. */
export function siteResource(site: SiteState, key: string): ResourceDef {
  return site.resources[key] ?? { kind: 'item', name: key, color: '#888888' };
}

export interface SiteDemand {
  /** Per group id, the resources each hatch kind carries. */
  demands: Map<string, Demand>;
  /** Per group and hatch kind, the other ends of its links (where those hatches' pipes go). */
  endsOf: Map<string, Map<HatchKind, Endpoint[]>>;
  /** Link ends on a machine without a hatch for their resource. */
  warnings: SiteWarning[];
}

/** Walks the links: every end on a group asks that group for a hatch of the kind its resource needs. */
export function deriveSiteDemand(site: SiteState): SiteDemand {
  const groupById = new Map(site.groups.map((g) => [g.id, g]));
  const demands = new Map<string, Demand>();
  const endsOf = new Map<string, Map<HatchKind, Endpoint[]>>();
  const warnings: SiteWarning[] = [];
  const unsupported = new Set<string>();
  for (const l of site.links) {
    const res = siteResource(site, l.resource);
    for (const [end, side] of [
      [l.from, 'out'],
      [l.to, 'in'],
    ] as const) {
      if (!('group' in end)) continue;
      const g = groupById.get(end.group);
      const def = g ? getSiteDef(g.multiblockId) : undefined;
      if (!g || !def) continue;
      const kind = hatchKindFor(side, l.resource, res, def);
      if (!kind) {
        const u = `${end.group}\u0000${l.resource}`;
        if (!unsupported.has(u))
          warnings.push({ type: 'unsupported', group: end.group, resource: l.resource });
        unsupported.add(u);
        continue;
      }
      let dem = demands.get(end.group);
      if (!dem) demands.set(end.group, (dem = {}));
      const list = (dem[kind] ??= []);
      if (!list.includes(l.resource)) list.push(l.resource);
      let ends = endsOf.get(end.group);
      if (!ends) endsOf.set(end.group, (ends = new Map()));
      const other = side === 'out' ? l.to : l.from;
      (ends.get(kind) ?? ends.set(kind, []).get(kind)!).push(other);
    }
  }
  return { demands, endsOf, warnings };
}
