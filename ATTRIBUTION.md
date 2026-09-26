# Attribution

## GT5-Unofficial textures (LGPL-3.0)

The DETAILED view uses block textures from [GT5-Unofficial](https://github.com/GTNewHorizons/GT5-Unofficial)
by the GregTech: New Horizons team (GregTech 5 by GregoriusT and contributors), licensed under the
[GNU Lesser General Public License v3.0 (LGPL-3.0)](https://github.com/GTNewHorizons/GT5-Unofficial/blob/master/LICENSE.txt).

- The unmodified source files are kept in [`public/textures/src/`](public/textures/src/). They were downloaded
  from the `master` branch on 2026-09-26 with `node scripts/build-atlas.mjs --fetch`.
- [`public/textures/atlas.png`](public/textures/atlas.png) is derived from those files by
  [`scripts/build-atlas.mjs`](scripts/build-atlas.mjs): each icon is cropped to its first 16×16 frame and
  packed into one image, and the tiered machine casings (`MACHINE_<tier>_*`) are multiplied by the game's
  default machine-metal colour (210, 220, 255). At runtime, hatch mode icons are recoloured with the plan's
  hatch colours. The atlas and the source files stay under LGPL-3.0. To swap in your own versions, edit the
  sources and rerun the script.
- GT5-Unofficial credits third-party texture work. Its README says some textures came from future versions of
  GregTech and from texture pack authors for GTNH. It credits Jimbno for the
  [UU-Tex](https://github.com/Jimbno/UU-Tex) texture pack and its contributions to the base pack, and
  EtVitki for the Spacetime material textures. Those credits also apply to the files below.

No Minecraft (Mojang) textures are included. Vanilla blocks are drawn with flat colours.

### Files used

All paths are relative to the root of the GT5-Unofficial repository. Files marked _tinted_ are multiplied by
the machine-metal colour in the atlas.

- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COKE_OVEN_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COKE_OVEN_OVERLAY_INACTIVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HEATPROOFCASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FROST_PROOF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_SOLID_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_CLEAN_STAINLESSSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_STABLE_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ROBUST_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_CHEMICALLY_INERT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_POLYTETRAFLUOROETHYLENE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_BRONZE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GEARBOX_BRONZE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GEARBOX_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GEARBOX_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GEARBOX_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_BRONZEPLATEDBRICKS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_DENSEBRICKS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_BRICKEDBLASTFURNACE_INACTIVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ITEM_PIPE_TIN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REINFORCED_WOOD.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REINFORCED_WOOD_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_BRONZE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_BRONZE_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_STEEL_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TITANIUM_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TUNGSTENSTEEL_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_ULV_SIDE.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_ULV_TOP.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_ULV_BOTTOM.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_LV_SIDE.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_LV_TOP.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_LV_BOTTOM.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_MV_SIDE.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_MV_TOP.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_MV_BOTTOM.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HV_SIDE.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HV_TOP.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HV_BOTTOM.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_EV_SIDE.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_EV_TOP.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_EV_BOTTOM.png` (tinted)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_CUPRONICKEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_KANTHAL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_NICHROME.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_HSSG.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_HSSS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_NAQUADAH.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_NAQUADAHALLOY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/REINFORCED_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (stored as
  `FRAME_STEEL.png`; tinted with the Steel material colour 0x808080)
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ELECTRIC_BLAST_FURNACE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_VACUUM_FREEZER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_IMPLOSION_COMPRESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DISTILLATION_TOWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_SMELTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_OIL_CRACKER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_LARGE_BOILER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_PYROLYSE_OVEN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_PIPE_IN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_PIPE_OUT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ITEM_IN_SIGN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ITEM_OUT_SIGN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/FLUID_IN_SIGN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/FLUID_OUT_SIGN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_ENERGY_IN_LV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_ENERGY_OUT_LV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_MAINTENANCE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_MUFFLER.png`

Texture paths were located through `Textures.BlockIcons` (`src/main/java/gregtech/api/enums/Textures.java`), the
casing blocks (`BlockCasings1/2/3/4/8/10/11/12.java`, `BlockCasingsNH.java`), `MTECokeOven.java`,
`MTEHatchCokeOven.java`, `MTEBrickedBlastFurnace.java`, `MTEPyrolyseOven.java` and the Steel material definition
(`MaterialsInit.java`).
