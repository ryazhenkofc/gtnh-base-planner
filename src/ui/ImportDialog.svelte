<script lang="ts">
  import { get } from 'svelte/store';
  import { catalog } from '../data/catalog';
  import { t } from '../i18n/en';
  import {
    ImportError,
    MAX_IMPORT_BYTES,
    buildSiteFromGtnh,
    importRows,
    parseGtnhProject,
    type GtnhProject,
    type ImportRow,
    type MachineChoice,
  } from '../import/gtnhplanner';
  import { SITE_MAX_SIZE, SITE_MIN_SIZE } from '../share/siteCodec';
  import { appMode, site } from '../state/site';
  import { notify } from './notices';
  import NumberField from './NumberField.svelte';
  import { replaceSite } from './siteActions';

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let text = $state('');
  let error = $state<string | null>(null);
  let project = $state.raw<GtnhProject | null>(null);
  let rows = $state.raw<ImportRow[]>([]);
  /** Per node id: choice encoded as a select value (`mb:<id>`, `single`, `placeholder`, `port`, `skip`). */
  let choices = $state<Record<string, string>>({});
  // Start from the current site size.
  let width = $state(get(site).size[0]);
  let depth = $state(get(site).size[1]);
  let grow = $state(true);

  function encode(c: MachineChoice): string {
    return c.type === 'multiblock' ? `mb:${c.id}` : c.type;
  }
  function decode(v: string): MachineChoice {
    if (v.startsWith('mb:')) return { type: 'multiblock', id: v.slice(3) };
    return { type: v as 'single' | 'placeholder' | 'port' | 'skip' };
  }

  function read(source: string) {
    error = null;
    try {
      const p = parseGtnhProject(source);
      project = p;
      rows = importRows(p);
      choices = Object.fromEntries(rows.map((r) => [r.node.id, encode(r.proposed)]));
    } catch (err) {
      project = null;
      rows = [];
      error = err instanceof ImportError ? err.message : String(err);
    }
  }

  let fileInput = $state<HTMLInputElement>();
  async function onfile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      error = 'The file is too large.';
      return;
    }
    text = '';
    read(await file.text());
  }

  function build() {
    if (!project) return;
    const map = new Map(Object.entries(choices).map(([k, v]) => [k, decode(v)]));
    const { site: next, report } = buildSiteFromGtnh(project, map, { size: [width, depth], grow });
    replaceSite(next);
    appMode.set('site');
    const notes = [t.importer.done(report.groups, report.ports, report.links)];
    if (next.size[0] !== width || next.size[1] !== depth)
      notes.push(t.importer.grown(next.size[0], next.size[1]));
    else if (!report.fits) notes.push(t.site.needs(report.needed[0], report.needed[1]));
    if (report.aspects) notes.push(t.importer.aspects(report.aspects));
    if (report.truncated) notes.push(t.importer.truncated);
    notify(notes.join(' '), 9000, 'import');
    if (report.placeholders.length)
      notify(t.importer.placeholders(report.placeholders), 9000, 'import-placeholders');
    onclose();
  }

  function clampSize(v: string): number | null {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(SITE_MAX_SIZE, Math.max(SITE_MIN_SIZE, n)) : null;
  }
</script>

