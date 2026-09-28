<script lang="ts">
  import { t } from '../i18n/en';
  import type { MultiblockDef, PlanLimits } from '../model/types';
  import { connectBelow, plan, showCables, showPipes, xray } from '../state/store';
  import { resetColors, resetPlan, setHatchColor, setLimit, setSize, toggleHatch } from './actions';
  import { hatchKindsOf } from './catalogView';
  import { formatLimit, parseLimit, parseSize } from './fields';
  import { notify } from './notices';
  import NumberField from './NumberField.svelte';
  import { mergeColors } from './pipeline';
  import { copyShareLink, downloadJson, openJsonFile, shareFallback } from './session';
  import { addPlanToSite } from './siteCommands';

  interface Props {
    def: MultiblockDef | undefined;
    onclose: () => void;
  }
  let { def, onclose }: Props = $props();

  const axes: { axis: keyof PlanLimits; label: string }[] = [
    { axis: 'x', label: t.limitX },
    { axis: 'y', label: t.limitY },
    { axis: 'z', label: t.limitZ },
  ];

  const kinds = $derived(def ? hatchKindsOf(def) : []);
  const resize = $derived(def?.resize);
  const sizeLabel = $derived(resize?.label === 'length' ? t.length : t.height);

  function commitSize(text: string) {
    const n = parseSize(text);
    if (n !== null) setSize(n);
  }
  const colors = $derived(mergeColors($plan.colors));

  function commitLimit(axis: keyof PlanLimits, text: string) {
    const v = parseLimit(text);
    if (v !== undefined) setLimit(axis, v);
  }

  let fileInput = $state<HTMLInputElement>();
  function onfile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void openJsonFile(file);
  }

  let confirmReset = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  function onreset() {
    clearTimeout(resetTimer);
    if (confirmReset) {
      confirmReset = false;
      resetPlan();
      notify(t.resetDone);
      return;
    }
    confirmReset = true;
    resetTimer = setTimeout(() => (confirmReset = false), 3000);
  }
  $effect(() => () => clearTimeout(resetTimer));
</script>

