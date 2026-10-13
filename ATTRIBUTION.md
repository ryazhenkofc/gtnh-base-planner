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
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_ELECTRUMFLUX.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_TRINIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_INFINITY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_ETERNAL.png`
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

<!-- tools/game-dump: generated textures -->

### Files used by the generated catalog entries

The face tiles of the generated catalog entries (`tools/texture-sources/DUMP_*.png`, see
[`tools/game-dump/`](tools/game-dump/)) are these block sprites of the GT5-Unofficial `5.09.54.133` jar (the
resources under `src/main/resources/` in the repository), tinted and layered the way the game draws them:

- `src/main/resources/assets/goodgenerator/textures/blocks/supercriticalFluidTurbineCasing.png`
- `src/main/resources/assets/bartworks/textures/blocks/BoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/InfinityReinforcedBoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/IridiumReinforcedBoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/NeutroniumReinforcedBoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/NickelFerriteBlocks.png`
- `src/main/resources/assets/bartworks/textures/blocks/OsmiumReinforcedBoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/RhodiumPlatedPalladiumReinforcedBoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/TitaniumReinforcedBoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/TranscendentallyReinforcedBoronSilicateGlassBlock.png`
- `src/main/resources/assets/bartworks/textures/blocks/TransformerCoil.png`
- `src/main/resources/assets/ggfab/textures/blocks/iconsets/OVERLAY_FRONT_ADV_ASSLINE.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/FRF_Coils/1.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/MAR_Casing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/antimatterAnnihilationMatrix.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/antimatterContainmentCasing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/compAsslineCasing/0.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fieldRestrictingGlass.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/1.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/2.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/3.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/4.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/fuison/5.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/gravityStabilizationCasing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/magneticFluxCasing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/preciseUnitCasing/0.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/pressureResistantWalls.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/protomatterActivationCoil.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/radiationProtectionSteelFrame.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/speedingPipe_SIDE.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/yottaFluidTankCasing_SIDE.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/yottaFluidTankCell/1.png`
- `src/main/resources/assets/gregtech/textures/blocks/icons/NeutronActivator_Off.png`
- `src/main/resources/assets/gregtech/textures/blocks/icons/turbines/TURBINE_15.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ALGAE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/AQUATIC_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/AQUATIC_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_CONDUIT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_CONFLICTCASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_CONTROLLER_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_MANIPULATOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_PEACECASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_PRIMARYCOIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BEC_SECONDARYCOIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_COPPER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_IRON_FENCE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_NAQUADAHALLOY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_NAQUADAHPREIN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_NEUTRONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_PLASCRETE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_QUARK_CONTAINMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_QUARK_PIPE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_QUARK_RELEASE_CHAMBER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_TSREIN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/BLOCK_ZINC.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REDOX_EV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REDOX_UV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REINFORCED_WOOD.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CASING_REINFORCED_WOOD_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COKE_OVEN_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COKE_OVEN_OVERLAY_INACTIVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COLLIDER_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COMPRESSOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COMPRESSOR_PIPE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COMPRESSOR_PIPE_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CONCRETE_LIGHT_STONE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CONTAINMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/COOLANT_DUCT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CUTTING_FACTORY_FRAME.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/CYCLOTRON_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/DECAY_WAREHOUSE_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/DRONE_CENTRE_INACTIVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ELEMENTAL_CONFINEMENT_SHELL.png`
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
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXOFOUNDRY_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXOFOUNDRY_CENTRAL_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXOFOUNDRY_CENTRAL_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXOFOUNDRY_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXOFOUNDRY_INFINITE_CHASSIS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXOFOUNDRY_INFINITE_CHASSIS_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXOFOUNDRY_SECONDARY_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EXTREME_DENSITY_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/FORGE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/FORMING_CORE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ForceFieldGlass.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ForceFieldGlassTop.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GLASS_PH_RESISTANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GLASS_QUARK_CONTAINMENT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GLASS_TINTED_INDUSTRIAL_WHITE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GODFORGE_CONTROLLER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GODFORGE_ENERGY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GODFORGE_INNER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GODFORGE_SUPPORT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GODFORGE_TRIM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GRAVITON_CASING_2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/GRAVITON_TOP_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/HAWKING_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/HEATING_DUCT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/INCONEL_REINFORCED_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/INDUSTRIAL_SIEVE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/INDUSTRIAL_STRENGTH_CONCRETE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/INTEGRAL_FRAMEWORK_EV.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/LARGETURBINE_NEW5.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/LARGE_SIEVE_GRATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/LASER_PLATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_BRONZEPLATEDBRICKS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ADVANCEDRADIATIONPROOF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ASSEMBLER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_AUTOCLAVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_BERYLLIUM_INTEGRATED_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_CABLE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_CHEMICALLY_INERT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_CLEAN_STAINLESSSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_DENSEBRICKS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_EMS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ENGINE_INTAKE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_EXTREME_CORROSION_RESISTANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_EXTREME_ENGINE_INTAKE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_BRONZE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_BRONZE_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_STEEL_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TITANIUM_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FIREBOX_TUNGSTENSTEEL_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FLOCCULATION.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FRIDGE_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FRIDGE_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FROST_PROOF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION_2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_FUSION_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GEARBOX_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GEARBOX_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GEARBOX_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GRAPHITE_MODERATOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_GRATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_HEARTH_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_HEARTH_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_HIGH_PRESSURE_RESISTANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_INDUSTRIAL_WATER_PLANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_INSULATED_FLUID_PIPE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_IRIDIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ITEM_PIPE_BLACK_PLUTONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ITEM_PIPE_BRASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ITEM_PIPE_TIN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_LASER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MINING_BLACKPLUTONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MINING_NEUTRONIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MINING_OSMIRIDIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MOTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_NAQUADAH_REINFORCED_DISTILLATION.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_NAQUADAH_REINFORCED_WATER_PLANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_OZONE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PCB_TIER_1.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PCB_TIER_2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_BRONZE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_POLYBENZIMIDAZOLE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_POLYTETRAFLUOROETHYLENE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PIPE_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PLASMA_HEATER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PROCESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_PUMP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_QFT_COIL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_RADIANT_NAQUADAH_ALLOY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_RADIATIONPROOF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_REFINED_GRAPHITE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_ROBUST_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_SOLID_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_STABLE_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_STRENGTHENED_INANIMATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TANK_10.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_THAUMIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_STAINLESSSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_STEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_TITANIUM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_TURBINE_TUNGSTENSTEEL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_VENT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_VENT_T2.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_AWAKENEDDRACONIUM_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_CUPRONICKEL_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_HYPOGEN_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_NAQUADAH_BACKGROUND.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_COIL_SUPERCONDUCTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_DIM_BRIDGE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_DIM_INJECTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_DIM_TRANS_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HEATPROOFCASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HV_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HV_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_HV_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_IV_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_LV_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_LuV_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_MV_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_UEV_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_ULV_SIDE.png`
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
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_COMPUTATIONAL_MATRIX_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_FIREWALL_PROJECTION_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_FIREWALL_PROJECTION_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_MESH_INTERFACE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NANOCHIP_REINFORCEMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NAQUADAH_REACTOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NAQUADAH_REACTOR_SOLID_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NAQUADRIA_REINFORCED_WATER_PLANT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NEUTRONIUM_ACTIVE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NEUTRONIUM_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NEUTRONIUM_COATED_UV_RESISTANT_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NEUTRONIUM_STABLE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NeutronPulseManipulator.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/NeutronShieldingCore.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OMNI_PURPOSE_INFINITY_FUSED_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_DTPF_OFF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ASSEMBLY_LINE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ASSEMBLY_MATRIX.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAMCRAFTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAM_MIRROR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAM_SPLITTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BEAM_STABILIZER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BIOLOGICAL_COORDINATION.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_BOARD_PROCESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_COMPONENT_ASSEMBLY_LINE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_CUTTING_CHAMBER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DIESEL_ENGINE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DISASSEMBLER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DISTILLATION_TOWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_DYSONSPHERE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ELECTRIC_BLAST_FURNACE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_EMS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ENCASEMENT_WRAPPER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ENGRAVER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ETCHING_ARRAY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_EXOFOUNDRY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_EXTREME_DIESEL_ENGINE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_FRIDGE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_HEARTH.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_HEAT_EXCHANGER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_IMPLOSION_COMPRESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_INDUSTRIAL_EXTRACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_LARGE_BOILER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_LHC_ACCELERATOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_LNE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MASS_SOLIDIFIER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MEGA_CHEMICAL_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MEGA_DISTILLATION_TOWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MEGA_OIL_CRACKER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_AUTOCLAVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_BREWERY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_CANNER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_COMPRESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_LATEX.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_LATHE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MULTI_SMELTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_NANOCHIP_ASSEMBLY_COMPLEX.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_NUCLEAR_REACTOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_OIL_CRACKER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_OIL_DRILL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_OPTICAL_ORGANIZER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ORE_DRILL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ORE_FACTORY.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_PLANETARYSIPHON.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_PURIFICATION_PLANT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_PYROLYSE_OVEN.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SMD_PROCESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SOLAR_FACTORY_INACTIVE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SPLITTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_STEAM_ALLOY_SMELTER_MULTI.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_STEAM_CENTRIFUGE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_STEAM_COMPRESSOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_STEAM_FORGE_HAMMER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_STEAM_FURNACE_MULTI.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_STEAM_WASHER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SUPERCONDUCTOR_SPLITTER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_VACUUM_FREEZER.png`
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
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_TOP_STEAM_MACERATOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/PARTICLE_CONTAINMENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/PHONON_CONDUIT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/PRIMITIVE_WOODEN_CASING_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/PRIMITIVE_WOODEN_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/RADIATION_ABSORBENT_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/REINFORCED_GLASS.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/ResonanceChamber_III.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SCREEN_OFF.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SPARGE_TOWER_EXTERIOR_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SPINMATRON_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SPINMATRON_GRATE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/STABILITY_CASING_0.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/STURDY_PRINTER_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/SUB_STATION_EXTERNAL_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TFFT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_BASE_SIDES.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_BASE_TOP_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_TOROID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_TOWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_WINDING_PRIMARY_SIDES_0.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_WINDING_PRIMARY_TOP_BOTTOM_0.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_WINDING_SECONDARY_SIDES.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/TM_TESLA_WINDING_SECONDARY_TOP_BOTTOM.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UEV_SIDE_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UEV_TOP_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UHV_SIDE_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UHV_TOP_CYCLOTRON_SOLENOID.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/UV_BACKLIGHT_STERILIZER_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/VACUUM_CASING_SIDE.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/VACUUM_CASING_TOP.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/WATER_PLANT_CONCRETE_CASING.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/DULL/sheetmetal.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/METALLIC/sheetmetal.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/blockCasing.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/blockCasingAdvanced.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/sheetmetal.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/SHINY/sheetmetal.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlCasing.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlCasing_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlPrimary.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlPrimary_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlSecondary.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlSecondary_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlToroid.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ControlToroid_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/DeploymentUnitCasing.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/DeploymentUnitCasing_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/DeploymentUnitCore.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/DeploymentUnitCore_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/DeploymentUnitMagnet.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/DeploymentUnitMagnet_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/Floor.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/Floor_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ReceiverCasing.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ReceiverCasing_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ReceiverDish.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/dysonSwarm/ReceiverDish_Side.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/gasSiphon/SiphonCasing.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/spaceElevator/BaseCasing.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.antenna_t1.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.coolant_delivery.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.electrode.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.focus_holder.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.focus_manipulator.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.niobium_cavity.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.shielded_accelerator.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.shielded_accelerator_glass.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.target_holder.png`
- `src/main/resources/assets/gtnhlanth/textures/blocks/casing.target_receptacle.png`
- `src/main/resources/assets/kekztech/textures/blocks/GDCCeramicElectrolyteUnit.png`
- `src/main/resources/assets/kekztech/textures/blocks/LSCBase_side.png`
- `src/main/resources/assets/kekztech/textures/blocks/LSCBase_top.png`
- `src/main/resources/assets/kekztech/textures/blocks/LapotronicEnergyUnit6_side.png`
- `src/main/resources/assets/kekztech/textures/blocks/LapotronicEnergyUnit6_top.png`
- `src/main/resources/assets/kekztech/textures/blocks/TFFTCasing.png`
- `src/main/resources/assets/kekztech/textures/blocks/TFFTStorageFieldBlock1.png`
- `src/main/resources/assets/kekztech/textures/blocks/YSZCeramicElectrolyteUnit.png`
- `src/main/resources/assets/kubatech/textures/blocks/casing/defc_0.png`
- `src/main/resources/assets/kubatech/textures/blocks/casing/defc_1.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/CASING_AMAZON.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_ADVANCED_CRYOGENIC.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_ADVANCED_VOLCANUS.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_CENTRIFUGE.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_FIREBOX_STABALLOY.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_FLOTATION.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_FLUID_INCOLOY_DS.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_GEARBOX_T1.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_GRINDING_FACTORY.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_PIPE_T1.png`
- `src/main/resources/assets/miscutils/textures/blocks/TileEntities/MACHINE_CASING_ROCKETDYNE.png`
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
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/SC_TURBINE.png`
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
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/largeFluidExtractor.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/largeRocketEngine.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/megaAlloyBlastSmelter.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/quantumForceTransformer.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/solarTower.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/spargeTower.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/thermalBoiler.png`
- `src/main/resources/assets/miscutils/textures/blocks/iconsets/controllerFaces/treeFarm.png`
- `src/main/resources/assets/tectech/textures/blocks/blockSpatiallyTranscendentGravitationalLens.png`

