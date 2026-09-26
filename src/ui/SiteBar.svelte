<script lang="ts">
  import { t } from '../i18n/en';
  import { flowAnimation, site } from '../state/site';
  import ModeSwitch from './ModeSwitch.svelte';

  interface Props {
    panelOpen: boolean;
    ontogglepanel: () => void;
    onimport: () => void;
  }
  let { panelOpen, ontogglepanel, onimport }: Props = $props();
</script>

<header class="bar">
  <div class="group name">
    <span class="title" data-testid="site-name">{$site.name ?? t.site.unnamed}</span>
    <span class="tier">{$site.size[0]} × {$site.size[1]}</span>
  </div>

  <div class="group center">
    <button class="link" data-testid="site-import" onclick={onimport}>{t.site.importOpen}</button>
  </div>

  <div class="group modes">
    <ModeSwitch />
    <span class="sep dot" aria-hidden="true">{t.separator}</span>
    <button
      class="link"
      class:active={$flowAnimation}
      aria-pressed={$flowAnimation}
      title={t.site.animationHint}
      data-testid="site-animation"
      onclick={() => flowAnimation.update((v) => !v)}>{t.site.animation}</button
    >
  </div>

  <div class="group settings">
    <span class="sep dot" aria-hidden="true">{t.separator}</span>
    <button
      class="link"
      class:active={panelOpen}
      aria-expanded={panelOpen}
      data-testid="site-panel-toggle"
      onclick={ontogglepanel}>{t.site.panel}</button
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
    max-width: calc(50vw - var(--gutter) - 120px);
    gap: 10px;
  }
  .title {
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tier {
    white-space: nowrap;
  }
  .center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
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
  @media (max-width: 900px) {
    .center {
      display: none;
    }
    .name {
      max-width: none;
    }
  }
  @media (max-width: 640px) {
    .bar {
      grid-template-columns: 1fr auto;
      grid-template-rows: 1fr 1fr;
      grid-template-areas:
        'name settings'
        'modes modes';
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .modes {
      justify-self: start;
    }
    .settings {
      justify-self: end;
    }
    .dot {
      display: none;
    }
    .modes {
      gap: 8px 12px;
    }
  }
</style>
