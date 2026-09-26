/**
 * Block registry: every blockId used by multiblock JSON files must be listed here.
 * `color` is the flat colour for SIMPLE view and the fallback for DETAILED.
 * Texture mapping for DETAILED view lives in `src/render/textures.json` (owned by the renderer).
 * Additive changes only: other work units rely on these ids.
 */
export interface BlockInfo {
  id: string;
  name: string;
  color: string;
}

const list: BlockInfo[] = [
  // Coke Oven (GT:NH 2.9+)
  { id: 'gt.cokeOvenBrick', name: 'Coke Oven Bricks', color: '#a0654a' },
  { id: 'gt.cokeOvenController', name: 'Coke Oven', color: '#6b3b2a' },
  { id: 'gt.cokeOvenHatch', name: 'Coke Oven Hatch', color: '#7a4a35' },

  // Common GT machine casings
  { id: 'gt.casing.heatProof', name: 'Heat Proof Machine Casing', color: '#b8a58c' },
  { id: 'gt.casing.frostProof', name: 'Frost Proof Machine Casing', color: '#b9d7e6' },
  { id: 'gt.casing.solidSteel', name: 'Solid Steel Machine Casing', color: '#8f959c' },
  { id: 'gt.casing.cleanStainless', name: 'Clean Stainless Steel Machine Casing', color: '#c9ced4' },
  { id: 'gt.casing.stableTitanium', name: 'Stable Titanium Machine Casing', color: '#9d93b0' },
  { id: 'gt.casing.chemicallyInert', name: 'Chemically Inert Machine Casing', color: '#e3e3dc' },
  { id: 'gt.casing.ptfePipe', name: 'PTFE Pipe Machine Casing', color: '#f1f1ee' },
  { id: 'gt.casing.ulv', name: 'ULV Machine Casing', color: '#6f6f6f' },
  { id: 'gt.casing.bronzePlated', name: 'Bronze Plated Bricks', color: '#b07a3c' },
  { id: 'gt.casing.steelSolid', name: 'Solid Steel Machine Casing', color: '#8f959c' },
  { id: 'gt.casing.bronzeFirebox', name: 'Bronze Firebox Casing', color: '#9c6a33' },
  { id: 'gt.casing.steelFirebox', name: 'Steel Firebox Casing', color: '#6e747a' },
  { id: 'gt.casing.robustTungstensteel', name: 'Robust Tungstensteel Machine Casing', color: '#4b5058' },
  { id: 'gt.coil.cupronickel', name: 'Cupronickel Coil Block', color: '#c9844f' },
  { id: 'gt.glass.reinforced', name: 'Reinforced Glass', color: '#cfe6ee' },

  // Generic controllers and hatches (flat colours; hatches are recoloured by kind in SIMPLE view)
  { id: 'gt.controller', name: 'Multiblock Controller', color: '#3d4247' },
  { id: 'gt.hatch.inputBus', name: 'Input Bus', color: '#5b6168' },
  { id: 'gt.hatch.outputBus', name: 'Output Bus', color: '#5b6168' },
  { id: 'gt.hatch.inputHatch', name: 'Input Hatch', color: '#5b6168' },
  { id: 'gt.hatch.outputHatch', name: 'Output Hatch', color: '#5b6168' },
  { id: 'gt.hatch.energy', name: 'Energy Hatch', color: '#5b6168' },
  { id: 'gt.hatch.dynamo', name: 'Dynamo Hatch', color: '#5b6168' },
  { id: 'gt.hatch.maintenance', name: 'Maintenance Hatch', color: '#5b6168' },
  { id: 'gt.hatch.muffler', name: 'Muffler Hatch', color: '#5b6168' },

  // Added by the multiblock catalog (unit 9)
  { id: 'gt.casing.firebricks', name: 'Firebricks', color: '#8e5a3c' },
  { id: 'gt.casing.titaniumPipe', name: 'Titanium Pipe Casing', color: '#a89cb8' },
  { id: 'gt.casing.steelPipe', name: 'Steel Pipe Casing', color: '#7d848b' },
  { id: 'gt.casing.pyrolyseOven', name: 'Pyrolyse Oven Casing', color: '#6d5a4a' },
  { id: 'gt.casing.itemPipeTin', name: 'Tin Item Pipe Casing', color: '#b4b8bd' },
  { id: 'gt.casing.reinforcedWooden', name: 'Reinforced Wooden Casing', color: '#8a6a43' },
  { id: 'gt.frame.steel', name: 'Steel Frame Box', color: '#6f767d' },
];

export const BLOCKS: Readonly<Record<string, BlockInfo>> = Object.fromEntries(list.map((b) => [b.id, b]));

export function blockInfo(id: string): BlockInfo {
  return BLOCKS[id] ?? { id, name: id, color: '#999999' };
}
