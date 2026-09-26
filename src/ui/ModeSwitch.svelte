<script lang="ts">
  import { t } from '../i18n/en';
  import { appMode } from '../state/site';
</script>

<div class="mode" role="group" aria-label={t.modeLabel}>
  <button
    class="link"
    class:active={$appMode === 'machine'}
    aria-pressed={$appMode === 'machine'}
    data-testid="mode-machine"
    onclick={() => appMode.set('machine')}>{t.modeMachine}</button
  >
  <span class="sep" aria-hidden="true">{t.slash}</span>
  <button
    class="link"
    class:active={$appMode === 'site'}
    aria-pressed={$appMode === 'site'}
    data-testid="mode-site"
    onclick={() => appMode.set('site')}>{t.modeSite}</button
  >
</div>

<style>
  .mode {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sep {
    color: var(--faint);
  }
</style>
