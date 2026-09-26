<script lang="ts">
  import { iconUrl, type ResourceDef } from '../model/site/types';
  import { showIcons } from '../state/site';

  interface Props {
    res: ResourceDef;
    /** Pixels. */
    size?: number;
  }
  let { res, size = 16 }: Props = $props();

  let failed = $state(false);
  const src = $derived($showIcons && res.icon && !failed ? iconUrl(res.icon) : null);
  // A new icon gets a new chance to load.
  $effect(() => {
    void res.icon;
    failed = false;
  });
</script>

{#if src}
  <!-- GTNH Planner renders every icon in the middle half of a 256 px square: show that half. -->
  <span class="frame" style:width="{size}px" style:height="{size}px" title={res.name}>
    <img
      {src}
      alt=""
      width={size * 2}
      height={size * 2}
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      style:margin="-{size / 2}px"
      onerror={() => (failed = true)}
    />
  </span>
{:else}
  <i
    class="swatch"
    class:cable={res.kind === 'power'}
    class:round={res.kind === 'fluid'}
    style:background={res.color}
    style:--size="{Math.round(size / 2)}px"
  ></i>
{/if}

<style>
  .frame {
    display: block;
    flex: none;
    overflow: hidden;
  }
  .frame img {
    display: block;
    max-width: none;
  }
  .swatch {
    width: var(--size);
    height: var(--size);
    display: block;
    flex: none;
  }
  .round {
    border-radius: 50%;
  }
  .cable {
    height: calc(var(--size) / 2);
  }
</style>
