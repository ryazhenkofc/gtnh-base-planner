import machines from './single-machines.json' with { type: 'json' };

/**
 * The GT single-block machines a template can show with their own look (src/data/single-machines.json): the
 * machine hull with the machine's front overlay. A site group of single blocks names its machine by `id`; the
 * atlas has the block `site.machine.<id>` for it (scripts/build-atlas.mjs).
 */
export interface SingleMachine {
  id: string;
  name: string;
  /** Names GTNH Planner calls it by (recipe map names, lower case). */
  names: string[];
}

export const SINGLE_MACHINES: readonly SingleMachine[] = machines;

const byId = new Map(SINGLE_MACHINES.map((m) => [m.id, m]));
const byName = new Map(SINGLE_MACHINES.flatMap((m) => m.names.map((n) => [n, m] as const)));

/** Block id of a machine look (see `blockInfo`). */
export const singleMachineBlockId = (id: string): string => `site.machine.${id}`;

export function getSingleMachine(id: string): SingleMachine | undefined {
  return byId.get(id);
}

/** The look for a machine type as GTNH Planner names it ("Macerator", "Gas Turbine"), or undefined. */
export function singleMachineForName(name: string): SingleMachine | undefined {
  return byName.get(name.trim().toLowerCase());
}