<aside class="drawer" aria-label={t.settings} data-testid="settings">
  <div class="top">
    <span class="title">{t.settings}</span>
    <button class="link" onclick={onclose}>{t.close}</button>
  </div>

  {#if resize}
    <section>
      <h2>{t.size}</h2>
      <label class="limit">
        <span>{sizeLabel}</span>
        <NumberField
          value={String($plan.size ?? resize.default)}
          label={sizeLabel}
          testid="size"
          oncommit={commitSize}
        />
      </label>
      <p class="hint">{t.sizeHint(resize.min, resize.max)}</p>
    </section>
  {/if}

  <section>
    <h2>{t.limits}</h2>
    <div class="limits">
      {#each axes as a (a.axis)}
        <label class="limit">
          <span>{a.label}</span>
          <NumberField
            value={formatLimit($plan.limits[a.axis])}
            label={a.label}
            placeholder={t.unlimited}
            testid={`limit-${a.axis}`}
            oncommit={(text) => commitLimit(a.axis, text)}
          />
        </label>
      {/each}
    </div>
    <p class="hint">{t.limitsHint}</p>
    {#if $plan.manualUnits}<p class="hint">{t.manualNote}</p>{/if}
  </section>

  {#if kinds.length}
    <section>
      <h2>{t.hatches}</h2>
      <ul class="rows">
        {#each kinds as kind (kind)}
          {@const on = $plan.enabledHatches.includes(kind)}
          <li class="row">
            <label class="swatch" style:background={colors[kind]} title={t.hatchColor(t.hatchKinds[kind])}>
              <input
                type="color"
                value={colors[kind]}
                aria-label={t.hatchColor(t.hatchKinds[kind])}
                onchange={(e) => setHatchColor(kind, e.currentTarget.value)}
              />
            </label>
            <button
              class="link"
              class:active={on}
              aria-pressed={on}
              data-testid={`hatch-${kind}`}
              onclick={() => toggleHatch(kind)}>{t.hatchKinds[kind]}</button
            >
          </li>
        {/each}
      </ul>
      {#if Object.keys($plan.colors).length}
        <button class="link" onclick={resetColors}>{t.resetColors}</button>
      {/if}
    </section>
  {/if}

  <section>
    <h2>{t.view}</h2>
    <ul class="rows">
      <li class="row">
        <button
          class="link"
          class:active={$showPipes}
          aria-pressed={$showPipes}
          data-testid="toggle-pipes"
          onclick={() => showPipes.update((v) => !v)}>{t.pipes}</button
        >
      </li>
      <li class="row">
        <button
          class="link"
          class:active={$showCables}
          aria-pressed={$showCables}
          data-testid="toggle-cables"
          onclick={() => showCables.update((v) => !v)}>{t.cables}</button
        >
      </li>
      <li class="row">
        <button
          class="link"
          class:active={$connectBelow}
          aria-pressed={$connectBelow}
          title={t.belowHint}
          data-testid="toggle-below"
          onclick={() => connectBelow.update((v) => !v)}>{t.below}</button
        >
      </li>
      <li class="row">
        <button
          class="link"
          class:active={$xray}
          aria-pressed={$xray}
          data-testid="toggle-xray"
          onclick={() => xray.update((v) => !v)}>{t.xray}</button
        >
      </li>
    </ul>
  </section>

  <section>
    <h2>{t.plan}</h2>
    <ul class="rows">
      <li class="row">
        <button class="link" data-testid="share" onclick={() => void copyShareLink()}>{t.shareLink}</button>
      </li>
      {#if $shareFallback}
        <li class="row col">
          <span>{t.linkFallback}</span>
          <input
            class="field url"
            readonly
            value={$shareFallback}
            aria-label={t.linkFallback}
            onfocus={(e) => e.currentTarget.select()}
          />
        </li>
      {/if}
      <li class="row">
        <button class="link" onclick={downloadJson}>{t.downloadJson}</button>
      </li>
      <li class="row">
        <button class="link" data-testid="add-to-site" onclick={addPlanToSite}>{t.site.addToSite}</button>
      </li>
      <li class="row">
        <button class="link" onclick={() => fileInput?.click()}>{t.uploadJson}</button>
        <input
          bind:this={fileInput}
          class="visually-hidden"
          type="file"
          accept="application/json,.json"
          tabindex="-1"
          aria-hidden="true"
          onchange={onfile}
        />
      </li>
      <li class="row">
        <button class="link" class:danger={confirmReset} data-testid="reset" onclick={onreset}
          >{confirmReset ? t.resetConfirm : t.reset}</button
        >
      </li>
    </ul>
  </section>
</aside>

<style>
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 300px;
    background: var(--bg);
    border-left: 1px solid var(--line);
    z-index: 40;
    overflow-y: auto;
    padding: 0 var(--gutter) 48px;
  }
  .top {
    height: var(--bar-h);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .title {
    color: var(--text);
  }
  section {
    margin-top: 36px;
  }
  h2 {
    font: inherit;
    color: var(--text);
    margin: 0 0 14px;
  }
  .limits {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
  }
  .limit {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .limit > span {
    white-space: nowrap;
  }
  .limit :global(.field) {
    text-align: left;
  }
  .hint {
    margin: 10px 0 0;
    color: var(--muted);
    text-transform: none;
    letter-spacing: 0.02em;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 26px;
  }
  .row.col {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
  }
  .url {
    text-align: left;
    width: 100%;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text);
  }
  .swatch {
    position: relative;
    width: 10px;
    height: 10px;
    flex: none;
    cursor: pointer;
  }
  .swatch input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: 0;
    padding: 0;
  }
  .danger {
    color: var(--text);
  }

  @media (max-width: 640px) {
    .drawer {
      top: auto;
      left: 0;
      width: auto;
      max-height: 62vh;
      border-left: 0;
      border-top: 1px solid var(--line);
    }
    .top {
      height: 48px;
      position: sticky;
      top: 0;
      background: var(--bg);
    }
    section {
      margin-top: 20px;
    }
  }
</style>
