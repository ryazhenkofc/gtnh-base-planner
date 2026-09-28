<script lang="ts">
  import { t } from '../i18n/en';
  import { notify } from './notices';
  import NumberField from './NumberField.svelte';

  /**
   * A NumberField with − / + buttons and a dotted underline, so it reads as editable. ↑ / ↓ step too
   * (Shift: 5). With `empty` (limits), stepping below `min` clears the field and + from empty gives `min`.
   * A typed value outside `min`..`max` is clamped by the consumer; the field says so in a notice.
   */
  interface Props {
    value: string;
    label: string;
    min: number;
    max: number;
    empty?: boolean;
    placeholder?: string;
    testid?: string;
    width?: string;
    oncommit: (text: string) => void;
  }
  let {
    value,
    label,
    min,
    max,
    empty = false,
    placeholder = '',
    testid,
    width = '2.6em',
    oncommit,
  }: Props = $props();

  const current = $derived(value.trim() === '' ? null : Number(value));

  function step(delta: number) {
    const cur = current;
    let next: number | null;
    if (cur === null || !Number.isFinite(cur)) next = delta > 0 ? min : null;
    else if (cur + delta < min) next = empty ? null : min;
    else next = Math.min(max, cur + delta);
    const text = next === null ? '' : String(next);
    if (text !== value) oncommit(text);
  }

  function commit(text: string) {
    const n = Number(text.trim());
    if (text.trim() !== '' && Number.isFinite(n) && (n < min || n > max))
      notify(t.clamped(label, min, max), 4000, 'clamp');
    oncommit(text);
  }
</script>

<!-- The input comes first in the DOM so a wrapping <label> targets it, not the − button (shown first). -->
<span class="stepper">
  <NumberField {value} {label} {placeholder} {testid} {width} oncommit={commit} onstep={step} /><button
    class="step down"
    type="button"
    tabindex="-1"
    aria-label={t.stepDown(label)}
    disabled={current === null || (!empty && current <= min)}
    onclick={() => step(-1)}>{t.minus}</button
  ><button
    class="step"
    type="button"
    tabindex="-1"
    aria-label={t.stepUp(label)}
    disabled={current !== null && current >= max}
    onclick={() => step(1)}>{t.plus}</button
  >
</span>

<style>
  .stepper {
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
  }
  .stepper :global(.field) {
    text-align: center;
    border-bottom: 1px dotted var(--muted);
    padding-bottom: 2px;
  }
  .stepper :global(.field:focus) {
    border-bottom: 1px solid var(--text);
    text-decoration: none;
  }
  .step {
    appearance: none;
    background: none;
    border: 0;
    padding: 2px 5px;
    font-size: 13px;
    line-height: 1;
    color: var(--muted);
    cursor: pointer;
  }
  .down {
    order: -1;
  }
  .step:hover {
    color: var(--text);
  }
  .step:disabled {
    color: var(--faint);
    cursor: default;
  }
</style>
