/** Voltage tiers in ascending order; a multiblock's `tier` must be one of these. Steam sits below ULV. */
export const TIER_ORDER = [
  'Steam',
  'ULV',
  'LV',
  'MV',
  'HV',
  'EV',
  'IV',
  'LuV',
  'ZPM',
  'UV',
  'UHV',
  'UEV',
  'UIV',
  'UMV',
  'UXV',
  'MAX',
] as const;

/** Index in TIER_ORDER; entries without a tier sort after all tiers. */
export function tierRank(tier: string | undefined): number {
  const i = tier === undefined ? -1 : TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  return i === -1 ? TIER_ORDER.length : i;
}
