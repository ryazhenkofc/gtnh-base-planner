<script lang="ts">
  /**
   * A numeric text field that never rewrites itself while the user types.
   * The value is committed on change, blur and Enter; Escape reverts. With `onstep`, ↑ / ↓ step the value
   * (Shift: 5).
   */
  interface Props {
    value: string;
    label: string;
    placeholder?: string;
    testid?: string;
    width?: string;
    oncommit: (text: string) => void;
    onstep?: (delta: number) => void;
  }
  let { value, label, placeholder = '', testid, width = '3.5em', oncommit, onstep }: Props = $props();

  let draft = $state('');
  let focused = $state(false);
  /** After a step the field shows the stored value again, even while focused, until the user types. */
  let follow = $state(false);

  // Follow the store only while the user is not editing.
  $effect(() => {
    const v = value;
    if (!focused || follow) draft = v;
  });

  function commit() {
    if (draft !== value) oncommit(draft);
  }

  function onkeydown(e: KeyboardEvent) {
    const input = e.currentTarget as HTMLInputElement;
    if (e.key === 'Enter') {
      commit();
      input.blur();
    } else if (onstep && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      // Keep what was typed so far, then step from it.
      commit();
      follow = true;
      onstep((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1));
    } else if (e.key === 'Escape') {
      // Cancel just this edit; do not let the window handler close the drawer too.
      e.stopPropagation();
      draft = value;
      input.blur();
    }
  }
</script>

<input
  class="field"
  type="text"
  inputmode="numeric"
  autocomplete="off"
  spellcheck="false"
  aria-label={label}
  data-testid={testid}
  {placeholder}
  style:width
  bind:value={draft}
  onfocus={() => (focused = true)}
  oninput={() => (follow = false)}
  onchange={commit}
  onblur={() => {
    commit();
    focused = false;
    follow = false;
  }}
  {onkeydown}
/>