The entries still converted from the sources use these files, copied from the same tag; frame boxes are the
material icon multiplied by the material colour:

- `src/main/resources/assets/goodgenerator/textures/blocks/MagicCasing.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/essentiaCell/1.png`
- `src/main/resources/assets/goodgenerator/textures/blocks/essentiaFilterCasing.png`
- `src/main/resources/assets/gregtech/textures/blocks/icons/LargeEssentiaSmeltery_Off.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/EM_CONTROLLER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/MACHINE_CASING_MAGICAL.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_RESEARCH_COMPLETER.png`
- `src/main/resources/assets/gregtech/textures/blocks/materialicons/NONE/frameGt.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/spaceElevator/BaseCasing.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/spaceElevator/CablePart.png`
- `src/main/resources/assets/gtnhintergalactic/textures/blocks/spaceElevator/InternalStructure.png`

<!-- /tools/game-dump -->

<!-- tools/game-dump: single-block machines -->

### Files used by the single-block machines of the template view

The front overlays of the GT single-block machines (`tools/texture-sources/SINGLE_*.png`, see
[`tools/game-dump/single-machines.mjs`](tools/game-dump/single-machines.mjs)) are these sprites of the
GT5-Unofficial `5.09.54.133` jar, drawn over the machine hull:

- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/alloy_smelter/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/amplifab/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/arc_furnace/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/assembler/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/autoclave/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/bender/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/boxinator/OVERLAY_FRONT_BOXINATOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/canner/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/centrifuge/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/chemical_bath/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/chemical_reactor/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/circuitassembler/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/compressor/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/cutter/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/distillery/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/electric_furnace/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/electrolyzer/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/electromagnetic_separator/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/extractor/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/extruder/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/fermenter/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/fluid_canner/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/fluid_extractor/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/fluid_heater/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/fluid_solidifier/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/hammer/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/laser_engraver/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/lathe/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/macerator/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/microwave/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/mixer/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/ore_washer/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/plasma_arc_furnace/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/polarizer/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/potionbrewer/OVERLAY_FRONT_POTIONBREWER.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/press/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/printer/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/pump/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/recycler/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/replicator/OVERLAY_FRONT_REPLICATOR.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/sifter/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/thermal_centrifuge/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/unboxinator/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/basicmachines/wiremill/OVERLAY_FRONT.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_MASSFAB.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_ROCK_BREAKER.png`
- `src/main/resources/assets/gregtech/textures/blocks/iconsets/OVERLAY_FRONT_SCANNER.png`

<!-- /tools/game-dump: single-block machines -->

## Modernity textures (CC BY-NC-SA 4.0)

The optional **Modernity textures** setting uses art from the
[Modernity-GTNH](https://github.com/ModernityGTNH/Modernity-GTNH) resource pack ("update all the textures of GTNH
to the style of Minecraft 1.14.4+"), by the Modernity-GTNH contributors. Copied from commit `1b52340` (2026-09-28).

- **Licence:** the pack is licensed under
  [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)
  (CC BY-NC-SA 4.0); the licence text is kept in
  [`tools/texture-sources-modernity/LICENSE-CC-BY-NC-SA-4.0.txt`](tools/texture-sources-modernity/LICENSE-CC-BY-NC-SA-4.0.txt).
  Its README credits further authors, and some of their assets carry their own terms: see the pack's
  [credits table](https://github.com/ModernityGTNH/Modernity-GTNH#readme).
- **Scope:** the licence covers only the PNGs in [`tools/texture-sources-modernity/`](tools/texture-sources-modernity/) and
  `public/textures/atlas-modernity.png`, which is built from them. They are not under this repository's MIT licence.
  Use of that atlas is **non-commercial only**, and a work derived from it must be shared under the same licence.
  The classic textures above are unaffected.
- **Changes made:** each file was taken from `assets/gregtech/textures/blocks/iconsets/` of the pack (a few tiles are
  layers stacked as in the game), cropped to its first 16×16 frame, multiplied by the machine-metal colour where
  the classic tile is, and packed into the atlas by [`scripts/build-atlas.mjs`](scripts/build-atlas.mjs).
- Tiles the pack does not cover keep the classic look. Mojang textures are not included.

### Modernity files used

Each is `tools/texture-sources-modernity/<name>.png`:

`CASING_REINFORCED_WOOD`, `CASING_REINFORCED_WOOD_TOP`, `DUMP_BASE_CASING`, `DUMP_BASE_CASING__EM_CONTROLLER`, `DUMP_BLOCK_CASING_ADVANCED_C8C8C8`, `DUMP_BLOCK_CASING_C8C8C8`, `DUMP_BLOCK_COPPER`, `DUMP_BLOCK_NAQUADAHALLOY`, `DUMP_BLOCK_NAQUADAHPREIN`, `DUMP_BLOCK_NAQUADAHPREIN__OVERLAY_FRONT_IMPLOSION_COMPRESSOR`, `DUMP_BLOCK_NEUTRONIUM`, `DUMP_BLOCK_PLASCRETE`, `DUMP_BLOCK_QUARK_CONTAINMENT_CASING__OVERLAY_FRONT_WATER_T8`, `DUMP_BLOCK_QUARK_RELEASE_CHAMBER`, `DUMP_BLOCK_SPATIALLY_TRANSCENDENT_GRAVITATIONAL_LENS`, `DUMP_BLOCK_TSREIN`, `DUMP_BLOCK_ZINC`, `DUMP_BORON_SILICATE_GLASS_BLOCK`, `DUMP_BORON_SILICATE_GLASS_BLOCK__OVERLAY_FRONT_PURIFICATION_PLANT`, `DUMP_CASING_AMAZON`, `DUMP_CASING_AMAZON__AMAZON_PACKAGER`, `DUMP_CASING_FOCUS_MANIPULATOR`, `DUMP_CASING_NIOBIUM_CAVITY`, `DUMP_CASING_REINFORCED_WOOD`, `DUMP_CASING_REINFORCED_WOOD_TOP`, `DUMP_CASING_REINFORCED_WOOD__OVERLAY_FRONT_MULTI_BREWERY`, `DUMP_CASING_SHIELDED_ACCELERATOR__OVERLAY_FRONT_OIL_CRACKER`, `DUMP_COMPRESSOR_CASING`, `DUMP_COMPRESSOR_CASING__OVERLAY_FRONT_MULTI_COMPRESSOR`, `DUMP_COMP_ASSLINE_CASING_0`, `DUMP_CONCRETE_LIGHT_STONE`, `DUMP_CONCRETE_LIGHT_STONE__OVERLAY_FRONT_HEAT_EXCHANGER`, `DUMP_CONTROL_PRIMARY`, `DUMP_CONTROL_PRIMARY_SIDE`, `DUMP_CONTROL_SECONDARY`, `DUMP_CONTROL_SECONDARY_SIDE`, `DUMP_CONTROL_TOROID_SIDE`, `DUMP_COOLANT_DUCT_CASING`, `DUMP_DEFC_0`, `DUMP_DEFC_0__OVERLAY_TELEPORTER`, `DUMP_DEFC_1`, `DUMP_DEPLOYMENT_UNIT_CASING`, `DUMP_DEPLOYMENT_UNIT_CASING_SIDE`, `DUMP_DEPLOYMENT_UNIT_CORE`, `DUMP_DEPLOYMENT_UNIT_MAGNET_SIDE`, `DUMP_EM_CASING`, `DUMP_EM_COIL`, `DUMP_EM_COIL_NONSIDE`, `DUMP_EM_DIM_0`, `DUMP_EM_FIELD_0`, `DUMP_EM_PC`, `DUMP_EM_PC_ADV`, `DUMP_EM_PC_ADV_NONSIDE`, `DUMP_EM_PC_NONSIDE`, `DUMP_EM_PC_VENT`, `DUMP_EM_PC_VENT_NONSIDE`, `DUMP_EM_PC__EM_COMPUTER`, `DUMP_EM_PC__EM_CONTROLLER`, `DUMP_EM_POWER__EM_CONTROLLER`, `DUMP_EM_POWER__OVERLAY_FRONT_ADVANCED_MULTIBLOCK_ANIMATED`, `DUMP_FIELD_RESTRICTING_GLASS`, `DUMP_FLOOR_SIDE`, `DUMP_FRAME_GT`, `DUMP_FRAME_GT_00D10B`, `DUMP_FRAME_GT_0A0A0A`, `DUMP_FRAME_GT_1264FF`, `DUMP_FRAME_GT_1E1E1E`, `DUMP_FRAME_GT_1EB1FF`, `DUMP_FRAME_GT_2681BD`, `DUMP_FRAME_GT_282828`, `DUMP_FRAME_GT_323232`, `DUMP_FRAME_GT_330066`, `DUMP_FRAME_GT_373737`, `DUMP_FRAME_GT_444B42`, `DUMP_FRAME_GT_600000`, `DUMP_FRAME_GT_646464`, `DUMP_FRAME_GT_6464A0`, `DUMP_FRAME_GT_6464FF`, `DUMP_FRAME_GT_660033`, `DUMP_FRAME_GT_6E6E6E`, `DUMP_FRAME_GT_76DC8A`, `DUMP_FRAME_GT_808080`, `DUMP_FRAME_GT_850080`, `DUMP_FRAME_GT_8B8878`, `DUMP_FRAME_GT_8C6464`, `DUMP_FRAME_GT_95E011`, `DUMP_FRAME_GT_C8C8C8`, `DUMP_FRAME_GT_C8C8DC`, `DUMP_FRAME_GT_C99781`, `DUMP_FRAME_GT_D3FFFF`, `DUMP_FRAME_GT_D7E6E6`, `DUMP_FRAME_GT_DCA0F0`, `DUMP_FRAME_GT_F0F078`, `DUMP_FRAME_GT_F0F0F5`, `DUMP_FRAME_GT_F44E00`, `DUMP_FRAME_GT_FAFAFA`, `DUMP_FRAME_GT_FF8000`, `DUMP_FRAME_GT_FFFF1E`, `DUMP_FUISON_1`, `DUMP_FUISON_2`, `DUMP_FUISON_3`, `DUMP_FUISON_4`, `DUMP_FUISON_5`, `DUMP_GDCCERAMIC_ELECTROLYTE_UNIT`, `DUMP_GLASS_TINTED_INDUSTRIAL_WHITE`, `DUMP_GODFORGE_ENERGY`, `DUMP_GODFORGE_INNER`, `DUMP_GODFORGE_SUPPORT`, `DUMP_GODFORGE_TRIM`, `DUMP_GODFORGE_TRIM__SCREEN_OFF`, `DUMP_GRAVITON_TOP_BOTTOM__GODFORGE_CONTROLLER`, `DUMP_GRAVITY_STABILIZATION_CASING__OVERLAY_FUSION1`, `DUMP_HEATING_DUCT_CASING`, `DUMP_INDUSTRIAL_STRENGTH_CONCRETE`, `DUMP_INFINITY_REINFORCED_BORON_SILICATE_GLASS_BLOCK`, `DUMP_INFINITY_REINFORCED_BORON_SILICATE_GLASS_BLOCK__OVERLAY_RAINBOWSCREEN`, `DUMP_IRIDIUM_REINFORCED_BORON_SILICATE_GLASS_BLOCK`, `DUMP_IRIDIUM_REINFORCED_BORON_SILICATE_GLASS_BLOCK__OVERLAY_FUSION2`, `DUMP_LAPOTRONIC_ENERGY_UNIT6_SIDE`, `DUMP_LAPOTRONIC_ENERGY_UNIT6_TOP`, `DUMP_LASER_PLATE`, `DUMP_LSCBASE_SIDE`, `DUMP_LSCBASE_SIDE__MACHINE_CASING_FUSION_GLASS`, `DUMP_LSCBASE_TOP`, `DUMP_MACHINE_BRONZEPLATEDBRICKS`, `DUMP_MACHINE_BRONZEPLATEDBRICKS__OVERLAY_FRONT_LARGE_BOILER`, `DUMP_MACHINE_BRONZEPLATEDBRICKS__OVERLAY_FRONT_STEAM_ALLOY_SMELTER_MULTI`, `DUMP_MACHINE_BRONZEPLATEDBRICKS__OVERLAY_FRONT_STEAM_CENTRIFUGE`, `DUMP_MACHINE_BRONZEPLATEDBRICKS__OVERLAY_FRONT_STEAM_COMPRESSOR`, `DUMP_MACHINE_BRONZEPLATEDBRICKS__OVERLAY_FRONT_STEAM_FORGE_HAMMER`, `DUMP_MACHINE_BRONZEPLATEDBRICKS__OVERLAY_FRONT_STEAM_WASHER`, `DUMP_MACHINE_BRONZEPLATEDBRICKS__OVERLAY_TOP_STEAM_MACERATOR`, `DUMP_MACHINE_CASING_ADVANCEDRADIATIONPROOF`, `DUMP_MACHINE_CASING_ADVANCED_CRYOGENIC`, `DUMP_MACHINE_CASING_ADVANCED_CRYOGENIC__INDUSTRIAL_VACUUM_FREEZER`, `DUMP_MACHINE_CASING_ADVANCED_VOLCANUS`, `DUMP_MACHINE_CASING_ADVANCED_VOLCANUS__ADVANCED_EBF`, `DUMP_MACHINE_CASING_AUTOCLAVE__INDUSTRIAL_EXTRUDER`, `DUMP_MACHINE_CASING_AUTOCLAVE__OVERLAY_FRONT_MULTI_AUTOCLAVE`, `DUMP_MACHINE_CASING_CENTRIFUGE`, `DUMP_MACHINE_CASING_CENTRIFUGE__LARGETURBINE_NEW5`, `DUMP_MACHINE_CASING_CHEMICALLY_INERT`, `DUMP_MACHINE_CASING_CHEMICALLY_INERT__OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR`, `DUMP_MACHINE_CASING_CLEAN_STAINLESSSTEEL`, `DUMP_MACHINE_CASING_DENSEBRICKS`, `DUMP_MACHINE_CASING_EMS__OVERLAY_FRONT_EMS`, `DUMP_MACHINE_CASING_ENGINE_INTAKE`, `DUMP_MACHINE_CASING_EXTREME_CORROSION_RESISTANT`, `DUMP_MACHINE_CASING_EXTREME_ENGINE_INTAKE`, `DUMP_MACHINE_CASING_FIREBOX_BRONZE`, `DUMP_MACHINE_CASING_FIREBOX_STABALLOY`, `DUMP_MACHINE_CASING_FIREBOX_STEEL`, `DUMP_MACHINE_CASING_FIREBOX_TITANIUM`, `DUMP_MACHINE_CASING_FIREBOX_TUNGSTENSTEEL`, `DUMP_MACHINE_CASING_FLOCCULATION__OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR`, `DUMP_MACHINE_CASING_FLOTATION`, `DUMP_MACHINE_CASING_FLUID_INCOLOY_DS`, `DUMP_MACHINE_CASING_FROST_PROOF`, `DUMP_MACHINE_CASING_FROST_PROOF__OVERLAY_FRONT_VACUUM_FREEZER`, `DUMP_MACHINE_CASING_FUSION`, `DUMP_MACHINE_CASING_FUSION_2`, `DUMP_MACHINE_CASING_FUSION_3`, `DUMP_MACHINE_CASING_FUSION_4`, `DUMP_MACHINE_CASING_FUSION_COIL_II`, `DUMP_MACHINE_CASING_FUSION_COIL_III`, `DUMP_MACHINE_CASING_FUSION__OVERLAY_FUSION2`, `DUMP_MACHINE_CASING_GEARBOX_STEEL`, `DUMP_MACHINE_CASING_GEARBOX_T1`, `DUMP_MACHINE_CASING_GEARBOX_TITANIUM`, `DUMP_MACHINE_CASING_GEARBOX_TUNGSTENSTEEL`, `DUMP_MACHINE_CASING_GRATE`, `DUMP_MACHINE_CASING_GRATE__OVERLAY_FRONT_OIL_CRACKER`, `DUMP_MACHINE_CASING_GRINDING_FACTORY`, `DUMP_MACHINE_CASING_INDUSTRIAL_WATER_PLANT`, `DUMP_MACHINE_CASING_INDUSTRIAL_WATER_PLANT__OVERLAY_FRONT_PURIFICATION_PLANT`, `DUMP_MACHINE_CASING_IRIDIUM`, `DUMP_MACHINE_CASING_IRIDIUM__OVERLAY_FRONT_COMPONENT_ASSEMBLY_LINE`, `DUMP_MACHINE_CASING_ITEM_PIPE_BLACK_PLUTONIUM`, `DUMP_MACHINE_CASING_ITEM_PIPE_BRASS`, `DUMP_MACHINE_CASING_ITEM_PIPE_TIN`, `DUMP_MACHINE_CASING_LASER`, `DUMP_MACHINE_CASING_LASER__OVERLAY_FRONT_ENGRAVER`, `DUMP_MACHINE_CASING_MINING_BLACKPLUTONIUM`, `DUMP_MACHINE_CASING_MINING_BLACKPLUTONIUM__OVERLAY_FRONT_ORE_DRILL`, `DUMP_MACHINE_CASING_MINING_NEUTRONIUM`, `DUMP_MACHINE_CASING_MINING_NEUTRONIUM__OVERLAY_FRONT_ORE_DRILL`, `DUMP_MACHINE_CASING_MINING_OSMIRIDIUM`, `DUMP_MACHINE_CASING_MINING_OSMIRIDIUM__OVERLAY_FRONT_ORE_DRILL`, `DUMP_MACHINE_CASING_MOTOR`, `DUMP_MACHINE_CASING_NAQUADAH_REINFORCED_WATER_PLANT__OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR`, `DUMP_MACHINE_CASING_OZONE__OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR`, `DUMP_MACHINE_CASING_PCB_TIER_1`, `DUMP_MACHINE_CASING_PCB_TIER_1__OVERLAY_FRONT_ASSEMBLY_LINE`, `DUMP_MACHINE_CASING_PCB_TIER_2`, `DUMP_MACHINE_CASING_PCB_TIER_2__OVERLAY_FRONT_PURIFICATION_PLANT`, `DUMP_MACHINE_CASING_PIPE_BRONZE`, `DUMP_MACHINE_CASING_PIPE_POLYBENZIMIDAZOLE`, `DUMP_MACHINE_CASING_PIPE_POLYTETRAFLUOROETHYLENE`, `DUMP_MACHINE_CASING_PIPE_STEEL`, `DUMP_MACHINE_CASING_PIPE_T1`, `DUMP_MACHINE_CASING_PIPE_T1__GRINDER5`, `DUMP_MACHINE_CASING_PIPE_TITANIUM`, `DUMP_MACHINE_CASING_PIPE_TUNGSTENSTEEL`, `DUMP_MACHINE_CASING_PLASMA_HEATER__OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR`, `DUMP_MACHINE_CASING_PROCESSOR`, `DUMP_MACHINE_CASING_PUMP`, `DUMP_MACHINE_CASING_RADIANT_NAQUADAH_ALLOY`, `DUMP_MACHINE_CASING_RADIANT_NAQUADAH_ALLOY__OVERLAY_FRONT_ASSEMBLY_LINE`, `DUMP_MACHINE_CASING_RADIATIONPROOF`, `DUMP_MACHINE_CASING_RADIATIONPROOF__ADV_MACHINE_MATTERFAB_ANIMATED`, `DUMP_MACHINE_CASING_RADIATIONPROOF__OVERLAY_FRONT_HEAT_EXCHANGER`, `DUMP_MACHINE_CASING_ROBUST_TUNGSTENSTEEL`, `DUMP_MACHINE_CASING_ROBUST_TUNGSTENSTEEL__OVERLAY_FRONT_OIL_CRACKER`, `DUMP_MACHINE_CASING_ROBUST_TUNGSTENSTEEL__OVERLAY_ME_HATCH`, `DUMP_MACHINE_CASING_ROCKETDYNE`, `DUMP_MACHINE_CASING_ROCKETDYNE__LARGE_ROCKET_ENGINE`, `DUMP_MACHINE_CASING_SOLID_STEEL`, `DUMP_MACHINE_CASING_SOLID_STEEL__DRONE_CENTRE_INACTIVE`, `DUMP_MACHINE_CASING_SOLID_STEEL__OVERLAY_FRONT_IMPLOSION_COMPRESSOR`, `DUMP_MACHINE_CASING_STABLE_GRISIUM`, `DUMP_MACHINE_CASING_STABLE_GRISIUM__INDUSTRIAL_WASH_PLANT`, `DUMP_MACHINE_CASING_STABLE_HASTELLOY_N`, `DUMP_MACHINE_CASING_STABLE_HASTELLOY_N__OVERLAY_FRONT_MULTI_SMELTER`, `DUMP_MACHINE_CASING_STABLE_HASTELLOY_X`, `DUMP_MACHINE_CASING_STABLE_MARAGINGSTEEL`, `DUMP_MACHINE_CASING_STABLE_MARAGINGSTEEL__INDUSTRIAL_WIREMILL`, `DUMP_MACHINE_CASING_STABLE_POTIN`, `DUMP_MACHINE_CASING_STABLE_POTIN__INDUSTRIAL_ELECTROLYZER`, `DUMP_MACHINE_CASING_STABLE_RED_STEEL`, `DUMP_MACHINE_CASING_STABLE_RED_STEEL__INDUSTRIAL_ROCK_BREAKER`, `DUMP_MACHINE_CASING_STABLE_RED_STEEL__INDUSTRIAL_THERMAL_CENTRIFUGE`, `DUMP_MACHINE_CASING_STABLE_STELLITE`, `DUMP_MACHINE_CASING_STABLE_STELLITE__OVERLAY_FRONT_NUCLEAR_REACTOR`, `DUMP_MACHINE_CASING_STABLE_TALONITE`, `DUMP_MACHINE_CASING_STABLE_TALONITE__ADVANCED_HEAT_EXCHANGER`, `DUMP_MACHINE_CASING_STABLE_TANTALLOY61`, `DUMP_MACHINE_CASING_STABLE_TANTALLOY61__COKE_OVEN`, `DUMP_MACHINE_CASING_STABLE_TITANIUM`, `DUMP_MACHINE_CASING_STABLE_TITANIUM__ADV_MACHINE_MATTERFAB`, `DUMP_MACHINE_CASING_STABLE_TITANIUM__INDUSTRIAL_PLATE_PRESS`, `DUMP_MACHINE_CASING_STABLE_TITANIUM__OVERLAY_FRONT_HEAT_EXCHANGER`, `DUMP_MACHINE_CASING_STABLE_ZERON100`, `DUMP_MACHINE_CASING_STABLE_ZIRCONIUM_CARBIDE`, `DUMP_MACHINE_CASING_STABLE_ZIRCONIUM_CARBIDE__MEGA_ALLOY_BLAST_SMELTER`, `DUMP_MACHINE_CASING_TANK_10`, `DUMP_MACHINE_CASING_THAUMIUM`, `DUMP_MACHINE_CASING_THAUMIUM__OVERLAY_FRONT_ADVANCED_MULTIBLOCK_ANIMATED`, `DUMP_MACHINE_CASING_TURBINE_STAINLESSSTEEL`, `DUMP_MACHINE_CASING_TURBINE_STEEL`, `DUMP_MACHINE_CASING_TURBINE_STEEL__OVERLAY_FRONT_DIESEL_ENGINE`, `DUMP_MACHINE_CASING_TURBINE_TITANIUM`, `DUMP_MACHINE_CASING_TURBINE_TUNGSTENSTEEL`, `DUMP_MACHINE_CASING_VENT`, `DUMP_MACHINE_CASING_VENT_T2`, `DUMP_MACHINE_COIL_AWAKENEDDRACONIUM_BACKGROUND`, `DUMP_MACHINE_COIL_CUPRONICKEL_BACKGROUND`, `DUMP_MACHINE_COIL_HYPOGEN_BACKGROUND`, `DUMP_MACHINE_COIL_NAQUADAH_BACKGROUND`, `DUMP_MACHINE_COIL_SUPERCONDUCTOR`, `DUMP_MACHINE_DIM_BRIDGE`, `DUMP_MACHINE_DIM_INJECTOR__OVERLAY_DTPF_OFF`, `DUMP_MACHINE_HEATPROOFCASING`, `DUMP_MACHINE_HEATPROOFCASING__OVERLAY_FRONT_ELECTRIC_BLAST_FURNACE`, `DUMP_MACHINE_HV_SIDE_D2DCFF`, `DUMP_MACHINE_IV_SIDE`, `DUMP_MACHINE_LU_V_SIDE`, `DUMP_MACHINE_LU_V_SIDE__OVERLAY_FUSION1`, `DUMP_MACHINE_LV_SIDE`, `DUMP_MACHINE_MV_SIDE`, `DUMP_MACHINE_MV_SIDE__OVERLAY_FRONT_ELECTRIC_BLAST_FURNACE`, `DUMP_MACHINE_TOP`, `DUMP_MACHINE_TOP__OVERLAY_FRONT_DISASSEMBLER`, `DUMP_MACHINE_TOP__QUANTUM_FORCE_TRANSFORMER`, `DUMP_MACHINE_UEV_BOTTOM`, `DUMP_MACHINE_ULV_SIDE`, `DUMP_MACHINE_ULV_SIDE__OVERLAY_FRONT_PYROLYSE_OVEN`, `DUMP_MAGNETIC_FLUX_CASING`, `DUMP_MAR_CASING`, `DUMP_MASS_SOLIDIFIER_CASING__OVERLAY_FRONT_MULTI_CANNER`, `DUMP_MV_SIDE_CYCLOTRON_SOLENOID`, `DUMP_MV_TOP_CYCLOTRON_SOLENOID`, `DUMP_NAQUADRIA_REINFORCED_WATER_PLANT_CASING__OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR`, `DUMP_NEUTRONIUM_ACTIVE_CASING`, `DUMP_NEUTRONIUM_CASING`, `DUMP_NEUTRONIUM_CASING__OVERLAY_MULTI_NEUTRONIUM`, `DUMP_NEUTRONIUM_REINFORCED_BORON_SILICATE_GLASS_BLOCK`, `DUMP_NEUTRONIUM_REINFORCED_BORON_SILICATE_GLASS_BLOCK__ADV_MACHINE_SCREEN_RANDOM3`, `DUMP_NICKEL_FERRITE_BLOCKS`, `DUMP_OSMIUM_REINFORCED_BORON_SILICATE_GLASS_BLOCK`, `DUMP_OSMIUM_REINFORCED_BORON_SILICATE_GLASS_BLOCK__OVERLAY_FUSION3`, `DUMP_PRECISE_UNIT_CASING_0`, `DUMP_PRECISE_UNIT_CASING_0__OVERLAY_QCHEST`, `DUMP_PRESSURE_RESISTANT_WALLS`, `DUMP_RADIATION_ABSORBENT_CASING__OVERLAY_MULTI_BLACKHOLE`, `DUMP_RADIATION_PROTECTION_STEEL_FRAME`, `DUMP_RECEIVER_CASING`, `DUMP_RECEIVER_CASING_SIDE`, `DUMP_RECEIVER_CASING_SIDE__OVERLAY_FRONT_DYSONSPHERE`, `DUMP_RECEIVER_DISH_SIDE`, `DUMP_SC_TURBINE__OVERLAY_FRONT_ADVANCED_MULTIBLOCK_ANIMATED`, `DUMP_STERILE_CASING`, `DUMP_STERILE_CASING__OVERLAY_FRONT_DISTILLATION_TOWER`, `DUMP_STERILE_CASING__TREE_FARM`, `DUMP_SUPERCRITICAL_FLUID_TURBINE_CASING`, `DUMP_TFFTCASING`, `DUMP_TFFTCASING__TFFT`, `DUMP_TFFTSTORAGE_FIELD_BLOCK1`, `DUMP_TITANIUM_REINFORCED_BORON_SILICATE_GLASS_BLOCK`, `DUMP_TM_TESLA_BASE_SIDES`, `DUMP_TM_TESLA_BASE_SIDES__TM_TESLA_TOWER`, `DUMP_TM_TESLA_BASE_TOP_BOTTOM`, `DUMP_TM_TESLA_WINDING_PRIMARY_SIDES_0`, `DUMP_TM_TESLA_WINDING_PRIMARY_TOP_BOTTOM_0`, `DUMP_TM_TESLA_WINDING_SECONDARY_SIDES`, `DUMP_TM_TESLA_WINDING_SECONDARY_TOP_BOTTOM`, `DUMP_TRANSCENDENTALLY_REINFORCED_BORON_SILICATE_GLASS_BLOCK`, `DUMP_TRANSFORMER_COIL`, `DUMP_UEV_SIDE_CYCLOTRON_SOLENOID`, `DUMP_UEV_TOP_CYCLOTRON_SOLENOID`, `DUMP_UHV_SIDE_CYCLOTRON_SOLENOID`, `DUMP_UHV_TOP_CYCLOTRON_SOLENOID`, `DUMP_WATER_PLANT_CONCRETE_CASING`, `DUMP_WATER_PLANT_CONCRETE_CASING__OVERLAY_FRONT_DISTILLATION_TOWER`, `DUMP_YOTTA_FLUID_TANK_CASING_SIDE`, `DUMP_YOTTA_FLUID_TANK_CASING_SIDE__OVERLAY_QCHEST`, `DUMP_YOTTA_FLUID_TANK_CELL_1`, `DUMP_YSZCERAMIC_ELECTROLYTE_UNIT`, `EM_CONTROLLER`, `FLUID_IN_SIGN`, `FLUID_OUT_SIGN`, `FRAME_BLACKSTEEL`, `FRAME_BRONZE`, `FRAME_EGLINSTEEL`, `FRAME_IRON`, `FRAME_NEUTRONIUM`, `FRAME_POLYBENZIMIDAZOLE`, `FRAME_POLYTETRAFLUOROETHYLENE`, `FRAME_STAINLESSSTEEL`, `FRAME_STEEL`, `FRAME_TITANIUM`, `FRAME_TUNGSTENSTEEL`, `GOODGENERATOR_1`, `GOODGENERATOR_MAGICCASING`, `GTNHINTERGALACTIC_BASECASING`, `GTNHINTERGALACTIC_CABLEPART`, `GTNHINTERGALACTIC_INTERNALSTRUCTURE`, `HV_SIDE_CYCLOTRON_SOLENOID`, `HV_TOP_CYCLOTRON_SOLENOID`, `ITEM_IN_SIGN`, `ITEM_OUT_SIGN`, `MACHINE_BRONZEPLATEDBRICKS`, `MACHINE_CASING_ASSEMBLER`, `MACHINE_CASING_BRICKEDBLASTFURNACE_INACTIVE`, `MACHINE_CASING_CENTRIFUGE`, `MACHINE_CASING_CHEMICALLY_INERT`, `MACHINE_CASING_CLEAN_STAINLESSSTEEL`, `MACHINE_CASING_DENSEBRICKS`, `MACHINE_CASING_ENGINE_INTAKE`, `MACHINE_CASING_EXTREME_ENGINE_INTAKE`, `MACHINE_CASING_FIREBOX_BRONZE`, `MACHINE_CASING_FIREBOX_STEEL`, `MACHINE_CASING_FIREBOX_TITANIUM`, `MACHINE_CASING_FIREBOX_TUNGSTENSTEEL`, `MACHINE_CASING_FROST_PROOF`, `MACHINE_CASING_GEARBOX_BRONZE`, `MACHINE_CASING_GEARBOX_STEEL`, `MACHINE_CASING_GEARBOX_TITANIUM`, `MACHINE_CASING_GEARBOX_TUNGSTENSTEEL`, `MACHINE_CASING_GRATE`, `MACHINE_CASING_ITEM_PIPE_TIN`, `MACHINE_CASING_MAGICAL`, `MACHINE_CASING_PIPE_BRONZE`, `MACHINE_CASING_PIPE_POLYBENZIMIDAZOLE`, `MACHINE_CASING_PIPE_POLYTETRAFLUOROETHYLENE`, `MACHINE_CASING_PIPE_STEEL`, `MACHINE_CASING_PIPE_TITANIUM`, `MACHINE_CASING_PIPE_TUNGSTENSTEEL`, `MACHINE_CASING_ROBUST_TUNGSTENSTEEL`, `MACHINE_CASING_SOLID_STEEL`, `MACHINE_CASING_STABLE_TITANIUM`, `MACHINE_CASING_STRIPES_A`, `MACHINE_CASING_TURBINE_STAINLESSSTEEL`, `MACHINE_CASING_TURBINE_STEEL`, `MACHINE_CASING_TURBINE_TITANIUM`, `MACHINE_CASING_TURBINE_TUNGSTENSTEEL`, `MACHINE_COIL_CUPRONICKEL`, `MACHINE_COIL_ELECTRUMFLUX`, `MACHINE_COIL_ETERNAL`, `MACHINE_COIL_HSSG`, `MACHINE_COIL_HSSS`, `MACHINE_COIL_INFINITY`, `MACHINE_COIL_KANTHAL`, `MACHINE_COIL_NAQUADAH`, `MACHINE_COIL_NAQUADAHALLOY`, `MACHINE_COIL_NICHROME`, `MACHINE_COIL_TRINIUM`, `MACHINE_COIL_TUNGSTENSTEEL`, `MACHINE_EV_BOTTOM`, `MACHINE_EV_SIDE`, `MACHINE_EV_TOP`, `MACHINE_HEATPROOFCASING`, `MACHINE_HV_BOTTOM`, `MACHINE_HV_SIDE`, `MACHINE_HV_TOP`, `MACHINE_LV_BOTTOM`, `MACHINE_LV_SIDE`, `MACHINE_LV_TOP`, `MACHINE_MV_BOTTOM`, `MACHINE_MV_SIDE`, `MACHINE_MV_TOP`, `MACHINE_ULV_BOTTOM`, `MACHINE_ULV_SIDE`, `MACHINE_ULV_TOP`, `OVERLAY_ENERGY_IN_LV`, `OVERLAY_ENERGY_OUT`, `OVERLAY_ENERGY_OUT_LV`, `OVERLAY_FRONT_DISTILLATION_TOWER`, `OVERLAY_FRONT_ELECTRIC_BLAST_FURNACE`, `OVERLAY_FRONT_IMPLOSION_COMPRESSOR`, `OVERLAY_FRONT_LARGE_BOILER`, `OVERLAY_FRONT_LARGE_CHEMICAL_REACTOR`, `OVERLAY_FRONT_MULTI_SMELTER`, `OVERLAY_FRONT_OIL_CRACKER`, `OVERLAY_FRONT_PYROLYSE_OVEN`, `OVERLAY_FRONT_RESEARCH_COMPLETER`, `OVERLAY_FRONT_VACUUM_FREEZER`, `OVERLAY_MAINTENANCE`, `OVERLAY_MUFFLER`, `OVERLAY_PIPE_IN`, `OVERLAY_PIPE_OUT`, `OVERLAY_SCHEST`, `OVERLAY_STANK`, `SC_TURBINE_CASING`, `SINGLE_ALLOY_SMELTER`, `SINGLE_AMPLIFABRICATOR`, `SINGLE_ARC_FURNACE`, `SINGLE_ASSEMBLER`, `SINGLE_AUTOCLAVE`, `SINGLE_BENDER`, `SINGLE_BREWERY`, `SINGLE_CANNER`, `SINGLE_CENTRIFUGE`, `SINGLE_CHEMICAL_BATH`, `SINGLE_CHEMICAL_REACTOR`, `SINGLE_CIRCUIT_ASSEMBLER`, `SINGLE_COMPRESSOR`, `SINGLE_CUTTING_MACHINE`, `SINGLE_DISTILLERY`, `SINGLE_ELECTRIC_FURNACE`, `SINGLE_ELECTROLYZER`, `SINGLE_ELECTROMAGNETIC_POLARIZER`, `SINGLE_ELECTROMAGNETIC_SEPARATOR`, `SINGLE_EXTRACTOR`, `SINGLE_EXTRUDER`, `SINGLE_FERMENTER`, `SINGLE_FLUID_CANNER`, `SINGLE_FLUID_EXTRACTOR`, `SINGLE_FLUID_HEATER`, `SINGLE_FLUID_SOLIDIFIER`, `SINGLE_FORGE_HAMMER`, `SINGLE_FORMING_PRESS`, `SINGLE_LASER_ENGRAVER`, `SINGLE_LATHE`, `SINGLE_MACERATOR`, `SINGLE_MASS_FABRICATOR`, `SINGLE_MICROWAVE`, `SINGLE_MIXER`, `SINGLE_ORE_WASHER`, `SINGLE_PACKAGER`, `SINGLE_PLASMA_ARC_FURNACE`, `SINGLE_PRINTER`, `SINGLE_PUMP`, `SINGLE_RECYCLER`, `SINGLE_REPLICATOR`, `SINGLE_ROCK_BREAKER`, `SINGLE_SCANNER`, `SINGLE_SIFTER`, `SINGLE_THERMAL_CENTRIFUGE`, `SINGLE_UNPACKAGER`, `SINGLE_WIREMILL`

## Railcraft textures

The Railcraft boiler and tank tiles are the PNGs of the [Railcraft](http://railcraft.info/) mod (version 9.17.31, the version in GT:NH 2.9.0-beta-3), copied from `src/main/resources/assets/railcraft/textures/blocks/`: `src/main/resources/assets/railcraft/textures/blocks/boiler.firebox.solid.png`, `src/main/resources/assets/railcraft/textures/blocks/boiler.firebox.liquid.png`, `src/main/resources/assets/railcraft/textures/blocks/boiler.tank.pressure.high.png`, `src/main/resources/assets/railcraft/textures/blocks/boiler.tank.pressure.low.png`, `src/main/resources/assets/railcraft/textures/blocks/tank.iron.wall.png`, `src/main/resources/assets/railcraft/textures/blocks/tank.iron.gauge.png`, `src/main/resources/assets/railcraft/textures/blocks/tank.iron.valve.png`, `src/main/resources/assets/railcraft/textures/blocks/tank.steel.wall.png`, `src/main/resources/assets/railcraft/textures/blocks/tank.steel.gauge.png`, `src/main/resources/assets/railcraft/textures/blocks/tank.steel.valve.png`. Each is cropped to its first frame where the source is an animation strip. Railcraft is by CovertJaguar and is licensed under its own terms (see the [Railcraft license](https://github.com/GTNewHorizons/Railcraft/blob/9.17.31/LICENSE.md)); these images are used with credit and a link, and are not covered by this repository's MIT licence.
