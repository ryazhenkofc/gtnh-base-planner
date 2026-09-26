import { derived } from 'svelte/store';
import { getMultiblock } from '../data/catalog';
import { DEFAULT_HATCH_COLORS } from '../model/colors';
import { layoutCandidates, packUnits } from '../model/layout';
import { resolveLayout } from '../model/plan';
import { placeHatches } from '../model/ports';
import { routePipes, withPipeFaces } from '../model/routing';
import { buildSceneModel } from '../model/scene';
import type {
  HatchKind,
  HatchResult,
  MultiblockDef,
  PackResult,
  PlanState,
  RouteNet,
  SceneModel,
  WallStats,
} from '../model/types';
import { computeWallStats } from '../model/walls';
import { plan, showPipes } from '../state/store';
import { warnOnce } from './notices';

/** The model functions the pipeline calls (injectable for tests). */
export interface PipelineDeps {
  getMultiblock: (id: string) => MultiblockDef | undefined;
  packUnits: typeof packUnits;
  placeHatches: typeof placeHatches;
  /** Looser layouts to try when the compact one cannot fit every hatch. */
  layoutCandidates: typeof layoutCandidates;
  computeWallStats: typeof computeWallStats;
  routePipes: typeof routePipes;
  buildSceneModel: typeof buildSceneModel;
}

export const defaultDeps: PipelineDeps = {
  getMultiblock,
  packUnits,
  placeHatches,
  layoutCandidates,
  computeWallStats,
  routePipes,
  buildSceneModel,
};

export interface PipelineResult {
  def: MultiblockDef | undefined;
  pack: PackResult | null;
  /** True when the layout was loosened (gaps, walkways) so every hatch fits. */
  loosened: boolean;
  hatches: HatchResult | null;
  stats: WallStats | null;
  pipes: RouteNet[] | null;
  scene: SceneModel | null;
  /** First error thrown by a stage (the stages after it are skipped). */
  error: string | null;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

/** Single-entry cache: recompute only when the key changes. Errors are cached too (same input, same error). */
function stage<T>(name: string) {
  let lastKey: string | undefined;
  let last: Outcome<T> | undefined;
  return (key: string, compute: () => T): Outcome<T> => {
    if (last && key === lastKey) return last;
    try {
      last = { ok: true, value: compute() };
    } catch (err) {
      warnOnce(name, err);
      last = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    lastKey = key;
    return last;
  };
}

export function mergeColors(overrides: PlanState['colors']): Record<HatchKind, string> {
  return { ...DEFAULT_HATCH_COLORS, ...overrides };
}

/**
 * plan → def → units → hatches → stats → pipes → scene, each stage memoised on exactly the inputs it
 * depends on, so changing a colour does not re-pack and a camera move (not an input) recomputes nothing.
 */
export function createPipeline(deps: PipelineDeps = defaultDeps) {
  const layoutStage = stage<PackResult>('packUnits');
  const hatchStage = stage<{ pack: PackResult; hatches: HatchResult; loosened: boolean }>('placeHatches');
  const statsStage = stage<WallStats>('computeWallStats');
  const pipesStage = stage<RouteNet[] | null>('routePipes');
  const sceneStage = stage<SceneModel>('buildSceneModel');
  let lastResultKey: string | undefined;
  let lastResult: PipelineResult | undefined;

  return function run(p: PlanState, pipesOn: boolean): PipelineResult {
    const def = deps.getMultiblock(p.multiblockId);
    const empty: PipelineResult = {
      def,
      pack: null,
      loosened: false,
      hatches: null,
      stats: null,
      pipes: null,
      scene: null,
      error: null,
    };
    if (!def) return { ...empty, error: `Unknown multiblock "${p.multiblockId}"` };

    const layoutKey = JSON.stringify([def.id, p.count, p.limits, p.manualUnits ?? null]);
    const hatchKey = layoutKey + JSON.stringify(p.enabledHatches);
    const pipesKey = hatchKey + String(pipesOn);
    const colors = mergeColors(p.colors);
    const sceneKey = pipesKey + JSON.stringify(colors);
    if (lastResult && sceneKey === lastResultKey) return lastResult;

    const finish = (r: PipelineResult) => {
      lastResultKey = sceneKey;
      lastResult = r;
      return r;
    };

    const pack = layoutStage(layoutKey, () => {
      if (p.manualUnits) {
        const n = p.manualUnits.length;
        return { units: p.manualUnits, requested: n, placed: n };
      }
      return deps.packUnits(def, p.count, p.limits);
    });
    if (!pack.ok) return finish({ ...empty, error: pack.error });
    // Hatches may loosen the layout (gaps between units) when the compact one leaves no room for them.
    const placed = hatchStage(hatchKey, () =>
      p.manualUnits
        ? {
            pack: pack.value,
            hatches: deps.placeHatches(def, pack.value.units, p.enabledHatches),
            loosened: false,
          }
        : resolveLayout(def, pack.value, p.enabledHatches, p.limits, deps),
    );
    if (!placed.ok) return finish({ ...empty, pack: pack.value, error: placed.error });
    const units = placed.value.pack.units;
    const hatchResult = placed.value.hatches;
    const layout = placed.value.pack;
    const loosened = placed.value.loosened;

    const stats = statsStage(hatchKey, () => deps.computeWallStats(def, units, hatchResult.hatches));
    if (!stats.ok)
      return finish({ ...empty, pack: layout, loosened, hatches: hatchResult, error: stats.error });

    // Pipes are optional: a routing failure still renders the build without them.
    const pipes = pipesStage(pipesKey, () =>
      pipesOn ? deps.routePipes(def, units, hatchResult.hatches) : null,
    );
    const pipeNets = pipes.ok ? pipes.value : null;

    // Hatches turn to whichever side their pipe reaches them from.
    const scene = sceneStage(sceneKey, () =>
      deps.buildSceneModel(
        def,
        units,
        withPipeFaces(hatchResult.hatches, pipeNets),
        stats.value,
        pipeNets,
        colors,
      ),
    );
    return finish({
      def,
      pack: layout,
      loosened,
      hatches: hatchResult,
      stats: stats.value,
      pipes: pipeNets,
      scene: scene.ok ? scene.value : null,
      error: scene.ok ? (pipes.ok ? null : pipes.error) : scene.error,
    });
  };
}

const run = createPipeline();

/** The derived build for the current plan; recomputes only when `plan` or `showPipes` change. */
export const build = derived([plan, showPipes], ([$plan, $showPipes]) => run($plan, $showPipes));
