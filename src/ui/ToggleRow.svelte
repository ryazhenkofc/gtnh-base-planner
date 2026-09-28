<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../i18n/en';

  /** A full-width on/off row: label on the left, its state written out on the right. */
  interface Props {
    on: boolean;
    label: string;
    title?: string;
    testid?: string;
    ontoggle: () => void;
    /** Shown before the label (a colour swatch, say); outside the button. */
    before?: Snippet;
  }
  let { on, label, title, testid, ontoggle, before }: Props = $props();
</script>

<li class="toggle-row">
  {#if before}{@render before()}{/if}
  <button class="toggle" class:on aria-pressed={on} {title} data-testid={testid} onclick={ontoggle}
    ><span>{label}</span><span class="state">{on ? t.on : t.off}</span></button
  >
</li>

<style>
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 26px;
  }
  .toggle {
    appearance: none;
    background: none;
    border: 0;
    border-radius: 0;
    margin: 0;
    padding: 4px 0;
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    text-align: left;
    cursor: pointer;
    color: var(--muted);
  }
  .toggle:hover,
  .toggle.on {
    color: var(--text);
  }
  .state {
    flex: none;
    color: var(--muted);
  }
  .on .state {
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-thickness: 1px;
  }
</style>
