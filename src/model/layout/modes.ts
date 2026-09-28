import { rotatedSize } from '../geometry';
import type { MultiblockDef, PlanLimits, Rotation, Vec3 } from '../types';
import { axisVec, pairOk } from './shapes';
import type { DefCache, Mode, Spacing } from './types';

/** Rotation patterns and per-axis spacings a multiblock can be packed with, and the limits they obey. */

/** Rotation patterns tried per lattice: base 180° flip × which horizontal axis alternates (none/Z/X). */
export const PATTERNS: readonly { flip: 0 | 1; alt: -1 | 0 | 2 }[] = [
  { flip: 0, alt: -1 },
  { flip: 1, alt: -1 },
  { flip: 0, alt: 2 },
  { flip: 1, alt: 2 },
  { flip: 0, alt: 0 },
  { flip: 1, alt: 0 },
];

export function rotationAt(parity: number, flip: number, alt: number, p: Vec3): Rotation {
  return ((parity + 2 * flip + (alt < 0 ? 0 : 2 * (p[alt] % 2))) % 4) as Rotation;
}

/** Position of the i-th unit along an axis. */
export function coord(sp: Spacing, i: number): number {
  return Math.floor(i / 2) * (sp.inner + sp.outer) + (i % 2) * sp.inner;
}

/**
 * Most units axis `a` can hold under one rotation pattern, judging only the neighbours of the first unit
 * along it: pair (0 -> 1) at `inner` and pair (1 -> 2) at `outer`. Every later pair along the axis repeats
 * one of these two. Because the fill is a prefix of an order that is monotone in each coordinate, those two
 * pairs exist whenever an axis holds 2 (or 3) units, so this is a necessary condition for validity.
 */
export function neighbourCap(
  def: MultiblockDef,
  cache: DefCache,
  parity: number,
  sp: Spacing,
  a: number,
  flip: number,
  alt: number,
): number {
  const r0 = rotationAt(parity, flip, alt, [0, 0, 0]);
  const r1 = rotationAt(parity, flip, alt, axisVec(a, 1));
  if (!pairOk(def, cache, r0, r1, axisVec(a, sp.inner))) return 1;
  if (!pairOk(def, cache, r1, r0, axisVec(a, sp.outer))) return 2;
  return Infinity;
}

/**
 * All parities and spacings worth trying for a def, independent of count and limits (cached per def).
 * Horizontal axes may use a paired spacing with a walkway, but only where uniform wall sharing along that
 * axis is capped (typically the axis controllers face).
 */
export function modesFor(def: MultiblockDef, cache: DefCache): Mode[] {
  if (cache.modes) return cache.modes;
  const modes: Mode[] = [];
  for (const parity of [0, 1] as const) {
    const size = rotatedSize(def, parity);
    const options: { sp: Spacing; cap: number; wide: boolean }[][] = [];
    for (let a = 0; a < 3; a++) {
      const s = size[a];
      const tight = def.wallshare && s >= 2 ? s - 1 : s;
      const uniform: Spacing[] =
        tight === s
          ? [{ inner: s, outer: s }]
          : [
              { inner: tight, outer: tight },
              { inner: s, outer: s },
            ];
      const capOf = (sp: Spacing) =>
        Math.max(...PATTERNS.map(({ flip, alt }) => neighbourCap(def, cache, parity, sp, a, flip, alt)));
      const axis = uniform.map((sp) => ({ sp, cap: capOf(sp), wide: false }));
      if (a !== 1 && axis[0].cap !== Infinity) {
        const paired: Spacing = { inner: tight, outer: s + 1 };
        axis.push({ sp: paired, cap: capOf(paired), wide: false });
      }
      if (a !== 1) {
        // A one-block gap between all units: every side stays open for hatches that cannot be shared.
        const gap: Spacing = { inner: s + 1, outer: s + 1 };
        axis.push({ sp: gap, cap: capOf(gap), wide: false });
        // Two-block walkways and gaps leave room for several pipes side by side (routed layouts only).
        const paired2: Spacing = { inner: tight, outer: s + 2 };
        axis.push({ sp: paired2, cap: capOf(paired2), wide: true });
        const gap2: Spacing = { inner: s + 2, outer: s + 2 };
        axis.push({ sp: gap2, cap: capOf(gap2), wide: true });
      }
      options.push(axis);
    }
    for (const ox of options[0])
      for (const oy of options[1])
        for (const oz of options[2])
          modes.push({
            parity,
            size,
            spacing: [ox.sp, oy.sp, oz.sp],
            pairCaps: [ox.cap, oy.cap, oz.cap],
            wide: ox.wide || oz.wide,
            seq: modes.length,
          });
  }
  cache.modes = modes;
  return modes;
}

function sanitizeLimit(v: number | null): number | null {
  return v === null || !Number.isFinite(v) ? null : Math.max(0, Math.floor(v));
}

const LIMIT_KEYS = ['x', 'y', 'z'] as const;

/** Per-axis unit caps of a mode under limits (neighbour rules and unit-count limits), each at most `n`. */
export function modeCaps(mode: Mode, limits: PlanLimits, n: number): Vec3 {
  const caps = [0, 1, 2].map((a) => Math.min(mode.pairCaps[a], limits[LIMIT_KEYS[a]] ?? n, n));
  return [caps[0], caps[1], caps[2]];
}

export function sanitizeLimits(limits: PlanLimits): PlanLimits {
  return { x: sanitizeLimit(limits.x), y: sanitizeLimit(limits.y), z: sanitizeLimit(limits.z) };
}
