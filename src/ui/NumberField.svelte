<script lang="ts">
  /**
   * A numeric text field that never rewrites itself while the user types.
   * The value is committed on change, blur and Enter; Escape reverts.
   */
  interface Props {
    value: string;
    label: string;
    placeholder?: string;
    testid?: string;
    width?: string;
    oncommit: (text: string) => void;
  }
  let { value, label, placeholder = '', testid, width = '3.5em', oncommit }: Props = $props();

  let draft = $state('');
  let focused = $state(false);

  // Follow the store only while the user is not editing.
  $effect(() => {
    if (!focused) draft = value;
  });

  function commit() {
    if (draft !== value) oncommit(draft);
  }

  function onkeydown(e: KeyboardEvent) {
    const input = e.currentTarget as HTMLInputElement;
    if (e.key === 'Enter') {
      commit();
      input.blur();
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
  onchange={commit}
  onblur={() => {
    commit();
    focused = false;
  }}
  {onkeydown}
/>
