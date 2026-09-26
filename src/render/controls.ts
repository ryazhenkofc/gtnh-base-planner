import * as THREE from 'three';

/**
 * Minimal orbit controls (no three/examples dependency).
 * - Left drag: rotate. Right / middle drag or Shift + left drag: pan.
 * - Wheel (and trackpad pinch): zoom. Two fingers: pinch zoom + pan.
 * - Double click: reset to the home view.
 * - A press released without moving (single pointer) is reported through `onClick`.
 *
 * Camera placement uses spherical coordinates around `target`: `theta` is the azimuth measured from +Z
 * towards +X, `phi` the polar angle from +Y. With the defaults the camera sits south-east and above,
 * so +X points right/towards the viewer, +Z left/towards the viewer and +Y up (right-handed, not mirrored).
 */

export const DEFAULT_THETA = Math.PI / 4;
export const DEFAULT_PHI = 0.95;
const MIN_PHI = 0.05;
const MAX_PHI = Math.PI - 0.05;
const CLICK_SLOP_PX = 5;

export function orbitOffset(theta: number, phi: number, radius: number, out = new THREE.Vector3()) {
  const s = Math.sin(phi);
  return out.set(radius * s * Math.sin(theta), radius * Math.cos(phi), radius * s * Math.cos(theta));
}

const LINE_OFF = 2 ** 20;
const LINE_SPAN = 2 ** 21;

/** Keeps, for every line parallel to axis `a`, only its two extreme points. */
function lineExtremes(points: Iterable<readonly number[]>, a: 0 | 1 | 2): number[][] {
  const [b, c] = a === 0 ? [1, 2] : a === 1 ? [0, 2] : [0, 1];
  const lines = new Map<number, number[][]>();
  for (const p of points) {
    const k = (p[b] + LINE_OFF) * LINE_SPAN + (p[c] + LINE_OFF);
    const e = lines.get(k);
    if (!e) lines.set(k, [[...p], [...p]]);
    else if (p[a] < e[0][a]) e[0] = [...p];
    else if (p[a] > e[1][a]) e[1] = [...p];
  }
  const out: number[][] = [];
  for (const [lo, hi] of lines.values()) {
    if (lo[a] === hi[a]) out.push(lo);
    else out.push(lo, hi);
  }
  return out;
}

/**
 * Corners of unit cells, thinned for `fitView`: a corner strictly between two others on an axis-parallel
 * line is a convex combination of them, and `fitView` only takes maxima of convex functions of the points,
 * so dropping it never changes the fit. Keeps the extremes along x, then z, then y (usually a few hundred
 * points instead of eight per cell).
 */
export function fitPoints(cells: Iterable<readonly [number, number, number]>): THREE.Vector3[] {
  const lines = new Map<number, [number, number]>();
  for (const [x, y, z] of cells) {
    for (let dy = 0; dy < 2; dy++)
      for (let dz = 0; dz < 2; dz++) {
        const k = (y + dy + LINE_OFF) * LINE_SPAN + (z + dz + LINE_OFF);
        const e = lines.get(k);
        if (!e) lines.set(k, [x, x + 1]);
        else {
          if (x < e[0]) e[0] = x;
          if (x + 1 > e[1]) e[1] = x + 1;
        }
      }
  }
  const corners: number[][] = [];
  for (const [k, [x0, x1]] of lines) {
    const y = Math.floor(k / LINE_SPAN) - LINE_OFF;
    const z = (k % LINE_SPAN) - LINE_OFF;
    corners.push([x0, y, z], [x1, y, z]);
  }
  const thinned = lineExtremes(lineExtremes(corners, 2), 1);
  return thinned.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
}

/**
 * Camera target and distance so that every point fits the view when looking from (`theta`, `phi`).
 * The target is shifted sideways so the points are centred on screen. `fill` < 1 leaves a margin
 * (fraction of the half-extent of the view that may be used).
 */
