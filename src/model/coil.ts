import type { LegendEntry, MultiblockDef } from './multiblock/types';

/** The heating coil every catalog multiblock is stored with. */
export const DEFAULT_COIL = 'gt.coil.cupronickel';

/**
 * Heating coil blocks, weakest first (GT5-Unofficial `BlockCasings5` metas 0..13). The index is stored in share
 * links, so entries are only ever appended.
 */
export const HEATING_COILS: readonly { id: string; label: string }[] = [
  { id: DEFAULT_COIL, label: 'Cupronickel' },
  { id: 'gregtech:gt.blockcasings5@1', label: 'Kanthal' },
  { id: 'gregtech:gt.blockcasings5@2', label: 'Nichrome' },
  { id: 'gregtech:gt.blockcasings5@3', label: 'Tungstensteel' },
  { id: 'gregtech:gt.blockcasings5@4', label: 'HSS-G' },
  { id: 'gregtech:gt.blockcasings5@5', label: 'Naquadah' },
  { id: 'gregtech:gt.blockcasings5@6', label: 'Naquadah Alloy' },
  { id: 'gregtech:gt.blockcasings5@7', label: 'Electrum Flux' },
  { id: 'gregtech:gt.blockcasings5@8', label: 'Awakened Draconium' },
  { id: 'gregtech:gt.blockcasings5@9', label: 'HSS-S' },
  { id: 'gregtech:gt.blockcasings5@10', label: 'Trinium' },
  { id: 'gregtech:gt.blockcasings5@11', label: 'Infinity' },
  { id: 'gregtech:gt.blockcasings5@12', label: 'Hypogen' },
  { id: 'gregtech:gt.blockcasings5@13', label: 'Eternal' },
];

/** Whether the multiblock has heating coils whose tier a plan can change. */
export function hasHeatingCoil(def: MultiblockDef | undefined): boolean {
  return !!def && Object.values(def.legend).some((e) => e.blockId === DEFAULT_COIL);
}

const memo = new WeakMap<MultiblockDef, Map<string, MultiblockDef>>();

/**
 * `def` with its heating coils replaced by `coil` (a `HEATING_COILS` id). Memoised per `(def, coil)`, so the
 * per-def caches keep working. Returns `def` itself for the default coil, an unknown id, or a multiblock
 * without heating coils.
 */
export function coiledDef(def: MultiblockDef, coil: string | undefined): MultiblockDef {
  if (!coil || coil === DEFAULT_COIL || !hasHeatingCoil(def)) return def;
  if (!HEATING_COILS.some((c) => c.id === coil)) return def;
  let byCoil = memo.get(def);
  if (!byCoil) memo.set(def, (byCoil = new Map()));
  let out = byCoil.get(coil);
  if (!out) {
    const legend: Record<string, LegendEntry> = {};
    for (const [ch, e] of Object.entries(def.legend)) {
      legend[ch] = e.blockId === DEFAULT_COIL ? { ...e, blockId: coil } : e;
    }
    byCoil.set(coil, (out = { ...def, legend }));
  }
  return out;
}
