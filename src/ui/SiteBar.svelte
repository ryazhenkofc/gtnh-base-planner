<script lang="ts">
  import { t } from '../i18n/en';
  import { flowAnimation, site } from '../state/site';
  import ModeSwitch from './ModeSwitch.svelte';
  import { arrange } from './siteCommands';

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

  <!-- Template-wide actions, in their own column so they never run into the mode switch. -->
  <div class="group actions">
    <button class="link" data-testid="site-arrange" disabled={!$site.groups.length} onclick={arrange}
      >{t.site.arrange}</button
    >
    <span class="sep" aria-hidden="true">{t.separator}</span>
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
    grid-template-columns: auto 1fr auto auto;
    grid-template-areas: 'name actions modes settings';
    column-gap: 24px;
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
  .actions {
    grid-area: actions;
    justify-self: center;
    min-width: 0;
    white-space: nowrap;
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
  /* Too narrow for both: the actions stay in the Template panel instead. */
  @media (max-width: 900px) {
    .actions {
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
