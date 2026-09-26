import { getMultiblock } from '../data/catalog';
import type { HatchKind, PlanLimits, PlanState } from '../model/types';
import { defaultPlan, plan, selectedUnits } from '../state/store';
import { clampCount } from './fields';

/* Pure plan transforms (tested) + thin store wrappers used by the components. */

function withoutManual(p: PlanState): PlanState {
  const next = { ...p };
  delete next.manualUnits;
  return next;
}

/** New count (clamped). A manual layout is dropped so the new count is auto-packed. */
export function withCount(p: PlanState, n: number): PlanState {
  const count = clampCount(n);
  if (count === p.count && !p.manualUnits) return p;
  return { ...withoutManual(p), count };
}

/** New limit for one axis. Like the count, it re-packs, so a manual layout is dropped. */
export function withLimit(p: PlanState, axis: keyof PlanLimits, value: number | null): PlanState {
  if (p.limits[axis] === value) return p;
  return { ...withoutManual(p), limits: { ...p.limits, [axis]: value } };
}

/** Switch multiblock: keep count, limits and colours; take the new default hatches; drop manual units. */
export function withMultiblock(p: PlanState, id: string): PlanState {
  if (p.multiblockId === id) return p;
  const def = getMultiblock(id);
  if (!def) return p;
  return { ...withoutManual(p), multiblockId: id, enabledHatches: [...def.defaultHatches] };
}

export function withHatchToggled(p: PlanState, kind: HatchKind): PlanState {
  const on = p.enabledHatches.includes(kind);
  return {
    ...p,
    enabledHatches: on ? p.enabledHatches.filter((k) => k !== kind) : [...p.enabledHatches, kind],
  };
}

export function withHatchColor(p: PlanState, kind: HatchKind, color: string): PlanState {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return p;
  return { ...p, colors: { ...p.colors, [kind]: color.toLowerCase() } };
}

export function withDefaultColors(p: PlanState): PlanState {
  return Object.keys(p.colors).length ? { ...p, colors: {} } : p;
}

// Store wrappers

export const setCount = (n: number) => plan.update((p) => withCount(p, n));
export const setLimit = (axis: keyof PlanLimits, v: number | null) =>
  plan.update((p) => withLimit(p, axis, v));
export const toggleHatch = (k: HatchKind) => plan.update((p) => withHatchToggled(p, k));
export const setHatchColor = (k: HatchKind, c: string) => plan.update((p) => withHatchColor(p, k, c));
export const resetColors = () => plan.update(withDefaultColors);

export function selectMultiblock(id: string): void {
  selectedUnits.set([]);
  plan.update((p) => withMultiblock(p, id));
}

/** Reset to the default plan of the current multiblock. */
export function resetPlan(): void {
  selectedUnits.set([]);
  plan.update((p) => defaultPlan(getMultiblock(p.multiblockId) ? p.multiblockId : undefined));
}
