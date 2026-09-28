import * as THREE from 'three';
import { blockInfo } from '../data/blocks';
import type { HatchKind } from '../model/multiblock/types';
import { BOX_FACE_ORDER, type BlockVisual, type MaterialProvider } from './materials';

const TEX = 16;

/**
 * Greyscale mask texture multiplied with the flat colour: a thin darker border outlines every block
 * (so walls read as individual blocks) and `front` adds a small dark square (controller front mark).
 */
function maskTexture(front: boolean): THREE.DataTexture {
  const data = new Uint8Array(TEX * TEX * 4);
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const edge = x === 0 || y === 0 || x === TEX - 1 || y === TEX - 1;
      const mark = front && x >= 5 && x <= 10 && y >= 5 && y <= 10;
      const v = mark ? 70 : edge ? 205 : 255;
      const i = (y * TEX + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, TEX, TEX, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Flat colour of a visual in SIMPLE view: hatches use the hatch colour, others the block colour. */
export function simpleColor(visual: BlockVisual, colors: Record<HatchKind, string>): string {
  if (visual.kind === 'hatch' && visual.hatchKind) {
    const c = colors[visual.hatchKind];
    if (c) return c;
  }
  return blockInfo(visual.blockId).color;
}

/** SIMPLE view: flat Lambert colours from `blocks.ts`, hatch colours by kind, a dark mark on controller fronts. */
export function createSimpleProvider(): MaterialProvider {
  let plainMask: THREE.DataTexture | null = null;
  let frontMask: THREE.DataTexture | null = null;
  const plain = new Map<string, THREE.MeshLambertMaterial>();
  const front = new Map<string, THREE.MeshLambertMaterial>();

  function material(color: string, withMark: boolean): THREE.MeshLambertMaterial {
    const cache = withMark ? front : plain;
    let m = cache.get(color);
    if (!m) {
      const map = withMark ? (frontMask ??= maskTexture(true)) : (plainMask ??= maskTexture(false));
      m = new THREE.MeshLambertMaterial({ color: new THREE.Color(color), map });
      cache.set(color, m);
    }
    return m;
  }

  return {
    mode: 'simple',
    load: () => Promise.resolve(),
    materials(visual, colors) {
      const color = simpleColor(visual, colors);
      const markIndex =
        visual.kind === 'controller' && visual.facing ? BOX_FACE_ORDER.indexOf(visual.facing) : -1;
      return BOX_FACE_ORDER.map((_, i) => material(color, i === markIndex));
    },
    dispose() {
      for (const m of plain.values()) m.dispose();
      for (const m of front.values()) m.dispose();
      plain.clear();
      front.clear();
      plainMask?.dispose();
      frontMask?.dispose();
      plainMask = frontMask = null;
    },
  };
}
