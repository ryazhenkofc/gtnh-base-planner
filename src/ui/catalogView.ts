import { blockInfo } from '../data/blocks';
import type { HatchKind, MultiblockDef } from '../model/types';
import type { TextureManifest } from '../render/detailed';
import textureManifest from '../render/textures.json';

const TEXTURES = textureManifest as unknown as TextureManifest;

const ALL_KINDS: HatchKind[] = [
  'itemIn',
  'itemOut',
  'fluidIn',
  'fluidOut',
  'energy',
  'dynamo',
  'maintenance',
  'muffler',
];

/** The block id used by most structure cells (used as the picker tile colour). */
export function dominantBlockId(def: MultiblockDef): string {
  const counts = new Map<string, number>();
  for (const layer of def.layers) {
    for (const row of layer) {
      for (const ch of row) {
        const entry = def.legend[ch];
        if (entry) counts.set(entry.blockId, (counts.get(entry.blockId) ?? 0) + 1);
      }
    }
  }
  let best = def.controller.blockId;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN || (n === bestN && id < best)) {
      best = id;
      bestN = n;
    }
  }
  return best;
}

/** Hatch kinds a multiblock can take, in a stable order. */
export function hatchKindsOf(def: MultiblockDef): HatchKind[] {
  const present = new Set<HatchKind>();
  for (const entry of Object.values(def.legend)) for (const k of entry.hatches ?? []) present.add(k);
  return ALL_KINDS.filter((k) => present.has(k));
}

/** Multiply an `#rrggbb` colour's channels by `factor` (0..2), clamped. */
export function shade(hex: string, factor: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.min(255, Math.max(0, Math.round(c * factor))),
  );
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}

export interface TileColors {
  top: string;
  left: string;
  right: string;
}

/** Three faces of the isometric preview cube. */
export function tileColors(def: MultiblockDef): TileColors {
  const base = blockInfo(dominantBlockId(def)).color;
  return { top: shade(base, 1.15), left: shade(base, 0.9), right: shade(base, 0.72) };
}

/** One face of the picker icon: atlas tiles (drawn in order) and the flat fallback colour. */
export interface IconFace {
  tiles: string[];
  color: string;
}

export interface IconFaces {
  top: IconFace;
  /** Shows the controller front, as in game. */
  left: IconFace;
  right: IconFace;
}

/**
 * Textured faces of the picker icon: the dominant casing on every face, with the controller's
 * front overlay on the left one. Tiles missing from the atlas are dropped (the face goes flat).
 */
export function iconFaces(def: MultiblockDef, manifest: TextureManifest = TEXTURES): IconFaces {
  const colors = tileColors(def);
  const casing = manifest.blocks[dominantBlockId(def)];
  const front = manifest.blocks[def.controller.blockId]?.front;
  const known = (name: string | undefined): name is string => !!name && name in manifest.tiles;
  const face = (base: string | undefined, color: string, overlay?: string): IconFace => {
    if (!casing || casing.flat || !known(base)) return { tiles: [], color };
    return { tiles: known(overlay) ? [base, overlay] : [base], color };
  };
  return {
    top: face(casing?.top ?? casing?.side, colors.top),
    left: face(casing?.side, colors.left, front),
    right: face(casing?.side, colors.right),
  };
}

const iconCache = new Map<string, IconFaces>();

/** `iconFaces`, computed once per multiblock id (the catalog is static). */
export function cachedIconFaces(def: MultiblockDef): IconFaces {
  let faces = iconCache.get(def.id);
  if (!faces) {
    faces = iconFaces(def);
    iconCache.set(def.id, faces);
  }
  return faces;
}

/** Case-insensitive match on name, tier and id. */
export function matchesQuery(def: MultiblockDef, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [def.name, def.tier ?? '', def.id].some((s) => s.toLowerCase().includes(q));
}
