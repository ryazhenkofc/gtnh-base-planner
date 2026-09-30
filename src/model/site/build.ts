import type { PlacedGroup, PlacedPort, SiteBuild, SiteBuilder, SiteNet } from './buildTypes';
import { deriveSiteDemand } from './demand';
import { placeGroups, type GroupCache } from './groups';
import { buildSiteNetworks, routeSiteNetworks } from './nets';
import { analyzeOccupancy } from './occupancy';
import { placeSitePorts } from './ports';
import type { RouteResult } from './router';
import { buildSiteScene } from './siteScene';
import { groupToward } from './toward';

/**
 * Builds sites. Keeps a per-group cache: moving, rotating or relinking one group only re-packs the groups
 * whose own inputs (multiblock, count, limits, hatches, demand) changed.
 */
export function createSiteBuilder(): SiteBuilder {
  const cache: GroupCache = new Map();

  return function buildSite(site, opts) {
    const demand = deriveSiteDemand(site);
    const placed = placeGroups(
      site,
      demand.demands,
      groupToward(site, demand.endsOf),
      !!opts.below,
      cache,
      !opts.keepCache,
    );
    const { groups } = placed;
    const occupancy = analyzeOccupancy(site, groups);
    const { ports, warnings: portWarnings } = placeSitePorts(site, groups, occupancy);
    const { nets, hatchNet } = buildSiteNetworks(site, groups, ports);
    const routing = routeSiteNetworks(site, groups, ports, nets, hatchNet, occupancy, opts);
    return {
      groups,
      ports,
      nets,
      scene: buildSiteScene(site, groups, ports, routing.routed, occupancy.conflictCells, opts.isolate),
      warnings: [
        ...demand.warnings,
        ...placed.warnings,
        ...occupancy.warnings,
        ...portWarnings,
        ...routing.warnings,
      ],
      stats: siteStats(groups, ports, routing.routed),
    };
  };
}

/** Totals shown under the site: groups, units, blocks, hatches, pipe and cable blocks, connections. */
function siteStats(
  groups: readonly PlacedGroup[],
  ports: readonly PlacedPort[],
  routed: readonly SiteNet[],
): SiteBuild['stats'] {
  let blocks = ports.length;
  let hatches = 0;
  for (const pg of groups) {
    blocks += pg.build?.stats.totalBlocks ?? 0;
    hatches += pg.build?.stats.hatches ?? 0;
  }
  const sum = (list: readonly SiteNet[], f: (r: RouteResult) => number) =>
    list.reduce((s, n) => s + (n.route ? f(n.route) : 0), 0);
  return {
    groups: groups.length,
    units: groups.reduce((s, g) => s + g.units.length, 0),
    blocks,
    hatches,
    pipeBlocks: sum(
      routed.filter((n) => n.kind !== 'power'),
      (r) => r.length,
    ),
    cableBlocks: sum(
      routed.filter((n) => n.kind === 'power'),
      (r) => r.length,
    ),
    connected: sum(routed, (r) => r.connected),
    terminals: sum(routed, (r) => r.total),
  };
}

/** Height in blocks of each built group, for `arrangeSite`'s floors. */
export function localHeights(build: SiteBuild): Map<string, number> {
  const out = new Map<string, number>();
  for (const g of build.groups) if (g.build) out.set(g.group.id, g.build.size[1]);
  return out;
}

/** Local footprint [x, z] (before rotation) of each built group, for `arrangeSite`. */
export function localFootprints(build: SiteBuild): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const g of build.groups) if (g.build) out.set(g.group.id, [g.build.size[0], g.build.size[2]]);
  return out;
}
