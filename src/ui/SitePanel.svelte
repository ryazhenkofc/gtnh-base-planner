<script lang="ts">
  import { PLACEHOLDER_ID, SINGLE_BLOCK_ID, getSiteDef } from '../data/generic';
  import { t } from '../i18n/en';
  import type { Endpoint, ResourceKind } from '../model/site/types';
  import { SITE_MAX_SIZE, SITE_MIN_SIZE } from '../share/siteCodec';
  import { flowAnimation, isolate, showIcons, site, siteCables, siteGroup, sitePipes } from '../state/site';
  import { xray } from '../state/store';
  import { formatLimit, parseLimit, parseCount, parseSize } from './fields';
  import { notify } from './notices';
  import NumberField from './NumberField.svelte';
  import ResourceIcon from './ResourceIcon.svelte';
  import {
    resetSite,
    updateSite,
    withCorridor,
    withGroupPatched,
    withGroupRemoved,
    withGroupRotated,
    withLinkAdded,
    withLinkRemoved,
    withName,
    withResourceColor,
    withSiteSize,
    type LinkEnd,
  } from './siteActions';
  import { addGroup, arrange } from './siteCommands';
  import { siteBuild } from './sitePipeline';
  import { copySiteLink, downloadSite, openSiteFile, siteShareFallback } from './siteSession';

  interface Props {
    onclose: () => void;
    onimport: () => void;
    /** Open the multiblock picker to add a group (`add`) or change the selected one (`change`). */
    onpick: (purpose: 'add' | 'change') => void;
  }
  let { onclose, onimport, onpick }: Props = $props();

  const build = $derived($siteBuild.build);
  const selected = $derived($site.groups.find((g) => g.id === $siteGroup) ?? null);
  const selectedDef = $derived(selected ? getSiteDef(selected.multiblockId) : undefined);
  const placed = $derived(build?.groups.find((g) => g.group.id === $siteGroup));

  function groupName(id: string): string {
    const g = $site.groups.find((x) => x.id === id);
    if (!g) return id;
    return g.label ?? getSiteDef(g.multiblockId)?.name ?? g.multiblockId;
  }
  function resName(key: string): string {
    return $site.resources[key]?.name ?? key;
  }
  function endName(e: Endpoint): string {
    if ('group' in e) return groupName(e.group);
    const p = $site.ports.find((x) => x.id === e.port);
    return p?.dir === 'in' ? t.site.inputPort : t.site.outputPort;
  }

  const warnings = $derived(build?.warnings ?? []);

  // Numeric fields
  function commitSize(axis: 0 | 1, text: string) {
    const n = Number(text.trim());
    if (!Number.isFinite(n)) return;
    const size: [number, number] = [...$site.size];
    size[axis] = n;
    updateSite((s) => withSiteSize(s, size[0], size[1]));
  }
  function commitCorridor(text: string) {
    const n = Number(text.trim());
    if (Number.isFinite(n)) updateSite((s) => withCorridor(s, n));
  }
  function patch(p: Parameters<typeof withGroupPatched>[2]) {
    if (selected) updateSite((s) => withGroupPatched(s, selected.id, p));
  }
  function commitOrigin(axis: 0 | 1, text: string) {
    const n = Number(text.trim());
    if (!selected || !Number.isFinite(n)) return;
    const o: [number, number] = [...selected.origin];
    o[axis] = n;
    patch({ origin: o });
  }
  function commitLimit(axis: 'x' | 'y' | 'z', text: string) {
    const v = parseLimit(text);
    if (selected && v !== undefined) patch({ limits: { ...selected.limits, [axis]: v } });
  }

  // Remove with a confirming second click.
  let confirmRemove = $state(false);
  let confirmReset = $state(false);
  $effect(() => {
    void $siteGroup;
    confirmRemove = false;
  });
  function onremove() {
    if (!selected) return;
    if (!confirmRemove) {
      confirmRemove = true;
      setTimeout(() => (confirmRemove = false), 3000);
      return;
    }
    const id = selected.id;
    siteGroup.set(null);
    updateSite((s) => withGroupRemoved(s, id));
  }
  function onreset() {
    if (!confirmReset) {
      confirmReset = true;
      setTimeout(() => (confirmReset = false), 3000);
      return;
    }
    confirmReset = false;
    resetSite();
    notify(t.site.resetDone);
  }

  // New link form
  let linkFrom = $state('');
  let linkTo = $state('');
  let linkRes = $state('');
  let newResName = $state('');
  let newResKind = $state<ResourceKind>('item');
  let linkRate = $state('');
  const resourceKeys = $derived(
    Object.keys($site.resources).sort((a, b) => resName(a).localeCompare(resName(b))),
  );
  function end(v: string): LinkEnd | null {
    if (v === '@port') return { port: true };
    return v ? { group: v } : null;
  }
  function addLink() {
    const from = end(linkFrom);
    const to = end(linkTo);
    if (!from || !to) return;
    const res = linkRes && linkRes !== '@new' ? { key: linkRes } : { name: newResName, kind: newResKind };
    const rate = Number(linkRate);
    const before = $site;
    updateSite((s) => withLinkAdded(s, from, to, res, Number.isFinite(rate) && rate > 0 ? rate : undefined));
    if ($site !== before) {
      newResName = '';
      linkRate = '';
    }
  }

  let fileInput = $state<HTMLInputElement>();
  function onfile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void openSiteFile(file);
  }
