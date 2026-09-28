/**
 * Block textures straight from mod jars: `assets/<modid>/textures/blocks/<path>.png`, looked up by the icon
 * name a sprite registers under (`gregtech:iconsets/MACHINE_CASING_SOLID_STEEL`, `minecraft:stone`, ...).
 *
 * Jars are only read, never written. The first jar that carries a file wins, so list the pinned mod jars
 * before anything that may hold an older copy.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';

const BLOCKS = /^assets\/([^/]+)\/textures\/blocks\/(.+)\.png$/;

/** Every `.jar` / `.zip` under the given files and directories (one level deep for directories). */
export function listJars(paths) {
  const out = [];
  for (const p of paths) {
    if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p).sort())
        if (/\.(jar|zip)$/i.test(f) && statSync(join(p, f)).isFile()) out.push(join(p, f));
    } else out.push(p);
  }
  return out;
}

export class TextureJars {
  /** @param {string[]} jars in priority order */
  constructor(jars) {
    /** `modid:path` (modid lower case) → PNG bytes */
    this.files = new Map();
    /** `modid:path` → jar it came from */
    this.origin = new Map();
    for (const jar of jars) {
      let entries;
      try {
        entries = unzipSync(readFileSync(jar), { filter: (f) => BLOCKS.test(f.name) });
      } catch (e) {
        console.warn(`skipping ${jar}: ${e.message}`);
        continue;
      }
      for (const [name, data] of Object.entries(entries)) {
        const m = BLOCKS.exec(name);
        const key = `${m[1].toLowerCase()}:${m[2]}`;
        if (this.files.has(key)) continue;
        this.files.set(key, data);
        this.origin.set(key, jar);
      }
    }
  }

  /** Normalised lookup key of an icon name: a bare name is a `minecraft` sprite, as TextureMap reads it. */
  static key(icon) {
    const i = icon.indexOf(':');
    const mod = i < 0 ? 'minecraft' : icon.slice(0, i);
    return `${mod.toLowerCase()}:${i < 0 ? icon : icon.slice(i + 1)}`;
  }

  /** PNG bytes of a sprite, or null when no jar carries it. */
  get(icon) {
    return this.files.get(TextureJars.key(icon)) ?? null;
  }

  /** Repo-style path of the sprite's file inside its jar, for the attribution list. */
  assetPath(icon) {
    const k = TextureJars.key(icon);
    const i = k.indexOf(':');
    return `assets/${k.slice(0, i)}/textures/blocks/${k.slice(i + 1)}.png`;
  }
}
