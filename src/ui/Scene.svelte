<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { DEFAULT_HATCH_COLORS } from '../model/colors';
  import type { SceneModel, ViewMode } from '../model/types';
  import { createRenderer, type Renderer } from '../render/renderer';
  import { warnOnce } from './notices';

  interface Props {
    scene: SceneModel | null;
    mode: ViewMode;
    xray: boolean;
    selected: number[];
    onpick: (unitIds: number[]) => void;
    onfail: () => void;
  }
  let { scene, mode, xray, selected, onpick, onfail }: Props = $props();

  const EMPTY_SCENE: SceneModel = {
    voxels: [],
    hatches: [],
    pipes: null,
    bounds: { min: [0, 0, 0], max: [0, 0, 0] },
    colors: DEFAULT_HATCH_COLORS,
  };

  let canvas = $state<HTMLCanvasElement>();
  let renderer = $state.raw<Renderer | null>(null);

  /** Renderer calls never take the UI down. */
  function guard(name: string, fn: () => unknown): void {
    try {
      const r = fn();
      if (r instanceof Promise) r.catch((err: unknown) => warnOnce(name, err));
    } catch (err) {
      warnOnce(name, err);
    }
  }

  onMount(() => {
    if (!canvas) return;
    let r: Renderer;
    try {
      r = createRenderer(canvas, { onPick: (ids) => onpick(ids) });
    } catch (err) {
      warnOnce('createRenderer', err);
      onfail();
      return;
    }
    // The renderer observes the canvas size itself.
    renderer = r;
    return () => {
      renderer = null;
      guard('dispose', () => r.dispose());
    };
  });

  // Each effect runs only when its own input changes (scene identity is memoised by the pipeline).
  // When the pipeline fails the old build must not stay on screen (or stay pickable).
  let showing = false;
  $effect(() => {
    const r = renderer;
    const s = scene;
    if (!r) return;
    if (s) {
      showing = true;
      guard('setScene', () => r.setScene(s));
    } else if (showing) {
      showing = false;
      guard('setScene', () => r.setScene(EMPTY_SCENE));
      untrack(() => onpick([]));
    }
  });
  $effect(() => {
    const r = renderer;
    const m = mode;
    if (r) guard('setViewMode', () => r.setViewMode(m));
  });
  $effect(() => {
    const r = renderer;
    const on = xray;
    if (r) guard('setXray', () => r.setXray(on));
  });
  $effect(() => {
    const r = renderer;
    const ids = selected;
    if (r) guard('setSelected', () => r.setSelected(ids));
  });
</script>

<canvas bind:this={canvas} data-testid="scene"></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    background: var(--bg);
    outline: none;
    touch-action: none;
  }
</style>
