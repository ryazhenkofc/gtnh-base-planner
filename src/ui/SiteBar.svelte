<script lang="ts">
  import { t } from '../i18n/en';
  import { site } from '../state/site';
  import ModeSwitch from './ModeSwitch.svelte';

  interface Props {
    panelOpen: boolean;
    blocksOpen: boolean;
    ontogglepanel: () => void;
    ontoggleblocks: () => void;
    onimport: () => void;
  }
  let { panelOpen, blocksOpen, ontogglepanel, ontoggleblocks, onimport }: Props = $props();
</script>

<header class="bar">
  <div class="group name">
    <span class="title" data-testid="site-name">{$site.name ?? t.site.unnamed}</span>
    <span class="tier">{$site.size[0]} × {$site.size[1]}</span>
  </div>

  <!-- In its own column so it never runs into the mode switch. -->
  <div class="group actions">
    <button class="link" data-testid="site-import" title={t.site.importOpen} onclick={onimport}
      >{t.site.importShort}</button
    >
  </div>

  <div class="group modes">
    <ModeSwitch />
  </div>

  <div class="group settings">
    <span class="sep dot" aria-hidden="true">{t.separator}</span>
    <button
      class="link"
      class:active={blocksOpen}
      aria-expanded={blocksOpen}
      data-testid="blocks-toggle"
      onclick={ontoggleblocks}>{t.bom.toggle}</button
    >
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
    grid-template-columns: auto auto 1fr auto auto;
    grid-template-areas: 'name actions . modes settings';
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
    min-width: 0;
    white-space: nowrap;
  }
  /* Wide enough for the middle of the bar to be free: centred on the page, like the count in the machine view. */
  @media (min-width: 1100px) {
    .actions {
      /* A grid area would be the containing block; the bar itself is wanted. */
      grid-area: auto;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
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
  /* Too narrow to fit beside the name: the action stays in the Template panel instead. */
  @media (max-width: 760px) {
    .actions {
      display: none;
    }
  }
  @media (max-width: 900px) {
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
