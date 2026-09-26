import { describe, expect, it } from 'vitest';
import { clampCount, formatLimit, parseCount, parseLimit } from './fields';

describe('count', () => {
  it('clamps to 1..2000 and rounds', () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(-5)).toBe(1);
    expect(clampCount(250)).toBe(250);
    expect(clampCount(2001)).toBe(2000);
    expect(clampCount(7.6)).toBe(8);
    expect(clampCount(Number.NaN)).toBe(1);
    expect(clampCount(Infinity)).toBe(1);
  });

  it('parses typed text', () => {
    expect(parseCount(' 12 ')).toBe(12);
    expect(parseCount('999')).toBe(999);
    expect(parseCount('99999')).toBe(2000);
    expect(parseCount('0')).toBe(1);
    expect(parseCount('')).toBeNull();
    expect(parseCount('abc')).toBeNull();
    expect(parseCount('1e3')).toBeNull();
  });
});

describe('limits', () => {
  it('treats empty and infinity as unlimited', () => {
    expect(parseLimit('')).toBeNull();
    expect(parseLimit('  ')).toBeNull();
    expect(parseLimit('∞')).toBeNull();
    expect(parseLimit('-')).toBeNull();
  });

  it('clamps numbers to 1..2000 units', () => {
    expect(parseLimit('15')).toBe(15);
    expect(parseLimit('0')).toBe(1);
    expect(parseLimit('-4')).toBe(1);
    expect(parseLimit('9999')).toBe(2000);
    expect(parseLimit('2.4')).toBe(2);
  });

  it('rejects junk', () => {
    expect(parseLimit('x')).toBeUndefined();
    expect(parseLimit('12a')).toBeUndefined();
  });

  it('formats', () => {
    expect(formatLimit(null)).toBe('');
    expect(formatLimit(15)).toBe('15');
  });
});
