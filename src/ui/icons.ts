import type { TextureManifest } from '../render/detailed';
import textureManifest from '../render/textures.json';
import type { IconFace, IconFaces } from './catalogView';

const TEXTURES = textureManifest as unknown as TextureManifest;

/**
 * Picker icons: an isometric block drawn on a canvas from the DETAILED-view texture atlas.
 * Faces are drawn flat first and repainted once the atlas loads (or stay flat if it fails).
 */

/** Icon geometry in a 60×60 box: face origin, u axis and v axis (the same cube the SVG tiles used). */
const FACES: Record<
  keyof IconFaces,
  { origin: [number, number]; u: [number, number]; v: [number, number]; shade: number }
> = {
  top: { origin: [8, 20], u: [22, -12], v: [22, 12], shade: 0 },
  left: { origin: [8, 20], u: [22, 12], v: [0, 24], shade: 0.18 },
  right: { origin: [30, 32], u: [22, -12], v: [0, 24], shade: 0.34 },
};
const BOX = 60;

let atlas: Promise<HTMLImageElement | null> | null = null;

function loadAtlas(): Promise<HTMLImageElement | null> {
  atlas ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = import.meta.env.BASE_URL + TEXTURES.atlas.path;
  });
  return atlas;
}

/** A face's 16×16 texture (tiles composited, then shaded), or null if it has no tiles. */
function faceTexture(img: HTMLImageElement, face: IconFace, shade: number): HTMLCanvasElement | null {
  if (face.tiles.length === 0) return null;
  const size = TEXTURES.atlas.tile;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  for (const name of face.tiles) {
    const [x, y, w, h] = TEXTURES.tiles[name];
    ctx.drawImage(img, x, y, w, h, 0, 0, size, size);
  }
  if (shade > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0, 0, 0, ${shade})`;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

function draw(canvas: HTMLCanvasElement, faces: IconFaces, img: HTMLImageElement | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = canvas.width / BOX;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (const key of ['top', 'left', 'right'] as const) {
    const { origin, u, v, shade } = FACES[key];
    const tex = img ? faceTexture(img, faces[key], shade) : null;
    const k = scale / (tex ? tex.width : 1);
    ctx.setTransform(u[0] * k, u[1] * k, v[0] * k, v[1] * k, origin[0] * scale, origin[1] * scale);
    if (tex) {
      ctx.drawImage(tex, 0, 0);
    } else {
      ctx.fillStyle = faces[key].color;
      ctx.fillRect(0, 0, 1, 1);
    }
  }
}

/** Svelte action: `<canvas use:blockIcon={faces}>` sized by CSS; draws at device resolution. */
export function blockIcon(canvas: HTMLCanvasElement, faces: IconFaces) {
  let current = faces;
  let alive = true;
  const px = Math.round((canvas.clientWidth || 72) * (window.devicePixelRatio || 1));
  canvas.width = canvas.height = px;
  draw(canvas, current, null);
  void loadAtlas().then((img) => {
    if (alive && img) draw(canvas, current, img);
  });
  return {
    update(next: IconFaces) {
      current = next;
      void loadAtlas().then((img) => {
        if (alive) draw(canvas, current, img);
      });
    },
    destroy() {
      alive = false;
    },
  };
}
