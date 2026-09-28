/**
 * Face textures from the layer stacks the game draws: every layer is a block sprite multiplied by its RGBA
 * tint (GT's `mRGBa`; the alpha byte is not an opacity) and drawn over the ones below, as GT's renderer does.
 * Animated sprites (vertical strips) show their first frame. Everything is resampled to 16 × 16.
 */
import { createHash } from 'node:crypto';
import { TILE, decodePng, firstFrameTile } from '../../scripts/build-atlas.mjs';

export { TILE };

/** Straight-alpha "over" of `src` onto `dst` (both TILE × TILE RGBA8). */
export function over(dst, src) {
  for (let i = 0; i < dst.length; i += 4) {
    const sa = src[i + 3] / 255;
    if (sa === 0) continue;
    const da = dst[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    for (let c = 0; c < 3; c++) dst[i + c] = Math.round((src[i + c] * sa + dst[i + c] * da * (1 - sa)) / oa);
    dst[i + 3] = Math.round(oa * 255);
  }
  return dst;
}

export class Composer {
  /**
   * @param {import('./jars.mjs').TextureJars} jars
   * @param {(jar: string) => boolean} [redistributable] whether sprites of a jar may be copied into the atlas
   */
  constructor(jars, redistributable = () => true) {
    this.jars = jars;
    this.redistributable = redistributable;
    this.sprites = new Map();
    /** Icon names no jar carries. */
    this.missing = new Set();
  }

  /** Whether a sprite may go into the atlas (its jar's licence allows it). */
  allowed(icon) {
    const jar = this.jars.origin.get(this.jars.constructor.key(icon));
    return jar !== undefined && this.redistributable(jar);
  }

  /** A sprite as a TILE × TILE RGBA tile (tinted), or null. */
  sprite(icon, rgba) {
    const tint = rgba && (rgba[0] !== 255 || rgba[1] !== 255 || rgba[2] !== 255) ? rgba.slice(0, 3) : null;
    const key = `${icon}|${tint ?? ''}`;
    if (this.sprites.has(key)) return this.sprites.get(key);
    let px = null;
    const png = this.jars.get(icon);
    if (png) {
      try {
        px = firstFrameTile(decodePng(png), tint);
      } catch (e) {
        console.warn(`cannot decode ${icon}: ${e.message}`);
      }
    } else this.missing.add(icon);
    this.sprites.set(key, px);
    return px;
  }

  /**
   * Composites a layer stack (`[{ icon, rgba }]`, bottom first). Layers whose sprite is missing are skipped;
   * returns null when no layer could be drawn.
   */
  compose(layers) {
    let out = null;
    for (const l of layers) {
      const px = this.sprite(l.icon, l.rgba);
      if (!px) continue;
      out = out ? over(out, px) : px.slice();
    }
    return out;
  }
}

/** Short stable hash of tile pixels, to name and deduplicate tiles. */
export function pixelHash(px) {
  return createHash('sha1').update(px).digest('hex').slice(0, 10);
}

/** Alpha-weighted mean colour as `#rrggbb`, or null for a fully transparent tile. */
export function meanColor(px) {
  const sum = [0, 0, 0];
  let w = 0;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    for (let c = 0; c < 3; c++) sum[c] += px[i + c] * a;
    w += a;
  }
  if (!w) return null;
  return (
    '#' +
    sum
      .map((v) =>
        Math.round(v / w)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
