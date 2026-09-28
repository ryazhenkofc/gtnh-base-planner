<script lang="ts">
  import { t } from '../i18n/en';
  import type { MultiblockDef } from '../model/multiblock/types';
  import { plan } from '../state/store';
  import { setCount } from './actions';
  import { COUNT_MAX, COUNT_MIN, parseCount } from './fields';
  import ModeSwitch from './ModeSwitch.svelte';
  import NumberField from './NumberField.svelte';

  interface Props {
    def: MultiblockDef | undefined;
    pickerOpen: boolean;
    settingsOpen: boolean;
    ontogglepicker: () => void;
    ontogglesettings: () => void;
  }
  let { def, pickerOpen, settingsOpen, ontogglepicker, ontogglesettings }: Props = $props();

  function commitCount(text: string) {
    const n = parseCount(text);
    if (n !== null) setCount(n);
  }
</script>

<header class="bar">
  <div class="group name">
    <button
      class="link"
      class:active={pickerOpen}
      data-testid="multiblock-name"
      aria-expanded={pickerOpen}
      aria-haspopup="dialog"
      onclick={ontogglepicker}
    >
      {def?.name ?? $plan.multiblockId}
    </button>
    {#if def?.tier}<span class="tier">{def.tier}</span>{/if}
  </div>

  <div class="group count" role="group" aria-label={t.countLabel}>
    <button
      class="link step"
      aria-label={t.decrease}
      data-testid="count-dec"
      disabled={$plan.count <= COUNT_MIN}
      onclick={() => setCount($plan.count - 1)}>{t.minus}</button
    >
    <NumberField
      value={String($plan.count)}
      label={t.countLabel}
      testid="count"
      width="3em"
      oncommit={commitCount}
    />
    <button
      class="link step"
      aria-label={t.increase}
      data-testid="count-inc"
      disabled={$plan.count >= COUNT_MAX}
      onclick={() => setCount($plan.count + 1)}>{t.plus}</button
    >
  </div>

  <div class="group modes">
    <ModeSwitch />
  </div>

  <div class="group settings">
    <span class="sep dot" aria-hidden="true">{t.separator}</span>
    <button
      class="link"
      class:active={settingsOpen}
      aria-expanded={settingsOpen}
      data-testid="settings-toggle"
      onclick={ontogglesettings}>{t.settings}</button
    >
  </div>
</header>

<style>
  .bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--bar-h);
    padding: 0 var(--gutter);
    display: grid;
    grid-template-columns: 1fr auto auto;
    grid-template-areas: 'name modes settings';
    align-items: center;
    z-index: 30;
    pointer-events: none;
  }
  .group {
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
  }
  .name {
    grid-area: name;
    justify-self: start;
    min-width: 0;
    max-width: calc(50vw - var(--gutter) - 72px);
    gap: 10px;
  }
  .name .link {
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tier {
    white-space: nowrap;
  }
  /* Centred on the page, independent of the side groups' widths. */
  .count {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    gap: 6px;
  }
  .step {
    width: 20px;
    text-align: center;
    font-size: 13px;
  }
  .modes {
    grid-area: modes;
    justify-self: end;
  }
  .settings {
    grid-area: settings;
  }
  .sep {
    color: var(--faint);
  }
  .dot {
    margin: 0 10px;
  }

  @media (max-width: 640px) {
    .bar {
      grid-template-columns: 1fr auto;
      grid-template-rows: 1fr 1fr;
      grid-template-areas:
        'name settings'
        'count modes';
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .count {
      position: static;
      transform: none;
      grid-area: count;
      justify-self: start;
      margin-left: -5px;
    }
    .name {
      max-width: none;
    }
    .settings {
      justify-self: end;
    }
    .dot {
      display: none;
    }
  }
</style>
