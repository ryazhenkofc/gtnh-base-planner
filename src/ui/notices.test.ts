import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { t } from '../i18n/en';
import { LONG_LINK_CHARS, clearSlot, linkCopiedNotice, notices, notify } from './notices';

describe('notices', () => {
  it('replaces by slot, dedupes by text and keeps at most three', () => {
    notices.set([]);
    notify('a', 0, 'pack');
    notify('b', 0, 'pack');
    expect(get(notices).map((n) => n.text)).toEqual(['b']);
    notify('c', 0);
    notify('c', 0);
    expect(get(notices).map((n) => n.text)).toEqual(['b', 'c']);
    clearSlot('pack');
    expect(get(notices).map((n) => n.text)).toEqual(['c']);
    notify('d', 0);
    notify('e', 0);
    notify('f', 0);
    expect(get(notices).map((n) => n.text)).toEqual(['d', 'e', 'f']);
  });
});

describe('linkCopiedNotice', () => {
  it('suggests the file for links too long to share reliably', () => {
    expect(linkCopiedNotice('x'.repeat(LONG_LINK_CHARS))).toBe(t.linkCopied);
    expect(linkCopiedNotice('x'.repeat(LONG_LINK_CHARS + 1))).toBe(t.linkCopiedLong);
  });
});
