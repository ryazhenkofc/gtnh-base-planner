import { getSiteDef, isSingleBlock } from '../../data/generic';
import { DEFAULT_HATCH_COLORS } from '../colors';
import { controllerFacing, key, step, unitCells } from '../geometry';
import { sizedDef, effectiveSize } from '../resize';
import { buildSceneModel } from '../scene';
import type { Dir, HatchKind, MultiblockDef, RouteNet, SceneModel, Unit, Vec3, Voxel } from '../types';
import {
  IN_KINDS,
  IO_KINDS,
  OUT_KINDS,
  buildGroup,
  groupPoint,
  placeHatch,
  placeUnit,
  rotatedGroupSize,
  type Demand,
  type GroupBuild,
  type SiteHatch,
} from './group';
import { routeNets, type RouteResult, type RouteTerminal } from './router';
import type { Endpoint, ResourceDef, ResourceKind, SiteGroup, SitePort, SiteState } from './types';

/** Unit ids on a site: group index × stride + the unit's id within its group. */
export const GROUP_STRIDE = 1000;

export function groupIndexOfUnit(unitId: number): number {
  return Math.floor(unitId / GROUP_STRIDE);
}

export interface SiteBuildOptions {
  /** Route item and fluid nets. */
  pipes: boolean;
  /** Route power nets (energy / dynamo cables). */
  cables: boolean;
  /** Resource key to highlight: every other net is drawn faded. */
  isolate?: string | null;
  turnCost?: number;
}

export interface PlacedGroup {
  group: SiteGroup;
  index: number;
  def?: MultiblockDef;
  build?: GroupBuild;
  error?: string;
  /** World units (global ids) and hatches. */
  units: Unit[];
  hatches: SiteHatch[];
  /** World bounding box: inclusive min, exclusive max. */
  min: Vec3;
  max: Vec3;
  demand: Demand;
}

export interface PlacedPort {
  port: SitePort;
  cell: Vec3;
  faces: Dir[];
}

export interface NetTerminalInfo {
  role: 'source' | 'sink';
  group?: string;
  port?: string;
  hatch?: SiteHatch;
  cell: Vec3;
}

export interface SiteNet {
  id: number;
  resource: string;
  kind: ResourceKind;
  links: string[];
  terminals: NetTerminalInfo[];
  /** Null when this kind of net is switched off. */
  route: RouteResult | null;
  /** Sum of the known link rates. */
  rate?: number;
}

export type SiteWarning =
  | { type: 'error'; group: string; message: string }
  | { type: 'overlap'; groups: [string, string] }
  | { type: 'outside'; group: string }
  | { type: 'fewer'; group: string; placed: number; requested: number }
  | { type: 'unplaced'; group: string; count: number }
  | { type: 'unsupported'; group: string; resource: string }
  | { type: 'missing'; group: string; resource: string; units: number }
  | { type: 'unrouted'; resource: string; connected: number; total: number }
  | { type: 'noport'; port: string };

export interface SiteBuild {
  groups: PlacedGroup[];
  ports: PlacedPort[];
  nets: SiteNet[];
  scene: SceneModel;
  warnings: SiteWarning[];
  stats: {
    groups: number;
    units: number;
    blocks: number;
    hatches: number;
    pipeBlocks: number;
    cableBlocks: number;
    connected: number;
    terminals: number;
  };
}

/** Side of the group a link end sits on. */
type Side = 'in' | 'out';

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

/** Faces tried after a hatch's placed face: sides first, then top, then bottom. */
const ATTACH_ORDER: readonly Dir[] = ['north', 'east', 'south', 'west', 'up', 'down'];

/** Representative hatch kind of a net (fallback colour and pipe vs cable width in the renderer). */
function netKind(kind: ResourceKind): HatchKind {
  return kind === 'power' ? 'energy' : kind === 'fluid' ? 'fluidOut' : 'itemOut';
}

class UnionFind {
  private parent = new Map<string, string>();
  find(a: string): string {
    let p = this.parent.get(a) ?? a;
    if (p !== a) {
      p = this.find(p);
      this.parent.set(a, p);
    }
    return p;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb < ra ? ra : rb, rb < ra ? rb : ra);
  }
}

function endNode(resource: string, end: Endpoint, side: Side): string {
  return 'group' in end
    ? `${resource}\u0000g\u0000${end.group}\u0000${side}`
    : `${resource}\u0000p\u0000${end.port}`;
}

/**
 * Builds sites. Keeps a per-group cache: moving, rotating or relinking one group only re-packs the groups
 * whose own inputs (multiblock, count, limits, hatches, demand) changed.
 */
