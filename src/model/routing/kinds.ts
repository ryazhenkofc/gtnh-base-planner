import type { HatchKind } from '../types';

/** Hatch kinds that routing connects with pipes or cables. */

/** Hatch kinds that get pipe/conveyor networks. */
export const PIPE_KINDS = ['itemIn', 'itemOut', 'fluidIn', 'fluidOut', 'steamIn'] as const;

/** Hatch kinds that get cable networks (energy in, dynamo out). */
export const CABLE_KINDS = ['energy', 'dynamo'] as const;

/** Every kind routing can connect, in routing order: pipes first, then cables. */
export const ROUTED_KINDS = [...PIPE_KINDS, ...CABLE_KINDS] as const;

export type RoutedKind = (typeof ROUTED_KINDS)[number];

/** Whether a routed kind is a cable (drawn thinner) rather than a pipe. */
export function isCable(kind: HatchKind): boolean {
  return (CABLE_KINDS as readonly HatchKind[]).includes(kind);
}

export function isRoutable(kind: HatchKind): kind is RoutedKind {
  return (ROUTED_KINDS as readonly HatchKind[]).includes(kind);
}
