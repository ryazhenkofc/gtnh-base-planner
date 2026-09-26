import * as THREE from 'three';
import { dirVec, key } from '../model/geometry';
import { isCable } from '../model/routing';
import type { Dir, SceneModel, Vec3, ViewMode, Voxel } from '../model/types';
import { DEFAULT_PHI, DEFAULT_THETA, fitPoints, fitView, OrbitControls } from './controls';
import type { BlockVisual, MaterialProvider } from './materials';
import { createSimpleProvider } from './simple';

export interface RendererOptions {
  /** Called with the unit ids under the pointer on click (empty array = background or a pipe). */
  onPick?: (unitIds: number[]) => void;
  /** Called on click with the id of the net (`RouteNet.id`) under the pointer, or null. */
  onPickNet?: (netId: number | null) => void;
  /** Called after a frame when the camera azimuth (`OrbitControls.theta`, radians) changed. */
  onView?: (theta: number) => void;
  /** Keep the drawing buffer after compositing so tests can read pixels back. Default false. */
  preserveDrawingBuffer?: boolean;
}

export interface Renderer {
  setScene(model: SceneModel): void;
  setViewMode(mode: ViewMode): Promise<void>;
  setXray(on: boolean): void;
  setSelected(unitIds: number[]): void;
  /** Animate flow arrows along nets that carry `flows` (site view). */
  setFlowAnimation(on: boolean): void;
  /** Reset camera to fit the scene. */
  resetView(): void;
  resize(): void;
  dispose(): void;
}

/** Extras for tests and diagnostics; not needed by the UI. */
export interface RendererDebug {
  /** The view mode actually in use (DETAILED falls back to SIMPLE when unavailable). */
  readonly viewMode: ViewMode;
  /** Render `frames` frames synchronously (camera slowly orbiting) and return the mean ms per frame. */
  benchmark(frames: number): number;
  /** Draw calls / triangles of the last frame and number of voxel instances. */
  info(): { calls: number; triangles: number; instances: number };
  /** Look from (`theta`, `phi`) (radians, `phi` from straight up) and refit the scene. */
  setAngles(theta: number, phi: number): void;
}

const CASING_XRAY_OPACITY = 0.1;
const CONFLICT_COLOR = '#e5484d';
const SELECT_TINT = '#3b82f6';
const SELECT_LINE = '#111111';
/** Pipe thickness: square like GT pipes, 6/16 of a block (a small pipe). */
const PIPE_WIDTH = 6 / 16;
/** Cable thickness: thinner than pipes (a 2x GT cable), so the two read apart at a glance. */
const CABLE_WIDTH = 3 / 16;
/** Flow arrows: wider than a pipe so they show around it, and their speed (blocks per second). */
const FLOW_RADIUS = 0.25;
const FLOW_LENGTH = 0.34;
const FLOW_SPEED = 1.2;
const DIM_OPACITY = 0.14;
const GRID_COLOR = '#e4e2dd';
const SITE_EDGE_COLOR = '#8f8b84';
const SITE_FLOOR_COLOR = '#f6f5f2';
/** Dimension lines beside the build or site: colours, and gap from the edge (blocks). */
const DIM_COLOR = '#aaa69f';
const DIM_TEXT = '#6f6b65';
const DIM_GAP = 1.2;
const GIZMO_PX = 96;
const GIZMO_MARGIN_PX = 14;
const AXIS_COLORS = { x: '#d9534f', y: '#4caf50', z: '#3b7dd8' } as const;

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function dirVector(d: Dir): THREE.Vector3 {
  const v = dirVec(d);
  return new THREE.Vector3(v[0], v[1], v[2]);
}

function center(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p[0] + 0.5, p[1] + 0.5, p[2] + 0.5);
}

function visualKey(v: Voxel): string {
  return `${v.blockId}|${v.kind}|${v.hatchKind ?? ''}|${v.facing ?? ''}|${v.conflict ? 1 : 0}`;
}

interface VoxelBatch {
  mesh: THREE.InstancedMesh;
  /** Instance id -> index into `model.voxels`. */
  indices: number[];
  kind: Voxel['kind'];
  conflict: boolean;
  /** A single material when all six faces match (one draw call instead of six). */
  baseMaterials: THREE.Material | THREE.Material[];
}