export function fitView(
  points: readonly THREE.Vector3[],
  theta: number,
  phi: number,
  fovDeg: number,
  aspect: number,
  fill = 0.85,
): { target: THREE.Vector3; distance: number } {
  if (points.length === 0) return { target: new THREE.Vector3(), distance: 10 };
  const box = new THREE.Box3().setFromPoints(points as THREE.Vector3[]);
  const target = box.getCenter(new THREE.Vector3());
  const back = orbitOffset(theta, phi, 1); // unit vector towards the camera
  const right = new THREE.Vector3(0, 1, 0).cross(back).normalize();
  const up = new THREE.Vector3().crossVectors(back, right);
  const rel = new THREE.Vector3();

  // Centre the screen-plane extent (orthographic approximation), then solve the perspective distance.
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    rel.subVectors(p, target);
    const x = rel.dot(right);
    const y = rel.dot(up);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  target.addScaledVector(right, (x0 + x1) / 2).addScaledVector(up, (y0 + y1) / 2);

  const tanV = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2) * fill;
  const tanH = tanV * aspect;
  const solveDistance = (): number => {
    let d = 0;
    for (const p of points) {
      rel.subVectors(p, target);
      const z = rel.dot(back);
      d = Math.max(d, z + Math.abs(rel.dot(right)) / tanH, z + Math.abs(rel.dot(up)) / tanV);
    }
    return Math.max(d, 1);
  };
  let d = solveDistance();
  // Perspective makes near points look bigger: re-centre on the projected extent a few times.
  for (let iter = 0; iter < 4; iter++) {
    let a0 = Infinity;
    let a1 = -Infinity;
    let b0 = Infinity;
    let b1 = -Infinity;
    for (const p of points) {
      rel.subVectors(p, target);
      const depth = Math.max(1e-3, d - rel.dot(back));
      const a = rel.dot(right) / depth;
      const b = rel.dot(up) / depth;
      a0 = Math.min(a0, a);
      a1 = Math.max(a1, a);
      b0 = Math.min(b0, b);
      b1 = Math.max(b1, b);
    }
    target.addScaledVector(right, ((a0 + a1) / 2) * d).addScaledVector(up, ((b0 + b1) / 2) * d);
    d = solveDistance();
  }
  // Centring moved the target sideways, possibly off the build (below a long diagonal row, say), and
  // orbit and zoom pivot on it. Slide it along the view ray to the depth of the box centre (the camera
  // stays put), then onto the box itself, and re-solve the distance for that (slightly shifted) view.
  const s = rel.subVectors(box.getCenter(new THREE.Vector3()), target).dot(back);
  if (d - s >= 1) {
    target.addScaledVector(back, s);
    const onBox = box.clampPoint(target, new THREE.Vector3());
    if (!onBox.equals(target)) {
      target.copy(onBox);
      d = solveDistance();
    } else d -= s;
  }
  return { target, distance: d };
}

export interface OrbitHome {
  target: THREE.Vector3;
  radius: number;
  theta: number;
  phi: number;
}

export interface OrbitControlsOptions {
  onChange: () => void;
  onClick?: (event: PointerEvent) => void;
}

interface PointerInfo {
  x: number;
  y: number;
}

export class OrbitControls {
  readonly target = new THREE.Vector3();
  radius = 10;
  theta = DEFAULT_THETA;
  phi = DEFAULT_PHI;
  minRadius = 1;
  maxRadius = 1000;
  private home: OrbitHome = {
    target: new THREE.Vector3(),
    radius: 10,
    theta: DEFAULT_THETA,
    phi: DEFAULT_PHI,
  };
  private pointers = new Map<number, PointerInfo>();
  private mode: 'rotate' | 'pan' | 'pinch' | null = null;
  private pinchDist = 0;
  private pinchMid = { x: 0, y: 0 };
  private press: { x: number; y: number; id: number; clickable: boolean } | null = null;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();

  constructor(
    private readonly dom: HTMLElement,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly options: OrbitControlsOptions,
  ) {
    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('pointercancel', this.onPointerCancel);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('dblclick', this.onDoubleClick);
    dom.addEventListener('contextmenu', this.onContextMenu);
  }

  /** Set the view that `reset()` returns to. `keepAngles` keeps the current rotation. */
  setHome(target: THREE.Vector3, radius: number, keepAngles = false): void {
    this.home = {
      target: target.clone(),
      radius,
      theta: keepAngles ? this.theta : DEFAULT_THETA,
      phi: keepAngles ? this.phi : DEFAULT_PHI,
    };
    this.minRadius = Math.max(0.5, radius * 0.05);
    this.maxRadius = Math.max(50, radius * 8);
  }

  reset(): void {
    this.target.copy(this.home.target);
    this.radius = this.home.radius;
    this.theta = this.home.theta;
    this.phi = this.home.phi;
    this.update();
  }

