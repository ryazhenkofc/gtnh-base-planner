import { getSiteDef } from '../../data/generic';
import { rotateDir, rotatedSize } from '../geometry';
import { packUnits } from '../layout/packer';
import { effectiveSize, sizedDef } from '../resize';
import type { Dir, Rotation } from '../core/types';
import type { HatchKind } from '../multiblock/types';
import type { Toward } from './group';
import { endpointIs, portEdgeOrder } from './ports';
import type { Endpoint, SiteGroup, SiteState } from './types';

/**
 * Which way each group's pipes leave, per hatch kind, in the group's own (unturned) frame. Estimated from
 * the compact packs (the real ones may be looser) and from the edge each port will take, so hatches can
 * be put on the side their pipes go to before anything is built.
 */
export function groupToward(
  site: SiteState,
  endsOf: ReadonlyMap<string, ReadonlyMap<HatchKind, readonly Endpoint[]>>,
): (g: SiteGroup) => Toward {
  const [w, d] = site.size;
  const centreOf = new Map<string, [number, number]>();
  for (const g of site.groups) {
    const raw = getSiteDef(g.multiblockId);
    if (!raw) continue;
    const def = sizedDef(raw, effectiveSize(raw, g.size));
    const units = packUnits(def, g.count, g.limits).units;
    let sx = 0;
    let sz = 0;
    for (const u of units) {
      const r = rotatedSize(def, u.rotation);
      sx = Math.max(sx, u.origin[0] + r[0]);
      sz = Math.max(sz, u.origin[2] + r[2]);
    }
    const [wx, wz] = g.rotation % 2 === 0 ? [sx, sz] : [sz, sx];
    centreOf.set(g.id, [g.origin[0] + wx / 2, g.origin[1] + wz / 2]);
  }
  const portById = new Map(site.ports.map((p) => [p.id, p]));
  const portCentre = new Map<string, [number, number]>();
  /** Where a port will roughly sit: its fixed position, or the likeliest edge cell near its groups. */
  const portSpot = (id: string): [number, number] | undefined => {
    const p = portById.get(id);
    if (!p) return undefined;
    if (p.pos) return p.pos;
    let c = portCentre.get(id);
    if (!c) {
      const linked = site.links
        .flatMap((l) => (endpointIs(l.from, id) ? [l.to] : endpointIs(l.to, id) ? [l.from] : []))
        .flatMap((e) => ('group' in e && centreOf.has(e.group) ? [centreOf.get(e.group)!] : []));
      c = linked.length
        ? [
            linked.reduce((a, v) => a + v[0], 0) / linked.length,
            linked.reduce((a, v) => a + v[1], 0) / linked.length,
          ]
        : [(w - 1) / 2, (d - 1) / 2];
      portCentre.set(id, c);
    }
    const inward = portEdgeOrder(p.dir, c[0], c[1], w, d)[0];
    const x = inward === 'east' ? 0 : inward === 'west' ? w - 1 : c[0];
    const z = inward === 'south' ? 0 : inward === 'north' ? d - 1 : c[1];
    return [x, z];
  };
  return (g) => {
    const out: Toward = {};
    const c = centreOf.get(g.id);
    const ends = endsOf.get(g.id);
    if (!c || !ends) return out;
    for (const [kind, list] of ends) {
      let vx = 0;
      let vz = 0;
      for (const e of list) {
        const q = 'group' in e ? centreOf.get(e.group) : portSpot(e.port);
        if (!q) continue;
        const dx = q[0] - c[0];
        const dz = q[1] - c[1];
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        vx += dx / len;
        vz += dz / len;
      }
      if (Math.abs(vx) < 0.2 && Math.abs(vz) < 0.2) continue;
      const world: Dir =
        Math.abs(vx) >= Math.abs(vz) ? (vx > 0 ? 'east' : 'west') : vz > 0 ? 'south' : 'north';
      out[kind] = rotateDir(world, ((4 - g.rotation) % 4) as Rotation);
    }
    return out;
  };
}