/**
 * A label drawn at a constant size on screen, above everything (site groups and ports). `swatch` adds a
 * coloured dot before the text (the text itself stays dark, so light colours remain readable).
 */
function textSprite(
  text: string,
  swatch: string | undefined,
  small: boolean,
  textColor = '#222222',
): THREE.Sprite {
  const px = small ? 26 : 30;
  const font = `500 ${px}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  const dot = swatch ? px * 0.9 : 0;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  let w = 64;
  if (ctx) {
    ctx.font = font;
    w = Math.ceil(ctx.measureText(text).width + dot) + 16;
  }
  const h = Math.round(px * 1.5);
  c.width = w;
  c.height = h;
  if (ctx) {
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeText(text, 8 + dot, h / 2 + 1);
    ctx.fillStyle = textColor;
    ctx.fillText(text, 8 + dot, h / 2 + 1);
    if (swatch) {
      ctx.beginPath();
      ctx.arc(8 + px * 0.3, h / 2, px * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8 + px * 0.3, h / 2, px * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = swatch;
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false, transparent: true }),
  );
  // With sizeAttenuation off the scale is relative to the view at distance 1 (fov 30°: 0.54 units high),
  // so these are about 14 and 12 px on a 720 px tall view.
  const height = small ? 0.0105 : 0.0122;
  sprite.scale.set((height * w) / h, height, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Text label for the axis gizmo. */
function labelSprite(text: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.font = '600 38px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 32, 34);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.setScalar(0.7);
  return sprite;
}

function buildGizmo(): THREE.Scene {
  const scene = new THREE.Scene();
  const shaft = new THREE.CylinderGeometry(0.045, 0.045, 1, 10);
  shaft.translate(0, 0.5, 0);
  const tip = new THREE.ConeGeometry(0.11, 0.26, 14);
  tip.translate(0, 1.08, 0);
  const axes: [string, THREE.Vector3, string][] = [
    ['X', new THREE.Vector3(1, 0, 0), AXIS_COLORS.x],
    ['Y', new THREE.Vector3(0, 1, 0), AXIS_COLORS.y],
    ['Z', new THREE.Vector3(0, 0, 1), AXIS_COLORS.z],
  ];
  for (const [label, dir, color] of axes) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir);
    for (const g of [shaft, tip]) {
      const m = new THREE.Mesh(g, mat);
      m.quaternion.copy(q);
      scene.add(m);
    }
    const s = labelSprite(label, color);
    s.position.copy(dir).multiplyScalar(1.55);
    scene.add(s);
  }
  scene.add(
    new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#9a9a9a' })),
  );
  return scene;
}

function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
      (m as THREE.SpriteMaterial).map?.dispose();
      m.dispose();
    }
  });
}

/**
 * UNIT 6 — Three.js renderer. Must not produce a mirrored image (right-handed, Y up).
 * SIMPLE materials come from `./simple.ts`; DETAILED from `createDetailedProvider()` in `./detailed.ts` (UNIT 7).
 *
 * Rendering is on demand (a frame is drawn only after something changed), voxels are drawn as one
 * InstancedMesh per distinct visual, so a 60-unit plan is a few dozen draw calls.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions = {},
): Renderer & RendererDebug {
  const gl = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
  });
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  gl.setClearColor(0xffffff, 1);
  gl.autoClear = false;
  gl.info.autoReset = false; // count main pass + gizmo together

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cf, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  scene.add(sun);
  scene.add(sun.target);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 5000);
  const content = new THREE.Group();
  const selection = new THREE.Group();
  scene.add(content, selection);

  const gizmo = buildGizmo();
  const gizmoCamera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 10);

  // Shared geometries and renderer-owned materials (provider materials are never disposed here).
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  // Pipes and markers are a few pixels wide on screen: modest segment counts keep large plans light.
  const discGeo = new THREE.CircleGeometry(0.19, 20);
  const ringGeo = new THREE.RingGeometry(0.19, 0.28, 24);
  const pipeGeo = new THREE.BoxGeometry(PIPE_WIDTH, 1, PIPE_WIDTH);
  const jointGeo = new THREE.BoxGeometry(PIPE_WIDTH, PIPE_WIDTH, PIPE_WIDTH);
  const conflictMat = new THREE.MeshLambertMaterial({ color: CONFLICT_COLOR });
  const markerOpts = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  const discMat = new THREE.MeshBasicMaterial({ color: 0xffffff, ...markerOpts });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, ...markerOpts });
  const pipeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const pipeDimMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: DIM_OPACITY,
    depthWrite: false,
  });
  const flowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const gridMat = new THREE.LineBasicMaterial({ color: GRID_COLOR });
  const edgeMat = new THREE.LineBasicMaterial({ color: SITE_EDGE_COLOR });
  const dimMat = new THREE.LineBasicMaterial({ color: DIM_COLOR });
  const floorMat = new THREE.MeshBasicMaterial({
    color: SITE_FLOOR_COLOR,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });
  const tintMat = new THREE.MeshBasicMaterial({
    color: SELECT_TINT,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const lineMat = new THREE.LineBasicMaterial({ color: SELECT_LINE });
  const flowGeo = new THREE.ConeGeometry(FLOW_RADIUS, FLOW_LENGTH, 10);
  const ownedMaterials: THREE.Material[] = [
    conflictMat,
    discMat,
    ringMat,
    pipeMat,
    pipeDimMat,
    flowMat,
    gridMat,
    edgeMat,
    dimMat,
    floorMat,
    tintMat,
    lineMat,
  ];
  const sharedGeometries = [boxGeo, discGeo, ringGeo, pipeGeo, jointGeo, flowGeo];

  const simpleProvider = createSimpleProvider();
  let detailedProvider: MaterialProvider | null = null;
  let detailedLoad: Promise<MaterialProvider> | null = null;
  let provider: MaterialProvider = simpleProvider;
  let modeRequest = 0;

  let model: SceneModel | null = null;
  /** Points `fit` frames (see `scenePoints`), computed once per scene. */
  let points: THREE.Vector3[] = scenePoints(null);
  let batches: VoxelBatch[] = [];
  /** Pipe meshes and the net id of each instance, for picking. */
  let pipeBatches: { mesh: THREE.InstancedMesh; netIds: number[] }[] = [];
  /** Flow arrows: one instance per directed step, moved every frame while animating. */
  let flows: {
    mesh: THREE.InstancedMesh;
    steps: { a: THREE.Vector3; d: THREE.Vector3; q: THREE.Quaternion }[];
  } | null = null;
  let flowOn = true;
  const clock = typeof performance === 'undefined' ? () => Date.now() : () => performance.now();
  let selected = new Set<number>();
  let xray = false;
  const xrayMaterials = new Map<string, THREE.Material>();
  let fittedBoundsKey = '';
  let autoFit = true;
  let disposed = false;
  let frame = 0;
  let reportedTheta = NaN;
  let width = 0;
  let height = 0;

  const controls = new OrbitControls(canvas, camera, {
    onChange: requestRender,
    onClick: pick,
  });
  const stopAutoFit = (): void => {
    autoFit = false;
  };
  canvas.addEventListener('pointerdown', stopAutoFit);
  canvas.addEventListener('wheel', stopAutoFit, { passive: true });

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => resize());
  resizeObserver?.observe(canvas);

  // ---------------------------------------------------------------- frame

  function requestRender(): void {
    if (disposed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
      // Flow arrows keep moving: draw again next frame while they are shown and the page is visible.
      if (flows && flowOn && !(typeof document !== 'undefined' && document.hidden)) requestRender();
    });
  }

  function updateFlows(): void {
    if (!flows) return;
    const t = flowOn ? ((clock() / 1000) * FLOW_SPEED) % 1 : 0.5;
    const m = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    flows.steps.forEach((s, i) => {
      p.copy(s.a).addScaledVector(s.d, t);
      flows!.mesh.setMatrixAt(i, m.compose(p, s.q, one));
    });
    flows.mesh.instanceMatrix.needsUpdate = true;
  }

  function draw(): void {
    if (disposed) return;
    updateFlows();
    gl.info.reset();
    camera.updateMatrixWorld();
    // Light follows the camera a little (from its upper right) so the visible faces stay readable.
    const offset = camera.position.clone().sub(controls.target);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    sun.position
      .copy(controls.target)
      .add(offset)
      .addScaledVector(right, offset.length() * 0.6);
    sun.position.y += offset.length() * 0.8;
    sun.target.position.copy(controls.target);

    gl.setViewport(0, 0, width, height);
    gl.clear();
    gl.render(scene, camera);

    gizmoCamera.quaternion.copy(camera.quaternion);
    gizmoCamera.position.set(0, 0, 4).applyQuaternion(camera.quaternion);
    gl.clearDepth();
    gl.setViewport(GIZMO_MARGIN_PX, GIZMO_MARGIN_PX, GIZMO_PX, GIZMO_PX);
    gl.render(gizmo, gizmoCamera);
    gl.setViewport(0, 0, width, height);

    if (options.onView && controls.theta !== reportedTheta) {
      reportedTheta = controls.theta;
      options.onView(reportedTheta);
    }
  }

  function resize(): void {
    if (disposed) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0 || (w === width && h === height)) return;
    width = w;
    height = h;
    gl.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (autoFit && model) fit(false);
    requestRender();
  }

  // ---------------------------------------------------------------- camera

  /** The corners of every occupied cell (voxels and pipe cells) that can affect the fit. */
  function scenePoints(m: SceneModel | null): THREE.Vector3[] {
    function* cells(): Generator<Vec3> {
      if (m?.site) {
        yield [0, 0, 0];
        yield [m.site.size[0] - 1, 0, m.site.size[1] - 1];
      }
      // One more block south and east of the dimensioned area keeps its lines in view.
      if (m?.dimensions) {
        const { max, y } = m.dimensions;
        const more = Math.ceil(DIM_GAP);
        yield [Math.ceil(max[0]) - 1 + more, Math.floor(y), Math.ceil(max[1]) - 1 + more];
      }
      for (const v of m?.voxels ?? []) yield v.pos;
      for (const net of m?.pipes ?? []) for (const path of net.paths) yield* path;
    }
    const out = fitPoints(cells());
    return out.length > 0 ? out : fitPoints([[0, 0, 0]]);
  }

  /** Aim the camera at the whole scene. `keepAngles` keeps the user's rotation. */
  function fit(keepAngles: boolean): void {
    const r = Math.max(1, new THREE.Box3().setFromPoints(points).getSize(new THREE.Vector3()).length() / 2);
    const theta = keepAngles ? controls.theta : DEFAULT_THETA;
    const phi = keepAngles ? controls.phi : DEFAULT_PHI;
    const { target, distance: dist } = fitView(points, theta, phi, camera.fov, camera.aspect);
    // Zoom range is 0.05x .. 8x the fitted distance (see OrbitControls.setHome).
    camera.near = Math.max(0.05, Math.min(r * 0.01, dist * 0.02));
    camera.far = dist * 10 + r * 4;
    camera.updateProjectionMatrix();
    controls.setHome(target, dist, keepAngles);
    controls.reset();
  }

  // ---------------------------------------------------------------- scene building

  function clearContent(): void {
    for (const child of [...content.children]) {
      content.remove(child);
      if (child instanceof THREE.InstancedMesh) child.dispose();
      else if (child instanceof THREE.Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      } else if (child instanceof THREE.LineSegments || child instanceof THREE.Mesh) child.geometry.dispose();
    }
    batches = [];
    pipeBatches = [];
    flows = null;
    for (const m of xrayMaterials.values()) m.dispose();
    xrayMaterials.clear();
  }

  function xrayMaterial(base: THREE.Material, opacity: number): THREE.Material {
    const k = `${base.uuid}|${opacity}`;
    let m = xrayMaterials.get(k);
    if (!m) {
      m = base.clone();
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
      xrayMaterials.set(k, m);
    }
    return m;
  }

  /** X-ray fades the casings; controllers, hatches and conflicts stay solid so they can be found. */
  function applyXray(): void {
    for (const b of batches) {
      if (b.conflict || b.kind === 'hatch' || b.kind === 'controller' || !xray) {
        b.mesh.material = b.baseMaterials;
        b.mesh.renderOrder = 0;
        continue;
      }
      const base = b.baseMaterials;
      b.mesh.material = Array.isArray(base)
        ? base.map((m) => xrayMaterial(m, CASING_XRAY_OPACITY))
        : xrayMaterial(base, CASING_XRAY_OPACITY);
      b.mesh.renderOrder = 1;
    }
  }

  function buildVoxels(m: SceneModel): void {
    const groups = new Map<string, number[]>();
    m.voxels.forEach((v, i) => {
      const k = visualKey(v);
      const list = groups.get(k);
      if (list) list.push(i);
      else groups.set(k, [i]);
    });
    const matrix = new THREE.Matrix4();
    for (const indices of groups.values()) {
      const first = m.voxels[indices[0]];
      const visual: BlockVisual = {
        blockId: first.blockId,
        kind: first.kind,
        facing: first.facing,
        hatchKind: first.hatchKind,
      };
      const conflict = !!first.conflict;
      const faces = conflict ? [conflictMat] : provider.materials(visual, m.colors);
      const baseMaterials = faces.every((f) => f === faces[0]) ? faces[0] : faces;
      const mesh = new THREE.InstancedMesh(boxGeo, baseMaterials, indices.length);
      indices.forEach((vi, n) => {
        const p = m.voxels[vi].pos;
        mesh.setMatrixAt(n, matrix.makeTranslation(p[0] + 0.5, p[1] + 0.5, p[2] + 0.5));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      content.add(mesh);
      batches.push({ mesh, indices, kind: first.kind, conflict, baseMaterials });
    }
  }

  /** A white ring with a disc in the hatch colour on each hatch's outward face. */
  function buildHatchMarkers(m: SceneModel): void {
    const marks =
      m.markers ??
      m.voxels
        .filter((v) => v.kind === 'hatch' && v.facing)
        .map((v) => ({
          pos: v.pos,
          face: v.facing!,
          color: v.hatchKind ? m.colors[v.hatchKind] : '#ffffff',
        }));
    if (marks.length === 0) return;
    const discs = new THREE.InstancedMesh(discGeo, discMat, marks.length);
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, marks.length);
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const color = new THREE.Color();
    marks.forEach((v, i) => {
      const n = dirVector(v.face);
      q.setFromUnitVectors(Z_AXIS, n);
      matrix.compose(center(v.pos).addScaledVector(n, 0.502), q, one);
      discs.setMatrixAt(i, matrix);
      rings.setMatrixAt(i, matrix);
      discs.setColorAt(i, color.set(v.color));
    });
    for (const mesh of [discs, rings]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      content.add(mesh);
    }
    if (discs.instanceColor) discs.instanceColor.needsUpdate = true;
  }

  /**
   * Pipes as square beams through cell centres, like GT pipes. Straight runs are merged into one beam; each
   * beam reaches half a pipe width past its end cells, so bends and junctions close into solid corners.
   * A path of a single cell is a cube. Cables (energy, dynamo) use the same shapes, thinner.
   */
  function buildPipes(m: SceneModel): void {
    if (!m.pipes || m.pipes.length === 0) return;
    /** `w`: section scale relative to `PIPE_WIDTH`. */
    const segments: {
      a: THREE.Vector3;
      b: THREE.Vector3;
      color: string;
      w: number;
      net: number;
      dim: boolean;
    }[] = [];
    const cubes: { p: THREE.Vector3; color: string; w: number; net: number; dim: boolean }[] = [];
    const steps: { a: THREE.Vector3; d: THREE.Vector3; q: THREE.Quaternion; color: string }[] = [];
    m.pipes.forEach((net, ni) => {
      const color = net.color ?? m.colors[net.kind];
      const netId = net.id ?? -1 - ni;
      const dim = !!net.dim;
      const w = isCable(net.kind) ? CABLE_WIDTH / PIPE_WIDTH : 1;
      const half = (PIPE_WIDTH * w) / 2;
      /** A beam from `a` to `b`, lengthened by `extA` / `extB` beyond them. */
      const beam = (a: THREE.Vector3, b: THREE.Vector3, extA: number, extB: number): void => {
        const dir = new THREE.Vector3().subVectors(b, a).normalize();
        segments.push({
          a: a.clone().addScaledVector(dir, -extA),
          b: b.clone().addScaledVector(dir, extB),
          color,
          w,
          net: netId,
          dim,
        });
      };
      const cells = new Set<string>();
      for (const path of net.paths) {
        path.forEach((p) => cells.add(key(p)));
        const pts = path.map(center);
        if (pts.length === 1) cubes.push({ p: pts[0], color, w, net: netId, dim });
        let start = 0;
        for (let i = 1; i < pts.length; i++) {
          const last = i === pts.length - 1;
          const bend =
            !last &&
            new THREE.Vector3()
              .subVectors(pts[i], pts[i - 1])
              .normalize()
              .distanceTo(new THREE.Vector3().subVectors(pts[i + 1], pts[i]).normalize()) > 1e-6;
          if (last || bend) {
            beam(pts[start], pts[i], half, half);
            start = i;
          }
        }
      }
      // Stubs from each hatch face to the pipe cell in front of it (starting at the face, not inside it).
      for (const h of m.hatches) {
        if (h.net !== undefined && net.id !== undefined ? h.net !== net.id : h.kind !== net.kind) continue;
        const v = dirVec(h.face);
        const front: Vec3 = [h.cell[0] + v[0], h.cell[1] + v[1], h.cell[2] + v[2]];
        if (!cells.has(key(front))) continue;
        beam(center(h.cell).addScaledVector(dirVector(h.face), 0.5), center(front), 0, half);
      }
      if (!dim)
        for (const [a, b] of net.flows ?? []) {
          const pa = center(a);
          const d = center(b).sub(pa);
          steps.push({
            a: pa,
            d,
            q: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, d.clone().normalize()),
            color,
          });
        }
    });
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    for (const dim of [false, true]) {
      const list = segments.filter((s) => s.dim === dim);
      if (list.length === 0) continue;
      const beams = new THREE.InstancedMesh(pipeGeo, dim ? pipeDimMat : pipeMat, list.length);
      list.forEach((s, i) => {
        const d = new THREE.Vector3().subVectors(s.b, s.a);
        const len = d.length();
        // Beams are axis-aligned, so turning +Y onto the run keeps the square section axis-aligned too.
        q.setFromUnitVectors(Y_AXIS, len > 0 ? d.divideScalar(len) : Y_AXIS);
        matrix.compose(
          new THREE.Vector3().addVectors(s.a, s.b).multiplyScalar(0.5),
          q,
          scale.set(s.w, len, s.w),
        );
        beams.setMatrixAt(i, matrix);
        beams.setColorAt(i, color.set(s.color));
      });
      beams.instanceMatrix.needsUpdate = true;
      if (beams.instanceColor) beams.instanceColor.needsUpdate = true;
      beams.computeBoundingSphere();
      if (dim) beams.renderOrder = 1;
      content.add(beams);
      pipeBatches.push({ mesh: beams, netIds: list.map((s) => s.net) });
    }
    for (const dim of [false, true]) {
      const list = cubes.filter((c) => c.dim === dim);
      if (list.length === 0) continue;
      const mesh = new THREE.InstancedMesh(jointGeo, dim ? pipeDimMat : pipeMat, list.length);
      list.forEach((c, i) => {
        mesh.setMatrixAt(i, matrix.makeScale(c.w, c.w, c.w).setPosition(c.p.x, c.p.y, c.p.z));
        mesh.setColorAt(i, color.set(c.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      if (dim) mesh.renderOrder = 1;
      content.add(mesh);
      pipeBatches.push({ mesh, netIds: list.map((c) => c.net) });
    }
    if (steps.length > 0) {
      const mesh = new THREE.InstancedMesh(flowGeo, flowMat, steps.length);
      steps.forEach((st, i) => {
        // A lighter shade of the pipe colour reads as "something moving inside".
        mesh.setColorAt(i, color.set(st.color).lerp(new THREE.Color('#ffffff'), 0.55));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      content.add(mesh);
      flows = { mesh, steps };
      updateFlows();
    }
  }

  /** The site's ground: a light floor, a faint block grid and a darker outline. */
  function buildSite(m: SceneModel): void {
    if (!m.site) return;
    const [w, d] = m.site.size;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(w / 2, 0, d / 2);
    content.add(floor);
    const y = 0.003;
    const grid: number[] = [];
    for (let x = 1; x < w; x++) grid.push(x, y, 0, x, y, d);
    for (let z = 1; z < d; z++) grid.push(0, y, z, w, y, z);
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
    content.add(new THREE.LineSegments(gridGeo, gridMat));
    const edge = [0, y, 0, w, y, 0, w, y, 0, w, y, d, w, y, d, 0, y, d, 0, y, d, 0, y, 0];
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
    content.add(new THREE.LineSegments(edgeGeo, edgeMat));
  }

  /**
   * Grey dimension lines beside the south edge (width, along X) and the east edge (depth, along Z), the
   * sides the default camera looks at, each with end ticks and its label in the middle.
   */
  function buildDimensions(m: SceneModel): void {
    if (!m.dimensions) return;
    const { min, max, labels } = m.dimensions;
    const [widthText, depthText] = labels;
    const [x0, z0] = min;
    const [x1, z1] = max;
    const y = m.dimensions.y + 0.003;
    const g = DIM_GAP;
    const tick = 0.35;
    const zs = z1 + g;
    const xe = x1 + g;
    // prettier-ignore
    const lines = [
      x0, y, zs, x1, y, zs,
      x0, y, z1 + 0.15, x0, y, zs + tick,
      x1, y, z1 + 0.15, x1, y, zs + tick,
      xe, y, z0, xe, y, z1,
      x1 + 0.15, y, z0, xe + tick, y, z0,
      x1 + 0.15, y, z1, xe + tick, y, z1,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    content.add(new THREE.LineSegments(geo, dimMat));
    const widthLabel = textSprite(widthText, undefined, false, DIM_TEXT);
    widthLabel.position.set((x0 + x1) / 2, y, zs);
    const depthLabel = textSprite(depthText, undefined, false, DIM_TEXT);
    depthLabel.position.set(xe, y, (z0 + z1) / 2);
    content.add(widthLabel, depthLabel);
  }

  function buildLabels(m: SceneModel): void {
    for (const l of m.labels ?? []) {
      const sprite = textSprite(l.text, l.color, !!l.small);
      sprite.position.set(l.pos[0], l.pos[1], l.pos[2]);
      content.add(sprite);
    }
  }

  function rebuild(): void {
    clearContent();
    if (model) {
      buildSite(model);
      buildDimensions(model);
      buildVoxels(model);
      buildHatchMarkers(model);
      buildPipes(model);
      buildLabels(model);
    }
    applyXray();
    rebuildSelection();
    requestRender();
  }

  function rebuildSelection(): void {
    disposeSelection();
    if (!model || selected.size === 0) return;
    const voxels = model.voxels.filter((v) => v.unitIds.some((id) => selected.has(id)));
    if (voxels.length === 0) return;

    const tint = new THREE.InstancedMesh(boxGeo, tintMat, voxels.length);
    const matrix = new THREE.Matrix4();
    const s = new THREE.Vector3(1.03, 1.03, 1.03);
    const q = new THREE.Quaternion();
    voxels.forEach((v, i) => tint.setMatrixAt(i, matrix.compose(center(v.pos), q, s)));
    tint.instanceMatrix.needsUpdate = true;
    tint.computeBoundingSphere();
    tint.renderOrder = 2;

    // One outline box per selected unit around its cells.
    const boxes = new Map<number, THREE.Box3>();
    for (const v of voxels)
      for (const id of v.unitIds) {
        if (!selected.has(id)) continue;
        let b = boxes.get(id);
        if (!b) boxes.set(id, (b = new THREE.Box3()));
        b.expandByPoint(new THREE.Vector3(...v.pos)).expandByPoint(center(v.pos).addScalar(0.5));
      }
    const positions: number[] = [];
    const corner = (b: THREE.Box3, i: number): number[] => [
      i & 1 ? b.max.x : b.min.x,
      i & 2 ? b.max.y : b.min.y,
      i & 4 ? b.max.z : b.min.z,
    ];
    const edges = [
      [0, 1], [2, 3], [4, 5], [6, 7],
      [0, 2], [1, 3], [4, 6], [5, 7],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ]; // prettier-ignore
    for (const b of boxes.values()) {
      b.expandByScalar(0.035);
      for (const [a, c] of edges) positions.push(...corner(b, a), ...corner(b, c));
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.renderOrder = 3;
    selection.add(tint, lines);
  }

  function disposeSelection(): void {
    for (const child of [...selection.children]) {
      selection.remove(child);
      if (child instanceof THREE.InstancedMesh) child.dispose();
      else if (child instanceof THREE.LineSegments) child.geometry.dispose();
    }
  }

  // ---------------------------------------------------------------- picking

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pick(e: PointerEvent): void {
    if (!options.onPick || !model) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(
      [...batches.map((b) => b.mesh), ...pipeBatches.map((b) => b.mesh)],
      false,
    );
    for (const hit of hits) {
      if (hit.instanceId === undefined) continue;
      const pipes = pipeBatches.find((b) => b.mesh === hit.object);
      if (pipes) {
        const id = pipes.netIds[hit.instanceId];
        options.onPick([]);
        options.onPickNet?.(id >= 0 ? id : null);
        return;
      }
      const batch = batches.find((b) => b.mesh === hit.object);
      if (!batch) continue;
      const voxel = model.voxels[batch.indices[hit.instanceId]];
      options.onPick([...voxel.unitIds]);
      options.onPickNet?.(null);
      return;
    }
    options.onPick([]);
    options.onPickNet?.(null);
  }

  // ---------------------------------------------------------------- public API

  const api: Renderer & RendererDebug = {
    get viewMode() {
      return provider.mode;
    },

    setScene(next) {
      if (disposed) return;
      model = next;
      points = scenePoints(next);
      rebuild();
      const box = new THREE.Box3().setFromPoints(points);
      const boundsKey = `${box.min.toArray()}|${box.max.toArray()}`;
      if (boundsKey !== fittedBoundsKey) {
        const first = fittedBoundsKey === '';
        fittedBoundsKey = boundsKey;
        fit(!first && !autoFit);
      }
    },

    async setViewMode(mode) {
      const request = ++modeRequest;
      let next: MaterialProvider = simpleProvider;
      if (mode === 'detailed') {
        // One shared load, so quick toggles never create (and leak) a second provider.
        detailedLoad ??= (async () => {
          const mod = await import('./detailed');
          const p = mod.createDetailedProvider();
          try {
            await p.load();
          } catch (err) {
            p.dispose();
            throw err;
          }
          if (disposed) p.dispose();
          else detailedProvider = p;
          return p;
        })();
        try {
          next = await detailedLoad;
        } catch (err) {
          detailedLoad = null; // allow a retry later
          console.warn('DETAILED view is unavailable, falling back to SIMPLE.', err);
          next = simpleProvider;
        }
      }
      if (disposed || request !== modeRequest || next === provider) return;
      provider = next;
      rebuild();
    },

    setXray(on) {
      if (xray === on) return;
      xray = on;
      applyXray();
      requestRender();
    },

    setSelected(unitIds) {
      selected = new Set(unitIds);
      rebuildSelection();
      requestRender();
    },

    setFlowAnimation(on) {
      if (flowOn === on) return;
      flowOn = on;
      requestRender();
    },

    resetView() {
      autoFit = true;
      fit(false);
    },

    resize,

    benchmark(frames) {
      const theta = controls.theta;
      const pixel = new Uint8Array(4);
      const ctx = gl.getContext();
      const t0 = performance.now();
      for (let i = 0; i < frames; i++) {
        controls.theta = theta + (i / Math.max(1, frames)) * Math.PI * 2;
        controls.update();
        draw();
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
      }
      const ms = (performance.now() - t0) / Math.max(1, frames);
      controls.theta = theta;
      controls.update();
      return ms;
    },

    setAngles(theta, phi) {
      autoFit = false;
      controls.theta = theta;
      controls.phi = phi;
      fit(true);
    },

    info() {
      return {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        instances: batches.reduce((n, b) => n + b.indices.length, 0),
      };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver?.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', stopAutoFit);
      canvas.removeEventListener('wheel', stopAutoFit);
      clearContent();
      disposeSelection();
      for (const g of sharedGeometries) g.dispose();
      for (const m of ownedMaterials) m.dispose();
      disposeObjectTree(gizmo);
      simpleProvider.dispose();
      detailedProvider?.dispose();
      gl.dispose();
    },
  };

  resize();
  requestRender();
  return api;
}
