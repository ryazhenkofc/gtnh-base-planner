/** Pure helpers for the numeric text fields (count and limits). */

export const COUNT_MIN = 1;
export const COUNT_MAX = 200;
export const LIMIT_MIN = 1;
/** Limits are unit counts per axis, so more than the maximum count never matters. */
export const LIMIT_MAX = COUNT_MAX;

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Clamp any number to a valid unit count (1..200). Non-finite values become the minimum. */
export function clampCount(n: number): number {
  return Number.isFinite(n) ? clampInt(n, COUNT_MIN, COUNT_MAX) : COUNT_MIN;
}

/**
 * Parse a count typed by the user. Returns the clamped count, or `null` when the text is not a number
 * (the caller then keeps the previous value).
 */
export function parseCount(text: string): number | null {
  const s = text.trim();
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null;
  return clampCount(Number(s));
}

/**
 * Parse a limit typed by the user.
 * - empty, `∞`, `-` → `null` (unlimited)
 * - a number → clamped integer in 1..200 (units along that axis)
 * - anything else → `undefined` (invalid; keep the previous value)
 */
export function parseLimit(text: string): number | null | undefined {
  const s = text.trim();
  if (s === '' || s === '∞' || s === '-' || s === '—') return null;
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return undefined;
  return clampInt(Number(s), LIMIT_MIN, LIMIT_MAX);
}

export function formatLimit(value: number | null): string {
  return value === null ? '' : String(value);
}

/**
 * Parse a height / length typed by the user: a number rounded to an integer, or `null` when the text is not
 * a number. The multiblock snaps it to a size it can take.
 */
export function parseSize(text: string): number | null {
  const s = text.trim();
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(Number(s));
}