<div class="dialog" role="dialog" aria-label={t.importer.title} data-testid="import-dialog">
  <div class="inner">
    <div class="head">
      <span class="title">{t.importer.title}</span>
      <button class="link" onclick={onclose}>{t.importer.cancel}</button>
    </div>
    <p class="hint">{t.importer.hint}</p>

    <textarea
      class="paste"
      placeholder={t.importer.paste}
      aria-label={t.importer.paste}
      spellcheck="false"
      data-testid="import-text"
      bind:value={text}></textarea>
    <div class="actions">
      <button class="link" data-testid="import-read" disabled={!text.trim()} onclick={() => read(text)}
        >{t.importer.read}</button
      >
      <button class="link" onclick={() => fileInput?.click()}>{t.importer.openFile}</button>
      <input
        bind:this={fileInput}
        class="visually-hidden"
        type="file"
        accept="application/json,.json"
        tabindex="-1"
        aria-hidden="true"
        onchange={onfile}
      />
    </div>
    {#if error}<p class="error" data-testid="import-error">{error}</p>{/if}

    {#if project}
      <h2>{project.name}</h2>
      {#if project.skipped}<p class="hint">{t.importer.skippedEntries(project.skipped)}</p>{/if}
      <table class="rows" data-testid="import-rows">
        <thead>
          <tr
            ><th>{t.importer.node}</th><th>{t.importer.machine}</th><th>{t.importer.count}</th><th
              >{t.importer.placeAs}</th
            ></tr
          >
        </thead>
        <tbody>
          {#each rows as r (r.node.id)}
            <tr>
              <td class="name">{r.recipe?.name ?? r.node.recipeId}</td>
              <td>{r.machine}</td>
              <td class="num"
                >{r.count}<span class="meta"> ({Math.round(r.node.machineCount * 100) / 100})</span></td
              >
              <td>
                <select class="field select" bind:value={choices[r.node.id]} aria-label={t.importer.placeAs}>
                  <option value="single">{t.importer.single}</option>
                  <option value="placeholder">{t.importer.placeholder}</option>
                  <option value="port">{t.importer.port}</option>
                  <option value="skip">{t.importer.skip}</option>
                  <optgroup label={t.site.groups}>
                    {#each catalog as d (d.id)}<option value={`mb:${d.id}`}>{d.name}</option>{/each}
                  </optgroup>
                </select>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <div class="fields">
        <label class="pair"
          ><span>{t.site.width}</span><NumberField
            value={String(width)}
            label={t.site.width}
            oncommit={(v) => {
              const n = clampSize(v);
              if (n !== null) width = n;
            }}
          /></label
        >
        <label class="pair"
          ><span>{t.site.depth}</span><NumberField
            value={String(depth)}
            label={t.site.depth}
            oncommit={(v) => {
              const n = clampSize(v);
              if (n !== null) depth = n;
            }}
          /></label
        >
        <label class="pair check"
          ><input type="checkbox" bind:checked={grow} /><span>{t.importer.grow}</span></label
        >
      </div>
      <div class="actions">
        <button class="link active" data-testid="import-build" onclick={build}>{t.importer.build}</button>
        {#if $site.groups.length}<span class="hint">{t.importer.replaces}</span>{/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .dialog {
    position: fixed;
    inset: 0;
    background: var(--bg);
    z-index: 50;
    overflow-y: auto;
    padding: calc(var(--bar-h) + 12px) var(--gutter) 64px;
  }
  .inner {
    max-width: 920px;
    margin: 0 auto;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .title,
  h2 {
    color: var(--text);
  }
  h2 {
    font: inherit;
    margin: 28px 0 6px;
    text-transform: none;
    letter-spacing: 0.02em;
  }
  .hint,
  .meta {
    color: var(--faint);
    text-transform: none;
    letter-spacing: 0.02em;
  }
  .hint {
    margin: 0 0 12px;
  }
  .paste {
    width: 100%;
    height: 120px;
    resize: vertical;
    border: 1px solid var(--line);
    padding: 8px;
    font:
      11px/1.4 ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    color: var(--text);
    text-transform: none;
    letter-spacing: 0;
  }
  .actions {
    display: flex;
    gap: 18px;
    align-items: baseline;
    margin: 8px 0;
  }
  .error {
    color: var(--text);
    text-transform: none;
    letter-spacing: 0.02em;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  th {
    font-weight: normal;
    text-align: left;
    padding: 4px 8px 4px 0;
    border-bottom: 1px solid var(--line);
  }
  td {
    padding: 3px 8px 3px 0;
    color: var(--text);
    text-transform: none;
    letter-spacing: 0.02em;
    vertical-align: baseline;
  }
  .num {
    white-space: nowrap;
  }
  .select {
    text-align: left;
    text-transform: none;
    letter-spacing: 0.02em;
    max-width: 240px;
    cursor: pointer;
  }
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
    align-items: baseline;
    margin-top: 18px;
  }
  .pair {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .check {
    text-transform: none;
    letter-spacing: 0.02em;
    cursor: pointer;
  }
  @media (max-width: 640px) {
    th:nth-child(2),
    td:nth-child(2) {
      display: none;
    }
  }
</style>