export function createSiteBuilder() {
  const cache = new Map<string, GroupBuild | { error: string }>();

  return function buildSite(site: SiteState, opts: SiteBuildOptions): SiteBuild {
    const [w, d] = site.size;
    const warnings: SiteWarning[] = [];
    const colors = { ...DEFAULT_HATCH_COLORS, ...site.colors };
    const groupById = new Map(site.groups.map((g, i) => [g.id, { g, i }]));

    // ------------------------------------------------------------ demand per group
    const demands = new Map<string, Demand>();
    const unsupported = new Set<string>();
    const resourceOf = (k: string): ResourceDef =>
      site.resources[k] ?? { kind: 'item', name: k, color: '#888888' };
    for (const l of site.links) {
      const res = resourceOf(l.resource);
      for (const [end, side] of [
        [l.from, 'out'],
        [l.to, 'in'],
      ] as const) {
        if (!('group' in end)) continue;
        const entry = groupById.get(end.group);
        const def = entry ? getSiteDef(entry.g.multiblockId) : undefined;
        if (!entry || !def) continue;
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
      }
    }

    // ------------------------------------------------------------ groups
    const used = new Set<string>();
    const groups: PlacedGroup[] = site.groups.map((g, index) => {
      const raw = getSiteDef(g.multiblockId);
      const demand = demands.get(g.id) ?? {};
      const empty: PlacedGroup = {
        group: g,
        index,
        units: [],
        hatches: [],
        min: [g.origin[0], 0, g.origin[1]],
        max: [g.origin[0], 0, g.origin[1]],
        demand,
      };
      if (!raw) {
        warnings.push({ type: 'error', group: g.id, message: `Unknown multiblock "${g.multiblockId}"` });
        return { ...empty, error: 'unknown' };
      }
      const def = sizedDef(raw, effectiveSize(raw, g.size));
      const base = g.enabledHatches.filter((k) => !IO_KINDS.includes(k));
      const ck = JSON.stringify([
        def.id,
        effectiveSize(raw, g.size) ?? null,
        g.count,
        g.limits,
        base,
        demand,
      ]);
      used.add(ck);
      let built = cache.get(ck);
      if (!built) {
        try {
          built = buildGroup(def, g.count, g.limits, base, demand);
        } catch (err) {
          built = { error: err instanceof Error ? err.message : String(err) };
        }
        cache.set(ck, built);
      }
      if ('error' in built) {
        warnings.push({ type: 'error', group: g.id, message: built.error });
        return { ...empty, def, error: built.error };
      }
      const b = built;
      const gid = (id: number) => index * GROUP_STRIDE + id;
      const units = b.units.map((u) => ({
        ...placeUnit(b.def, u, b.size, g.rotation, g.origin),
        id: gid(u.id),
      }));
      const hatches = b.hatches.map((h) => ({
        ...placeHatch(h, b.size, g.rotation, g.origin),
        unitIds: h.unitIds.map(gid),
      }));
      const rs = rotatedGroupSize(b.size, g.rotation);
      if (b.pack.placed < b.pack.requested)
        warnings.push({ type: 'fewer', group: g.id, placed: b.pack.placed, requested: b.pack.requested });
      if (b.unplaced.length) warnings.push({ type: 'unplaced', group: g.id, count: b.unplaced.length });
      const missingBy = new Map<string, number>();
      for (const m of b.missing) missingBy.set(m.resource, (missingBy.get(m.resource) ?? 0) + 1);
      for (const [resource, n] of missingBy)
        warnings.push({ type: 'missing', group: g.id, resource, units: n });
      return {
        group: g,
        index,
        def: b.def,
        build: b,
        units,
        hatches,
        min: [g.origin[0], 0, g.origin[1]],
        max: [g.origin[0] + rs[0], rs[1], g.origin[1] + rs[2]],
        demand,
      };
    });
    // Forget groups that are gone (bounded memory while editing).
    for (const k of [...cache.keys()]) if (!used.has(k)) cache.delete(k);

    // ------------------------------------------------------------ occupancy, overlaps, bounds
    /** Cell -> group index, and whether that group needs the cell as air. */
    const occ = new Map<string, { gi: number; air: boolean }>();
    const conflictCells = new Set<string>();
    const overlapPairs = new Set<string>();
    const outside = new Set<number>();
    const solids: Vec3[] = [];
    const keepFree: Vec3[] = [];
    for (const pg of groups) {
      if (!pg.def) continue;
      for (const u of pg.units) {
        for (const c of unitCells(pg.def, u)) {
          const k = key(c.pos);
          const air = c.role === 'air';
          solids.push(c.pos);
          if (c.pos[0] < 0 || c.pos[2] < 0 || c.pos[0] >= w || c.pos[2] >= d) {
            outside.add(pg.index);
            if (!air) conflictCells.add(k);
          }
          const prev = occ.get(k);
          if (!prev) occ.set(k, { gi: pg.index, air });
          else if (prev.gi !== pg.index && !(prev.air && air)) {
            conflictCells.add(k);
            const a = site.groups[Math.min(prev.gi, pg.index)].id;
            const b = site.groups[Math.max(prev.gi, pg.index)].id;
            overlapPairs.add(`${a}\u0000${b}`);
          }
        }
        keepFree.push(
          step(
            unitCells(pg.def, u).find((c) => c.role === 'controller')?.pos ?? u.origin,
            controllerFacing(pg.def, u),
          ),
        );
      }
    }
    for (const gi of outside) warnings.push({ type: 'outside', group: site.groups[gi].id });
    for (const p of overlapPairs) {
      const [a, b] = p.split('\u0000');
      warnings.push({ type: 'overlap', groups: [a, b] });
    }

    // ------------------------------------------------------------ ports
    const portById = new Map(site.ports.map((p) => [p.id, p]));
    const linkedCentreZ = new Map<string, number[]>();
    for (const l of site.links)
      for (const [end, other] of [
        [l.from, l.to],
        [l.to, l.from],
      ] as const) {
        if (!('port' in end) || !('group' in other)) continue;
        const pg = groups[groupById.get(other.group)?.i ?? -1];
        if (!pg) continue;
        const list = linkedCentreZ.get(end.port) ?? [];
        list.push((pg.min[2] + pg.max[2] - 1) / 2);
        linkedCentreZ.set(end.port, list);
      }
    const taken = new Set<string>();
    const ports: PlacedPort[] = [];
    const blocked = (x: number, z: number) => occ.has(key([x, 0, z])) || taken.has(`${x},${z}`);
    for (const p of site.ports) {
      let cell: Vec3 | null = null;
      let faces: Dir[];
      if (p.pos) {
        cell = [p.pos[0], 0, p.pos[1]];
        faces = ['north', 'east', 'south', 'west', 'up'];
      } else {
        const x = p.dir === 'in' ? 0 : w - 1;
        const inward: Dir = p.dir === 'in' ? 'east' : 'west';
        const zs = linkedCentreZ.get(p.id);
        const z0 = Math.round(zs?.length ? zs.reduce((s, v) => s + v, 0) / zs.length : (d - 1) / 2);
        for (let k = 0; k < 2 * d && !cell; k++) {
          const z = z0 + (k % 2 === 0 ? k / 2 : -(k + 1) / 2);
          if (z < 0 || z >= d) continue;
          const nx = x + (p.dir === 'in' ? 1 : -1);
          // Keep one block free on either side along the edge so neighbouring ports keep their pipes apart.
          if (blocked(x, z) || blocked(nx, z) || taken.has(`${x},${z - 1}`) || taken.has(`${x},${z + 1}`))
            continue;
          cell = [x, 0, z];
        }
        faces = [inward, 'up', 'north', 'south'];
      }
      if (!cell) {
        warnings.push({ type: 'noport', port: p.id });
        continue;
      }
      taken.add(`${cell[0]},${cell[2]}`);
      solids.push(cell);
      occ.set(key(cell), { gi: -1, air: false });
      ports.push({ port: p, cell, faces });
    }
    const placedPort = new Map(ports.map((p) => [p.port.id, p]));

    // ------------------------------------------------------------ nets
    const uf = new UnionFind();
    for (const l of site.links) uf.union(endNode(l.resource, l.from, 'out'), endNode(l.resource, l.to, 'in'));
    const comps = new Map<string, { resource: string; links: string[]; nodes: Set<string>; rate?: number }>();
    for (const l of site.links) {
      const a = endNode(l.resource, l.from, 'out');
      const root = uf.find(a);
      let c = comps.get(root);
      if (!c) comps.set(root, (c = { resource: l.resource, links: [], nodes: new Set() }));
      c.links.push(l.id);
      c.nodes.add(a);
      c.nodes.add(endNode(l.resource, l.to, 'in'));
      if (l.rate !== undefined) c.rate = (c.rate ?? 0) + l.rate;
    }
    const nets: SiteNet[] = [];
    const hatchNet = new Map<SiteHatch, number>();
    for (const c of comps.values()) {
      const res = resourceOf(c.resource);
      const terminals: NetTerminalInfo[] = [];
      for (const node of c.nodes) {
        const [, type, id, side] = node.split('\u0000');
        if (type === 'p') {
          const pp = placedPort.get(id);
          if (pp)
            terminals.push({
              role: portById.get(id)!.dir === 'in' ? 'source' : 'sink',
              port: id,
              cell: pp.cell,
            });
          continue;
        }
        const pg = groups[groupById.get(id)?.i ?? -1];
        if (!pg) continue;
        const kinds = side === 'out' ? OUT_KINDS : IN_KINDS;
        for (const h of pg.hatches) {
          if (h.resource !== c.resource || !kinds.includes(h.kind) || hatchNet.has(h)) continue;
          hatchNet.set(h, nets.length);
          terminals.push({ role: side === 'out' ? 'source' : 'sink', group: id, hatch: h, cell: h.cell });
        }
      }
      nets.push({
        id: nets.length,
        resource: c.resource,
        kind: res.kind,
        links: c.links,
        terminals,
        route: null,
        rate: c.rate,
      });
    }

    // Faces a pipe may use for each terminal.
    const termFaces = (t: NetTerminalInfo): Dir[] => {
      if (t.port) return placedPort.get(t.port)!.faces;
      const h = t.hatch!;
      const pg = groups[groupById.get(t.group!)!.i];
      const single = pg.def && isSingleBlock(pg.def);
      const unit = single ? pg.units.find((u) => u.id === h.unitIds[0]) : undefined;
      const front = unit && pg.def ? controllerFacing(pg.def, unit) : null;
      const no = new Set<Dir>([...(h.blocked ?? []), ...(front ? [front, 'down' as Dir] : [])]);
      return [h.face, ...ATTACH_ORDER.filter((f) => f !== h.face)].filter((f) => !no.has(f));
    };

    const routed = nets.filter((n) => (n.kind === 'power' ? opts.cables : opts.pipes));
    // Fronts of hatches no routed net uses stay free: mufflers vent there, maintenance needs the player,
    // an unrouted energy hatch takes its cable there.
    const routedHatches = new Set<SiteHatch>();
    for (const n of routed) for (const t of n.terminals) if (t.hatch) routedHatches.add(t.hatch);
    for (const pg of groups) {
      if (pg.def && isSingleBlock(pg.def)) continue;
      for (const h of pg.hatches) if (!routedHatches.has(h)) keepFree.push(step(h.cell, h.face));
    }
    const height = Math.max(4, ...groups.map((g) => g.max[1] + 3));
    const results = routed.length
      ? routeNets({
          box: { min: [0, 0, 0], max: [w, height, d] },
          solids,
          keepFree,
          nets: routed.map((n) => ({
            terminals: n.terminals.map((t): RouteTerminal => ({
              cell: t.cell,
              faces: termFaces(t),
              role: t.role,
            })),
          })),
          turnCost: opts.turnCost,
        })
      : [];
    routed.forEach((n, i) => (n.route = results[i]));

    // Hatches turn to the side their pipe reaches them from.
    const finalFace = new Map<SiteHatch, Dir>();
    for (const n of routed)
      n.terminals.forEach((t, ti) => {
        const f = n.route?.attach[ti];
        if (t.hatch && f) finalFace.set(t.hatch, f);
      });
    for (const pg of groups)
      pg.hatches = pg.hatches.map((h) => {
        const net = hatchNet.get(h);
        const face = finalFace.get(h);
        if (net === undefined && !face) return h;
        const out: SiteHatch = { ...h, face: face ?? h.face };
        if (net !== undefined) out.net = net;
        return out;
      });
    for (const n of routed) {
      const r = n.route!;
      if (r.connected < r.total)
        warnings.push({ type: 'unrouted', resource: n.resource, connected: r.connected, total: r.total });
    }

    // ------------------------------------------------------------ scene
    const voxelMap = new Map<string, Voxel>();
    for (const pg of groups) {
      if (!pg.def || !pg.build) continue;
      const single = isSingleBlock(pg.def);
      const b = pg.build;
      const local = buildSceneModel(
        pg.def,
        pg.units,
        single ? [] : pg.hatches,
        {
          ...b.stats,
          conflictCells: b.stats.conflictCells.map((c) =>
            groupPoint(c, b.size, pg.group.rotation, pg.group.origin),
          ),
        },
        null,
        colors,
      );
      for (const v of local.voxels) {
        const k = key(v.pos);
        if (conflictCells.has(k)) v.conflict = true;
        const prev = voxelMap.get(k);
        if (prev) {
          prev.conflict = true;
          prev.unitIds = [...new Set([...prev.unitIds, ...v.unitIds])].sort((a, b) => a - b);
        } else voxelMap.set(k, v);
      }
    }
    for (const pp of ports) {
      const res = resourceOf(pp.port.resource);
      const k = key(pp.cell);
      if (voxelMap.has(k)) voxelMap.get(k)!.conflict = true;
      // A port shows its front (chest, tank or energy output) towards the site, like a controller.
      else
        voxelMap.set(k, {
          pos: pp.cell,
          blockId: `site.port.${res.kind}`,
          kind: 'controller',
          facing: pp.faces[0],
          unitIds: [],
        });
    }
    const voxels = [...voxelMap.values()];

    const markers: NonNullable<SceneModel['markers']> = [];
    const allHatches: SiteHatch[] = [];
    for (const pg of groups)
      for (const h of pg.hatches) {
        allHatches.push(h);
        markers.push({
          pos: h.cell,
          face: h.face,
          color: h.resource ? resourceOf(h.resource).color : colors[h.kind],
        });
      }
    for (const n of routed)
      n.terminals.forEach((t, ti) => {
        const f = n.route?.attach[ti];
        if (t.port)
          markers.push({
            pos: t.cell,
            face: f ?? placedPort.get(t.port)!.faces[0],
            color: resourceOf(n.resource).color,
          });
      });
    for (const pp of ports)
      if (!routed.some((n) => n.terminals.some((t) => t.port === pp.port.id)))
        markers.push({ pos: pp.cell, face: pp.faces[0], color: resourceOf(pp.port.resource).color });

    const pipes: RouteNet[] = routed.map((n) => {
      const r = n.route!;
      return {
        kind: netKind(n.kind),
        id: n.id,
        color: resourceOf(n.resource).color,
        paths: r.paths,
        length: r.length,
        connected: r.connected,
        total: r.total,
        flows: r.flows,
        dim: !!opts.isolate && opts.isolate !== n.resource,
      };
    });
    // Port blocks take a stub like hatches.
    const portStubs = routed.flatMap((n) =>
      n.terminals.flatMap((t, ti) => {
        const f = n.route?.attach[ti];
        return t.port && f ? [{ kind: netKind(n.kind), cell: t.cell, face: f, unitIds: [], net: n.id }] : [];
      }),
    );

    const labels: NonNullable<SceneModel['labels']> = [];
    for (const pg of groups) {
      if (!pg.def) continue;
      const name = pg.group.label ?? pg.def.name;
      const cx = (pg.min[0] + pg.max[0]) / 2;
      const cz = (pg.min[2] + pg.max[2]) / 2;
      labels.push({ pos: [cx, pg.max[1] + 1.2, cz], text: `${name} ×${pg.units.length}` });
    }
    for (const pp of ports) {
      const res = resourceOf(pp.port.resource);
      labels.push({
        pos: [pp.cell[0] + 0.5, 1.9, pp.cell[2] + 0.5],
        text: `${pp.port.dir === 'in' ? '→' : ''}${res.name}${pp.port.dir === 'out' ? (pp.port.void ? ' ✕' : '→') : ''}`,
        color: res.color,
        small: true,
      });
    }

    let lo: Vec3 = [0, 0, 0];
    let hi: Vec3 = [w, 1, d];
    for (const v of voxels) {
      lo = [Math.min(lo[0], v.pos[0]), Math.min(lo[1], v.pos[1]), Math.min(lo[2], v.pos[2])];
      hi = [Math.max(hi[0], v.pos[0] + 1), Math.max(hi[1], v.pos[1] + 1), Math.max(hi[2], v.pos[2] + 1)];
    }

    const scene: SceneModel = {
      voxels,
      hatches: [...allHatches, ...portStubs],
      pipes: routed.length ? pipes : null,
      bounds: { min: lo, max: hi },
      colors,
      markers,
      labels,
      site: { size: [w, d] },
    };

    let blocks = ports.length;
    let hatchCount = 0;
    for (const pg of groups) {
      blocks += pg.build?.stats.totalBlocks ?? 0;
      hatchCount += pg.build?.stats.hatches ?? 0;
    }
    const sum = (list: SiteNet[], f: (r: RouteResult) => number) =>
      list.reduce((s, n) => s + (n.route ? f(n.route) : 0), 0);
    return {
      groups,
      ports,
      nets,
      scene,
      warnings,
      stats: {
        groups: groups.length,
        units: groups.reduce((s, g) => s + g.units.length, 0),
        blocks,
        hatches: hatchCount,
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
      },
    };
  };
}

/** Local footprint [x, z] (before rotation) of each built group, for `arrangeSite`. */
export function localFootprints(build: SiteBuild): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const g of build.groups) if (g.build) out.set(g.group.id, [g.build.size[0], g.build.size[2]]);
  return out;
}
