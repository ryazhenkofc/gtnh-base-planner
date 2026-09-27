# Attribution

## GT5-Unofficial textures (LGPL-3.0)

The DETAILED view uses block textures from [GT5-Unofficial](https://github.com/GTNewHorizons/GT5-Unofficial)
by the GregTech: New Horizons team (GregTech 5 by GregoriusT and contributors), licensed under the
[GNU Lesser General Public License v3.0 (LGPL-3.0)](https://github.com/GTNewHorizons/GT5-Unofficial/blob/master/LICENSE.txt).

- The unmodified source files are kept in [`tools/texture-sources/`](tools/texture-sources/). They were downloaded
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
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_STAINLESSSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_POLYBENZIMIDAZOLE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ENGINE_INTAKE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_EXTREME_ENGINE_INTAKE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GRATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ASSEMBLER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_AUTOCLAVE.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/supercriticalFluidTurbineCasing.png` (stored as
  `SC_TURBINE_CASING.png`)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png`, stored once per frame
  material and tinted with that material's colour: `FRAME_STEEL.png` (Steel 0x808080), `FRAME_BRONZE.png`
  (Bronze 0xff8000), `FRAME_IRON.png` (Iron 0xc8c8c8), `FRAME_STAINLESSSTEEL.png` (Stainless Steel 0xc8c8dc),
  `FRAME_TITANIUM.png` (Titanium 0xdca0f0), `FRAME_POLYBENZIMIDAZOLE.png` (Polybenzimidazole 0x2d2d2d),
  `FRAME_TUNGSTENSTEEL.png` (Tungstensteel 0x6464a0), `FRAME_POLYTETRAFLUOROETHYLENE.png`
  (Polytetrafluoroethylene 0x646464), `FRAME_BLACKSTEEL.png` (Black Steel 0x646464) and `FRAME_EGLINSTEEL.png`
  (Eglin Steel 0x8b4513, GT++)
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
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/HV_SIDE_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/HV_TOP_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_STRIPES_A.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_SCHEST.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_STANK.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_ENERGY_OUT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/LARGE_SIEVE_GRATE.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_CENTRIFUGE.png`

Texture paths were located through `Textures.BlockIcons` (`src/main/java/gregtech/api/enums/Textures.java`), the
casing blocks (`BlockCasings1/2/3/4/8/10/11/12.java`, `BlockCasingsNH.java`), `MTECokeOven.java`,
`MTEHatchCokeOven.java`, `MTEBrickedBlastFurnace.java`, `MTEPyrolyseOven.java`, `BlockCyclotronCoils.java`,
`MTEAssemblyLine.java`, `MTEIndustrialCentrifuge.java`, `GregtechMetaCasingBlocks.java`,
`GregtechMetaCasingBlocks2.java`, the Eglin Steel material (`MaterialsAlloy.java`) and the Steel material definition
(`MaterialsInit.java`).

<!-- tools/gt-source: generated textures -->

### Files used by the generated catalog entries

Blocks of the generated catalog entries (see [`tools/gt-source/`](tools/gt-source/)), copied from the
`5.09.54.133` tag; frame boxes are the material icon multiplied by the material colour:

- `src/main/resources/assets/ggfab/textures/blocks/iconsets/OVERLAY_FRONT_ADV_ASSLINE.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/MAR_Casing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/MagicCasing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/essentiaCell/1.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/essentiaFilterCasing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fieldRestrictingGlass.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/2.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/3.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/4.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/5.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/preciseUnitCasing/0.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/pressureResistantWalls.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/radiationProtectionSteelFrame.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/speedingPipe_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/icons/LargeEssentiaSmeltery_Off.png`
- `src/main/resources/assets/gregtech/textures/blocks/icons/NeutronActivator_Off.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ALGAE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/AQUATIC_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/AQUATIC_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_IRON_FENCE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_NAQUADAHPREIN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_PLASCRETE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_QUARK_CONTAINMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_QUARK_PIPE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_QUARK_RELEASE_CHAMBER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_TSREIN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REDOX_EV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REDOX_UV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COMPRESSOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COMPRESSOR_PIPE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COMPRESSOR_PIPE_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CONCRETE_LIGHT_STONE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CONTAINMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COOLANT_DUCT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CUTTING_FACTORY_FRAME.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CYCLOTRON_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/DRONE_CENTRE_INACTIVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_BHG.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_COIL_NONSIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_COMPUTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_CONTROLLER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_DIM_0.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_FIELD_0.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_INNER_SPACETIME_REINFORCED_EOH_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_OUTER_SPACETIME_REINFORCED_EOH_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_PC.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_PC_ADV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_PC_ADV_NONSIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_PC_NONSIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_PC_VENT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_PC_VENT_NONSIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_POWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_POWER_INFINITE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXTREME_DENSITY_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/FORGE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/FORMING_CORE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ForceFieldGlass.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ForceFieldGlassTop.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/HEATING_DUCT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/INCONEL_REINFORCED_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/INDUSTRIAL_SIEVE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/INTEGRAL_FRAMEWORK_EV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/LASER_PLATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ADVANCEDRADIATIONPROOF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_BERYLLIUM_INTEGRATED_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_CABLE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_EMS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_EXTREME_CORROSION_RESISTANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FRIDGE_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FRIDGE_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION_2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GRAPHITE_MODERATOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_HEARTH_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_HEARTH_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_HIGH_PRESSURE_RESISTANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_INDUSTRIAL_WATER_PLANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_INSULATED_FLUID_PIPE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_IRIDIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ITEM_PIPE_BLACK_PLUTONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ITEM_PIPE_BRASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_LASER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MAGICAL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MINING_BLACKPLUTONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MINING_NEUTRONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MINING_OSMIRIDIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MOTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_NAQUADAH_REINFORCED_DISTILLATION.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_NAQUADAH_REINFORCED_WATER_PLANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_OZONE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PCB_TIER_1.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PCB_TIER_2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PLASMA_HEATER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PROCESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PUMP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_QFT_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_RADIANT_NAQUADAH_ALLOY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_RADIATIONPROOF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_REFINED_GRAPHITE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_STRENGTHENED_INANIMATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TANK_10.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_VENT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_VENT_T2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_AWAKENEDDRACONIUM_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_CUPRONICKEL_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_NAQUADAH_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_SUPERCONDUCTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_DIM_BRIDGE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_DIM_INJECTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_DIM_TRANS_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_IV_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_LuV_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_UEV_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MASS_SOLIDIFIER_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MASS_SOLIDIFIER_RADIATOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MATTER_FABRICATOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MATTER_GENERATION_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MIXING_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MOLECULAR_CONTAINMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MULTI-USE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MV_SIDE_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MV_TOP_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/Manipulator_Top.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/Modulator_3.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_MESH_INTERFACE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_REINFORCEMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NAQUADAH_REACTOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NAQUADAH_REACTOR_SOLID_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NAQUADRIA_REINFORCED_WATER_PLANT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NEUTRONIUM_ACTIVE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NEUTRONIUM_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NEUTRONIUM_STABLE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NeutronPulseManipulator.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NeutronShieldingCore.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_DTPF_OFF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ASSEMBLY_LINE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ASSEMBLY_MATRIX.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAMCRAFTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAM_MIRROR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAM_SPLITTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAM_STABILIZER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BOARD_PROCESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_COMPONENT_ASSEMBLY_LINE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_CUTTING_CHAMBER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DIESEL_ENGINE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DISASSEMBLER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DYSONSPHERE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_EMS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ENCASEMENT_WRAPPER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ENGRAVER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ETCHING_ARRAY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_FRIDGE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_HEARTH.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_HEAT_EXCHANGER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_LNE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MASS_SOLIDIFIER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MEGA_CHEMICAL_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MEGA_DISTILLATION_TOWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MEGA_OIL_CRACKER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_CANNER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_COMPRESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_LATEX.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_LATHE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_NUCLEAR_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_OIL_DRILL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_OPTICAL_ORGANIZER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ORE_DRILL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ORE_FACTORY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_PLANETARYSIPHON.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_PURIFICATION_PLANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_RESEARCH_COMPLETER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SMD_PROCESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SOLAR_FACTORY_INACTIVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SPLITTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SUPERCONDUCTOR_SPLITTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_WATER_PUMP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_WATER_T8.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_WIRE_TRACER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FUSION1.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FUSION2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FUSION3.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_ME_HATCH.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_MULTI_BLACKHOLE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_MULTI_NEUTRONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_QCHEST.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_TELEPORTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/PARTICLE_CONTAINMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/PRIMITIVE_WOODEN_CASING_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/PRIMITIVE_WOODEN_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/RADIATION_ABSORBENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ResonanceChamber_III.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SPARGE_TOWER_EXTERIOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SPINMATRON_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/STABILITY_CASING_0.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/STURDY_PRINTER_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SUB_STATION_EXTERNAL_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TFFT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_TOROID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_TOWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UEV_SIDE_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UEV_TOP_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UHV_SIDE_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UHV_TOP_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UV_BACKLIGHT_STERILIZER_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/VACUUM_CASING_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/VACUUM_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/WATER_PLANT_CONCRETE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 0, 209, 11)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 100, 100, 100)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 100, 100, 255)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 102, 0, 51)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 110, 110, 110)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 118, 220, 138)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 120, 120, 180)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 138, 138, 138)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 139, 136, 120)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 140, 100, 100)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 149, 224, 17)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 18, 100, 255)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 201, 151, 129)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 211, 255, 255)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 215, 230, 230)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 240, 240, 120)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 240, 240, 245)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 244, 78, 0)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 250, 250, 250)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 255, 255, 30)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 30, 177, 255)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 30, 30, 30)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 40, 40, 40)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 50, 50, 50)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 51, 0, 102)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 52, 103, 186)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 53, 93, 106)
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png` (_tinted_ 68, 75, 66)
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/spaceElevator/BaseCasing.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/spaceElevator/CablePart.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/spaceElevator/InternalStructure.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.coolant_delivery.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.electrode.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.focus_holder.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.focus_manipulator.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.niobium_cavity.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.shielded_accelerator.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.target_holder.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.target_receptacle.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/CASING_AMAZON.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_ADVANCED_CRYOGENIC.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_ADVANCED_VOLCANUS.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_FIREBOX_STABALLOY.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_FLOTATION.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_FLUID_INCOLOY_DS.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_GEARBOX_T1.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_GRINDING_FACTORY.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_GRISIUM.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_GRISIUM_TOP.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_HASTELLOY_N.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_HASTELLOY_X.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_MARAGINGSTEEL.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_POTIN.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_RED_STEEL.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_STELLITE.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_TALONITE.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_TANTALLOY61.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_ZERON100.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_STABLE_ZIRCONIUM_CARBIDE.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/adv_machine_matterfab.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/adv_machine_matterfab_animated.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/adv_machine_screen_random3.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/machine_top.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/overlay_rainbowscreen.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/sterileCasing.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/Grinder/GRINDER5.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/MACHINE_CASING_FUSION_3.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/MACHINE_CASING_FUSION_4.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/MACHINE_CASING_FUSION_COIL_II.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/MACHINE_CASING_FUSION_COIL_III.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/OVERLAY_FRONT_ADVANCED_MULTIBLOCK_ANIMATED.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/advancedEBF.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/advancedHeatExchanger.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/advancedImplosion.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/algaePondBase.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/alloyBlastSmelter.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/amazonPackager.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/chemicalPlant.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/cokeOven.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/elementalDuplicator.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/fluidHeater.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/frothFlotationCell.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialChisel.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialCuttingMachine.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialDehydrator.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialElectrolyzer.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialExtruder.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialForgeHammer.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialMixer.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialMolecularTransformer.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialPlatePress.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialRockBreaker.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialSifter.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialThermalCentrifuge.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialVacuumFreezer.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialWashPlant.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/industrialWiremill.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/megaAlloyBlastSmelter.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/quantumForceTransformer.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/spargeTower.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/thermalBoiler.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/treeFarm.png`

<!-- /tools/gt-source -->