  /** Place the camera from the spherical state and notify. */
  update(): void {
    this.phi = Math.min(MAX_PHI, Math.max(MIN_PHI, this.phi));
    this.radius = Math.min(this.maxRadius, Math.max(this.minRadius, this.radius));
    this.camera.position.copy(this.target).add(orbitOffset(this.theta, this.phi, this.radius, this.tmp));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target);
    this.options.onChange();
  }

  rotate(dxPx: number, dyPx: number): void {
    const h = Math.max(1, this.dom.clientHeight);
    this.theta -= (2 * Math.PI * dxPx) / h;
    this.phi -= (Math.PI * dyPx) / h;
    this.update();
  }

  /** Move the target so the scene follows the pointer. */
  pan(dxPx: number, dyPx: number): void {
    const h = Math.max(1, this.dom.clientHeight);
    const worldPerPx = (2 * this.radius * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)) / h;
    this.camera.updateMatrix();
    const right = this.tmp.setFromMatrixColumn(this.camera.matrix, 0);
    const up = this.tmp2.setFromMatrixColumn(this.camera.matrix, 1);
    this.target.addScaledVector(right, -dxPx * worldPerPx).addScaledVector(up, dyPx * worldPerPx);
    this.update();
  }

  zoom(factor: number): void {
    this.radius *= factor;
    this.update();
  }

  dispose(): void {
    const dom = this.dom;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('pointercancel', this.onPointerCancel);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('dblclick', this.onDoubleClick);
    dom.removeEventListener('contextmenu', this.onContextMenu);
    this.pointers.clear();
  }

  private pinchState(): { dist: number; mid: { x: number; y: number } } {
    const [a, b] = [...this.pointers.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  private onPointerDown = (e: PointerEvent): void => {
    try {
      this.dom.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events may not be capturable; controls still work without capture.
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      const pan = e.button === 1 || e.button === 2 || e.shiftKey;
      this.mode = pan ? 'pan' : 'rotate';
      this.press = { x: e.clientX, y: e.clientY, id: e.pointerId, clickable: e.button === 0 };
    } else if (this.pointers.size === 2) {
      this.mode = 'pinch';
      const s = this.pinchState();
      this.pinchDist = s.dist;
      this.pinchMid = s.mid;
      if (this.press) this.press.clickable = false;
    } else if (this.press) {
      this.press.clickable = false;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.press && this.press.id === e.pointerId) {
      if (Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > CLICK_SLOP_PX)
        this.press.clickable = false;
    }
    if (this.mode === 'rotate') this.rotate(dx, dy);
    else if (this.mode === 'pan') this.pan(dx, dy);
    else if (this.mode === 'pinch' && this.pointers.size >= 2) {
      const s = this.pinchState();
      if (s.dist > 0 && this.pinchDist > 0) this.radius *= this.pinchDist / s.dist;
      const mdx = s.mid.x - this.pinchMid.x;
      const mdy = s.mid.y - this.pinchMid.y;
      this.pinchDist = s.dist;
      this.pinchMid = s.mid;
      this.pan(mdx, mdy); // also calls update()
    }
  };

  private endPointer(e: PointerEvent, allowClick: boolean): void {
    if (!this.pointers.delete(e.pointerId)) return;
    const press = this.press;
    if (press && press.id === e.pointerId) {
      this.press = null;
      if (allowClick && press.clickable && this.pointers.size === 0) this.options.onClick?.(e);
    }
    if (this.pointers.size === 0) this.mode = null;
    else if (this.pointers.size === 1) {
      // Finishing a pinch with one finger left: continue as a rotate without a jump.
      this.mode = 'rotate';
      if (this.press) this.press.clickable = false;
    } else {
      const s = this.pinchState();
      this.pinchDist = s.dist;
      this.pinchMid = s.mid;
    }
  }

  private onPointerUp = (e: PointerEvent): void => this.endPointer(e, true);
  private onPointerCancel = (e: PointerEvent): void => this.endPointer(e, false);

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    // Trackpad pinch arrives as ctrl+wheel with small deltas; make it a bit stronger.
    const speed = e.ctrlKey ? 0.01 : 0.0015;
    this.zoom(Math.exp(e.deltaY * unit * speed));
  };

  private onDoubleClick = (e: MouseEvent): void => {
    e.preventDefault();
    this.reset();
  };

  private onContextMenu = (e: Event): void => e.preventDefault();
}
