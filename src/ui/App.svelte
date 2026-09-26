<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/en';
  import type { HatchResult, PackResult, RouteNet } from '../model/types';
  import { plan, selectedUnits, viewMode, xray } from '../state/store';
  import { selectMultiblock } from './actions';
  import Legend from './Legend.svelte';
  import { clearSlot, notify } from './notices';
  import Notices from './Notices.svelte';
  import Picker from './Picker.svelte';
  import { build } from './pipeline';
  import Scene from './Scene.svelte';
  import { initSession, startAutosave } from './session';
  import Settings from './Settings.svelte';
  import StatsLine from './StatsLine.svelte';
  import TopBar from './TopBar.svelte';

  let pickerOpen = $state(false);
  let settingsOpen = $state(false);
  let rendererFailed = $state(false);

  const def = $derived($build.def);

  onMount(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void initSession().then(() => {
      if (!cancelled) stop = startAutosave();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  });

  // Tell the user once per new result when the model had to compromise.
  let lastPack: PackResult | null = null;
  let lastHatches: HatchResult | null = null;
  let lastPipes: RouteNet[] | null = null;
  $effect(() => {
    const { pack, hatches, pipes, loosened } = $build;
    // Each warning has its own slot, so a fixed problem's stale warning disappears with the next result.
    if (pack !== lastPack) {
      if (pack && pack.placed < pack.requested)
        notify(t.placedFewer(pack.placed, pack.requested, pack.reason), 6000, 'pack');
      else if (loosened) notify(t.spacedOut, 5000, 'pack');
      else clearSlot('pack');
    }
    if (hatches !== lastHatches) {
      if (hatches?.unplaced.length) notify(t.unplacedHatches(hatches.unplaced.length), 6000, 'hatches');
      else clearSlot('hatches');
    }
    if (pipes !== lastPipes) {
      const missing = pipes?.reduce((s, n) => s + (n.total - n.connected), 0) ?? 0;
      if (missing > 0) notify(t.unconnectedPipes(missing), 6000, 'pipes');
      else clearSlot('pipes');
    }
    lastPack = pack;
    lastHatches = hatches;
    lastPipes = pipes;
  });

  function onselect(id: string) {
    selectMultiblock(id);
    pickerOpen = false;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (pickerOpen) pickerOpen = false;
    else if (settingsOpen) settingsOpen = false;
  }
</script>

<svelte:window {onkeydown} />

<main>
  <Scene
    scene={$build.scene}
    mode={$viewMode}
    xray={$xray}
    selected={$selectedUnits}
    onpick={(ids) => selectedUnits.set(ids)}
    onfail={() => (rendererFailed = true)}
  />

  {#if !$build.scene || rendererFailed}
    <div class="placeholder" data-testid="preview-notice">
      <span>{$build.scene ? t.viewUnavailable : t.previewUnavailable}</span>
      {#if $build.error}<span class="detail">{$build.error}</span>{/if}
    </div>
  {/if}

  <TopBar
    {def}
    {pickerOpen}
    {settingsOpen}
    ontogglepicker={() => {
      pickerOpen = !pickerOpen;
      if (pickerOpen) settingsOpen = false;
    }}
    ontogglesettings={() => {
      settingsOpen = !settingsOpen;
      if (settingsOpen) pickerOpen = false;
    }}
  />

  {#if pickerOpen}
    <Picker currentId={$plan.multiblockId} {onselect} onclose={() => (pickerOpen = false)} />
  {:else}
    <Legend enabled={$plan.enabledHatches} colors={$plan.colors} />
    <StatsLine result={$build} />
  {/if}

  {#if settingsOpen}
    <Settings {def} onclose={() => (settingsOpen = false)} />
  {/if}

  <Notices />
</main>

<style>
  main {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }
  .placeholder {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    pointer-events: none;
    padding: 0 var(--gutter);
    text-align: center;
  }
  .detail {
    color: var(--faint);
    text-transform: none;
    letter-spacing: 0.02em;
  }
</style>