</script>

<aside class="drawer" aria-label={t.site.panel} data-testid="site-panel">
  <div class="top">
    <span class="title">{t.site.panel}</span>
    <button class="link" onclick={onclose}>{t.close}</button>
  </div>

  <section>
    <h2>{t.site.size}</h2>
    <label class="row">
      <span>{t.site.name}</span>
      <input
        class="field text"
        type="text"
        value={$site.name ?? ''}
        placeholder={t.site.unnamed}
        aria-label={t.site.name}
        onchange={(e) => updateSite((s) => withName(s, e.currentTarget.value))}
      />
    </label>
    <div class="fields">
      <label class="pair"
        ><span>{t.site.width}</span><NumberField
          value={String($site.size[0])}
          label={t.site.width}
          testid="site-width"
          oncommit={(v) => commitSize(0, v)}
        /></label
      >
      <label class="pair"
        ><span>{t.site.depth}</span><NumberField
          value={String($site.size[1])}
          label={t.site.depth}
          testid="site-depth"
          oncommit={(v) => commitSize(1, v)}
        /></label
      >
      <label class="pair"
        ><span>{t.site.corridor}</span><NumberField
          value={String($site.corridor)}
          label={t.site.corridor}
          width="2em"
          oncommit={commitCorridor}
        /></label
      >
    </div>
    <p class="hint">{t.site.sizeHint(SITE_MIN_SIZE, SITE_MAX_SIZE)}</p>
    <ul class="rows">
      <li class="row">
        <button class="link" data-testid="site-arrange" disabled={!$site.groups.length} onclick={arrange}
          >{t.site.arrange}</button
        >
      </li>
      <li class="row"><button class="link" onclick={onimport}>{t.site.importOpen}</button></li>
    </ul>
  </section>

  <section>
    <h2>{t.site.groups}</h2>
    {#if !$site.groups.length}<p class="hint">{t.site.noGroups}</p>{/if}
    <ul class="rows">
      {#each $site.groups as g (g.id)}
        {@const pg = build?.groups.find((x) => x.group.id === g.id)}
        <li class="row">
          <button
            class="link"
            class:active={g.id === $siteGroup}
            data-testid="site-group"
            onclick={() => siteGroup.set(g.id === $siteGroup ? null : g.id)}
            >{groupName(g.id)} ×{pg?.units.length ?? g.count}</button
          >
          {#if g.source?.machineCount !== undefined}<span class="meta"
              >{t.site.needed(g.source.machineCount)}</span
            >{/if}
        </li>
      {/each}
    </ul>

    {#if selected && selectedDef}
      <div class="editor" data-testid="site-group-editor">
        <ul class="rows">
          <li class="row">
            <span class="value">{selectedDef.name}</span>
            <button class="link" onclick={() => onpick('change')}>{t.site.change}</button>
          </li>
          <li class="row">
            <button class="link" onclick={() => patch({ multiblockId: SINGLE_BLOCK_ID })}
              >{t.importer.single}</button
            >
            <button class="link" onclick={() => patch({ multiblockId: PLACEHOLDER_ID })}
              >{t.importer.placeholder}</button
            >
          </li>
        </ul>
        {#if selected.source}<p class="hint">
            {selected.source.name}{selected.source.tier ? ` · ${selected.source.tier}` : ''}
          </p>{/if}
        <div class="fields">
          <label class="pair"
            ><span>{t.site.count}</span><NumberField
              value={String(selected.count)}
              label={t.site.count}
              testid="site-group-count"
              oncommit={(v) => {
                const n = parseCount(v);
                if (n !== null) patch({ count: n });
              }}
            /></label
          >
          {#if selectedDef.resize}
            <label class="pair"
              ><span>{selectedDef.resize.label === 'length' ? t.length : t.height}</span><NumberField
                value={String(selected.size ?? selectedDef.resize.default)}
                label={t.size}
                oncommit={(v) => {
                  const n = parseSize(v);
                  if (n !== null) patch({ size: n });
                }}
              /></label
            >
          {/if}
        </div>
        <div class="fields">
          {#each [['x', t.limitX], ['y', t.limitY], ['z', t.limitZ]] as const as [axis, label] (axis)}
            <label class="pair"
              ><span>{label}</span><NumberField
                value={formatLimit(selected.limits[axis])}
                {label}
                placeholder={t.unlimited}
                width="2.5em"
                oncommit={(v) => commitLimit(axis, v)}
              /></label
            >
          {/each}
        </div>
        <div class="fields">
          <label class="pair"
            ><span>{t.site.x}</span><NumberField
              value={String(selected.origin[0])}
              label={t.site.x}
              testid="site-group-x"
              width="2.5em"
              oncommit={(v) => commitOrigin(0, v)}
            /></label
          >
          <label class="pair"
            ><span>{t.site.z}</span><NumberField
              value={String(selected.origin[1])}
              label={t.site.z}
              testid="site-group-z"
              width="2.5em"
              oncommit={(v) => commitOrigin(1, v)}
            /></label
          >
          <button
            class="link"
            data-testid="site-group-rotate"
            onclick={() => updateSite((s) => withGroupRotated(s, selected.id))}>{t.site.rotate}</button
          >
          <button class="link" class:danger={confirmRemove} onclick={onremove}
            >{confirmRemove ? t.site.removeConfirm : t.site.remove}</button
          >
        </div>
        {#if placed?.build?.unplaced.length}<p class="hint">
            {t.unplacedHatches(placed.build.unplaced.length)}
          </p>{/if}
        <p class="hint">{t.site.moveHint}</p>
      </div>
    {/if}

    <ul class="rows add">
      <li class="row">
        <button class="link" data-testid="site-add-group" onclick={() => onpick('add')}
          >{t.site.addGroup}</button
        >
      </li>
      <li class="row">
        <button class="link" onclick={() => addGroup(SINGLE_BLOCK_ID)}>{t.site.addSingle}</button>
      </li>
      <li class="row">
        <button class="link" onclick={() => addGroup(PLACEHOLDER_ID)}>{t.site.addPlaceholder}</button>
      </li>
    </ul>
  </section>

  <section>
    <h2>{t.site.links}</h2>
    {#if !$site.links.length}<p class="hint">{t.site.noLinks}</p>{/if}
    <ul class="rows">
      {#each $site.links as l (l.id)}
        {@const res = $site.resources[l.resource]}
        <li class="row link-row">
          <label class="swatch" style:background={res?.color} title={res?.name}>
            <input
              type="color"
              value={res?.color ?? '#888888'}
              aria-label={res?.name}
              onchange={(e) => updateSite((s) => withResourceColor(s, l.resource, e.currentTarget.value))}
            />
          </label>
          {#if res}<span class="res-icon"><ResourceIcon {res} size={20} /></span>{/if}
          <button
            class="link text-left"
            class:active={$isolate === l.resource}
            onclick={() => isolate.set($isolate === l.resource ? null : l.resource)}
            ><span class="res">{resName(l.resource)}</span>
            <span class="meta"
              >{endName(l.from)} → {endName(l.to)}{l.rate !== undefined && res
                ? ` · ${t.site.rateText(l.rate, res.kind)}`
                : ''}</span
            ></button
          >
          <button
            class="link x"
            aria-label={t.site.remove}
            onclick={() => updateSite((s) => withLinkRemoved(s, l.id))}>×</button
          >
        </li>
      {/each}
    </ul>

    <div class="form" data-testid="site-link-form">
      <label class="pair wide"
        ><span>{t.site.from}</span>
        <select class="field select" bind:value={linkFrom} aria-label={t.site.from}>
          <option value="">—</option>
          <option value="@port">{t.site.inputPort}</option>
          {#each $site.groups as g (g.id)}<option value={g.id}>{groupName(g.id)}</option>{/each}
        </select></label
      >
      <label class="pair wide"
        ><span>{t.site.to}</span>
        <select class="field select" bind:value={linkTo} aria-label={t.site.to}>
          <option value="">—</option>
          <option value="@port">{t.site.outputPort}</option>
          {#each $site.groups as g (g.id)}<option value={g.id}>{groupName(g.id)}</option>{/each}
        </select></label
      >
      <label class="pair wide"
        ><span>{t.site.resource}</span>
        <select class="field select" bind:value={linkRes} aria-label={t.site.resource}>
          <option value="@new">{t.site.newResource}</option>
          {#each resourceKeys as k (k)}<option value={k}>{resName(k)}</option>{/each}
        </select></label
      >
      {#if !linkRes || linkRes === '@new'}
        <label class="pair wide"
          ><span>{t.site.resourceName}</span><input
            class="field text"
            type="text"
            bind:value={newResName}
            aria-label={t.site.resourceName}
          /></label
        >
        <label class="pair wide"
          ><span>{t.site.kind}</span>
          <select class="field select" bind:value={newResKind} aria-label={t.site.kind}>
            <option value="item">{t.site.kinds.item}</option>
            <option value="fluid">{t.site.kinds.fluid}</option>
            <option value="power">{t.site.kinds.power}</option>
          </select></label
        >
      {/if}
      <label class="pair wide"
        ><span>{t.site.rate}</span><input
          class="field text"
          type="text"
          inputmode="decimal"
          bind:value={linkRate}
          aria-label={t.site.rate}
        /></label
      >
      <button class="link" data-testid="site-add-link" onclick={addLink}>{t.site.addLink}</button>
    </div>
  </section>

  {#if warnings.length}
    <section>
      <h2>{t.site.problems}</h2>
      <ul class="rows problems">
        {#each warnings as w, i (i)}
          <li>{t.site.warning(w, groupName, resName)}</li>
        {/each}
      </ul>
    </section>
  {/if}

  <section>
    <h2>{t.view}</h2>
    <ul class="rows">
      <li class="row">
        <button
          class="link"
          class:active={$sitePipes}
          aria-pressed={$sitePipes}
          onclick={() => sitePipes.update((v) => !v)}>{t.pipes}</button
        >
      </li>
      <li class="row">
        <button
          class="link"
          class:active={$siteCables}
          aria-pressed={$siteCables}
          onclick={() => siteCables.update((v) => !v)}>{t.cables}</button
        >
      </li>
      <li class="row">
        <button
          class="link"
          class:active={$flowAnimation}
          aria-pressed={$flowAnimation}
          onclick={() => flowAnimation.update((v) => !v)}>{t.site.flow}</button
        >
      </li>
      <li class="row">
        <button
          class="link"
          class:active={$showIcons}
          aria-pressed={$showIcons}
          data-testid="site-icons"
          onclick={() => showIcons.update((v) => !v)}>{t.site.icons}</button
        >
      </li>
      <li class="row">
        <button class="link" class:active={$xray} aria-pressed={$xray} onclick={() => xray.update((v) => !v)}
          >{t.xray}</button
        >
      </li>
    </ul>
  </section>

  <section>
    <h2>{t.plan}</h2>
    <ul class="rows">
      <li class="row">
        <button class="link" data-testid="site-share" onclick={() => void copySiteLink()}
          >{t.shareLink}</button
        >
      </li>
      {#if $siteShareFallback}
        <li class="row col">
          <span>{t.linkFallback}</span>
          <input
            class="field url"
            readonly
            value={$siteShareFallback}
            aria-label={t.linkFallback}
            onfocus={(e) => e.currentTarget.select()}
          />
        </li>
      {/if}
      <li class="row"><button class="link" onclick={downloadSite}>{t.downloadJson}</button></li>
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
        <button class="link" class:danger={confirmReset} onclick={onreset}
          >{confirmReset ? t.site.resetConfirm : t.site.reset}</button
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
    width: 340px;
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
  .title,
  h2,
  .value {
    color: var(--text);
  }
  section {
    margin-top: 32px;
  }
  h2 {
    font: inherit;
    margin: 0 0 12px;
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
  .fields {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 18px;
    margin: 6px 0;
  }
  .pair {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .pair :global(.field) {
    text-align: left;
  }
  .pair.wide {
    justify-content: space-between;
    width: 100%;
  }
  .pair.wide > span {
    flex: none;
  }
  .text {
    text-align: left;
    text-transform: none;
    letter-spacing: 0.02em;
    flex: 1;
    min-width: 0;
  }
  .select {
    text-align: left;
    text-transform: none;
    letter-spacing: 0.02em;
    max-width: 200px;
    cursor: pointer;
  }
  .hint,
  .meta {
    color: var(--faint);
    text-transform: none;
    letter-spacing: 0.02em;
  }
  .hint {
    margin: 8px 0 0;
  }
  .editor {
    margin: 10px 0 14px;
    padding: 8px 0 8px 12px;
    border-left: 1px solid var(--line);
  }
  .add {
    margin-top: 10px;
  }
  .link-row {
    align-items: flex-start;
  }
  .text-left {
    text-align: left;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .res {
    text-transform: none;
    letter-spacing: 0.02em;
  }
  .x {
    color: var(--faint);
  }
  .swatch {
    position: relative;
    width: 10px;
    height: 10px;
    flex: none;
    margin-top: 8px;
    cursor: pointer;
  }
  .res-icon {
    margin-top: 4px;
    flex: none;
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
  .form {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .form > .link {
    align-self: flex-start;
  }
  .problems li {
    color: var(--text);
    text-transform: none;
    letter-spacing: 0.02em;
    margin-bottom: 4px;
  }
  .url {
    text-align: left;
    width: 100%;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text);
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
      z-index: 1;
    }
    section {
      margin-top: 20px;
    }
  }
</style>
