<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/en';
  import { groupIndexOfUnit } from '../model/site/ids';
  import type { HatchResult, PackResult, RouteNet } from '../model/types';
  import { appMode, flowAnimation, isolate, site, siteGroup, siteNet } from '../state/site';
  import { plan, selectedUnits, viewMode, xray } from '../state/store';
  import { selectMultiblock } from './actions';
  import { isSlowBuild } from './fields';
  import Footer from './Footer.svelte';
  import ImportDialog from './ImportDialog.svelte';
  import Legend from './Legend.svelte';
  import { clearSlot, notify } from './notices';
  import Notices from './Notices.svelte';
  import Picker from './Picker.svelte';
  import { build } from './pipeline';
  import Scene from './Scene.svelte';
  import { isArrowKey } from './keys';
  import MoveHint from './MoveHint.svelte';
  import { initSession, startAutosave } from './session';
  import Settings from './Settings.svelte';
  import { updateSite, withGroupPatched } from './siteActions';
  import {
    frameRequest,
    frameSelected,
    moveSelected,
    moveSelectedBy,
    removeSelected,
    rotateSelected,
    shiftHeld,
    viewTheta,
  } from './siteEditing';
  import { redoSite, startSiteHistory, undoSite } from './siteHistory';
  import SiteBar from './SiteBar.svelte';
  import { addGroup } from './siteCommands';
  import SiteLegend from './SiteLegend.svelte';
  import SitePanel from './SitePanel.svelte';
  import { siteBuild, siteScene } from './sitePipeline';
  import { initSiteSession, startSiteAutosave } from './siteSession';
  import SiteStats from './SiteStats.svelte';
  import StatsLine from './StatsLine.svelte';
  import TopBar from './TopBar.svelte';

  let pickerOpen = $state(false);
  let settingsOpen = $state(false);
  let rendererFailed = $state(false);
  let sitePanelOpen = $state(false);
  let importOpen = $state(false);
  /** Site view: what the multiblock picker is open for. */
  let sitePicker = $state<'add' | 'change' | null>(null);

  const def = $derived($build.def);
  const siteMode = $derived($appMode === 'site');

  onMount(() => {
    let stop: (() => void) | undefined;
    let stopSite: (() => void) | undefined;
    let stopHistory: (() => void) | undefined;
    let cancelled = false;
    void initSession().then(() => {
      if (!cancelled) stop = startAutosave();
    });
    void initSiteSession().then(() => {
      if (cancelled) return;
      stopSite = startSiteAutosave();
      // Loading the stored template is not an undo step.
      stopHistory = startSiteHistory();
    });
    return () => {
      cancelled = true;
      stop?.();
      stopSite?.();
      stopHistory?.();
    };
  });

  // Tell the user once per new result when the model had to compromise.
  let lastPack: PackResult | null = null;
  let lastHatches: HatchResult | null = null;
  let lastPipes: RouteNet[] | null = null;
  $effect(() => {
    const { def, pack, hatches, pipes, loosened } = $build;
    if (siteMode) return;
    // Each warning has its own slot, so a fixed problem's stale warning disappears with the next result.
    if (pack !== lastPack) {
      if (pack && pack.placed < pack.requested)
        notify(t.placedFewer(pack.placed, pack.requested, pack.reason), 6000, 'pack');
      else if (loosened) notify(t.spacedOut(pipes !== null), 5000, 'pack');
      else clearSlot('pack');
      if (pack && def && isSlowBuild(pack.requested, def.size))
        notify(t.manyUnits(pack.requested), 8000, 'count');
      else clearSlot('count');
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

  // Machine warnings do not belong to the site view (and back).
  $effect(() => {
    if (siteMode) for (const slot of ['pack', 'hatches', 'pipes']) clearSlot(slot);
    else for (const slot of ['arrange', 'import', 'import-placeholders']) clearSlot(slot);
  });

  /** Unit ids of the selected site group (highlighted like selected units). */
  const siteSelected = $derived.by(() => {
    // Only the site view needs the site built.
    if (!siteMode) return [];
    const g = $siteBuild.build?.groups.find((x) => x.group.id === $siteGroup);
    return g ? g.units.map((u) => u.id) : [];
  });

  function onpick(ids: number[]) {
    if (!siteMode) {
      selectedUnits.set(ids);
      return;
    }
    const g = ids.length ? $siteBuild.build?.groups[groupIndexOfUnit(ids[0])] : undefined;
    siteGroup.set(g?.group.id ?? null);
  }

  function onpicknet(id: number | null) {
    if (!siteMode) return;
    siteNet.set(id);
    const n = id === null ? undefined : $siteBuild.build?.nets.find((x) => x.id === id);
    isolate.set(n?.resource ?? null);
  }

  function onselect(id: string) {
    selectMultiblock(id);
    pickerOpen = false;
  }

  function onsitepick(id: string) {
    const purpose = sitePicker;
    sitePicker = null;
    if (purpose === 'add') addGroup(id);
    else if (purpose === 'change' && $siteGroup) {
      const gid = $siteGroup;
      updateSite((s) => withGroupPatched(s, gid, { multiblockId: id }));
    }
    sitePanelOpen = true;
  }

  function typing(e: KeyboardEvent): boolean {
    const el = e.target as HTMLElement | null;
    return (
      !!el &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
    );
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Shift') shiftHeld.set(true);
    if (e.key === 'Escape') {
      if (siteMode) {
        if (importOpen) importOpen = false;
        else if (sitePicker) sitePicker = null;
        else if (sitePanelOpen) sitePanelOpen = false;
        else {
          siteGroup.set(null);
          siteNet.set(null);
          isolate.set(null);
        }
      } else if (pickerOpen) pickerOpen = false;
      else if (settingsOpen) settingsOpen = false;
      return;
    }
    if (!siteMode || importOpen || sitePicker || typing(e)) return;
    // Site view: undo and redo anything, then move and turn the selected group from the keyboard.
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' || k === 'y') {
        e.preventDefault();
        if (k === 'y' || e.shiftKey) redoSite();
        else undoSite();
      }
      return;
    }
    if (e.altKey) return;
    const gid = $siteGroup;
    if (!gid || !$site.groups.some((g) => g.id === gid)) return;
    if (isArrowKey(e.key)) {
      e.preventDefault();
      moveSelected(e.key, e.shiftKey);
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      rotateSelected(e.shiftKey ? -1 : 1);
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      frameSelected();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeSelected();
    }
  }

  function onkeyup(e: KeyboardEvent) {
    if (e.key === 'Shift') shiftHeld.set(false);
  }

  /** Canvas pixels the open drawer covers: the view centres the model in the rest. */
  let inset = $state({ right: 0, bottom: 0 });
  $effect(() => {
    // Re-measure whenever a drawer opens or closes.
    void sitePanelOpen;
    void settingsOpen;
    void siteMode;
    let observer: ResizeObserver | undefined;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('aside.drawer');
      const measure = () => {
        if (!el?.isConnected) {
          inset = { right: 0, bottom: 0 };
          return;
        }
        const r = el.getBoundingClientRect();
        // A side drawer on wide screens, a bottom sheet on phones.
        inset =
          r.left > 0
            ? { right: Math.max(0, window.innerWidth - r.left), bottom: 0 }
            : { right: 0, bottom: Math.max(0, window.innerHeight - r.top) };
      };
      measure();
      if (el && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure);
        observer.observe(el);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  });
</script>

<svelte:window {onkeydown} {onkeyup} onblur={() => shiftHeld.set(false)} />

<main>
  <Scene
    scene={siteMode ? $siteScene : $build.scene}
    mode={$viewMode}
    xray={$xray}
    selected={siteMode ? siteSelected : $selectedUnits}
    flow={$flowAnimation}
    onview={(theta) => viewTheta.set(theta)}
    onmove={siteMode ? (dx, dz) => moveSelectedBy(dx, dz, false) : undefined}
    frame={siteMode ? $frameRequest : null}
    {inset}
    {onpick}
    {onpicknet}
    onfail={() => (rendererFailed = true)}
  />

  {#if siteMode}
    {#if rendererFailed || !$siteScene}
      <div class="placeholder" data-testid="preview-notice">
        <!-- Before the first build arrives from the worker there is simply nothing to show yet. -->
        <span
          >{$siteScene
            ? t.viewUnavailable
            : $siteBuild.error || $siteBuild.build
              ? t.previewUnavailable
              : t.site.building}</span
        >
        {#if $siteBuild.error}<span class="detail">{$siteBuild.error}</span>{/if}
      </div>
    {/if}

    <SiteBar
      panelOpen={sitePanelOpen}
      ontogglepanel={() => (sitePanelOpen = !sitePanelOpen)}
      onimport={() => (importOpen = true)}
    />

    {#if sitePicker}
      <Picker
        currentId={$site.groups.find((g) => g.id === $siteGroup)?.multiblockId ?? ''}
        onselect={onsitepick}
        onclose={() => (sitePicker = null)}
      />
    {:else}
      <SiteLegend />
      <SiteStats onproblems={() => (sitePanelOpen = true)} />
      {#if $siteGroup && !importOpen}<MoveHint />{/if}
      {#if sitePanelOpen}
        <SitePanel
          onclose={() => (sitePanelOpen = false)}
          onimport={() => (importOpen = true)}
          onpick={(purpose) => {
            sitePicker = purpose;
            sitePanelOpen = false;
          }}
        />
      {/if}
    {/if}

    {#if importOpen}
      <ImportDialog onclose={() => (importOpen = false)} />
    {/if}
  {:else}
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
  {/if}

  <Footer />
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
    color: var(--muted);
    text-transform: none;
    letter-spacing: 0.02em;
  }
</style>
