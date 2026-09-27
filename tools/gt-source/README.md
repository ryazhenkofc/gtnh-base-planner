# GT source converter

`generate.mjs` turns the StructureLib definitions in the
[GT5-Unofficial](https://github.com/GTNewHorizons/GT5-Unofficial) Java sources into catalog entries. It covers
the multiblocks nobody has transcribed by hand. Hand-made entries always win: if an entry in
`src/data/multiblocks/` links to a controller class in its `source` and has no `"generated": true`, that class
is never generated.

The catalog follows GT5-Unofficial **5.09.54.133** (GT:NH 2.9.0-beta-3).

## Running it

A sparse, blob-less clone is enough. Only the Java sources and the lang files are checked out. Texture files are
fetched on demand, and only the ones the catalog uses.

```sh
git clone --filter=blob:none --no-checkout --depth 1 --branch 5.09.54.133 \
  https://github.com/GTNewHorizons/GT5-Unofficial.git ../gt5u
git -C ../gt5u sparse-checkout set --no-cone '/src/main/java/' '/src/main/resources/assets/*/lang/en_US.lang'
git -C ../gt5u checkout

node tools/gt-source/generate.mjs ../gt5u             # dry run: counts and skip reasons
node tools/gt-source/generate.mjs ../gt5u --verbose   # ... and every skipped class
node tools/gt-source/generate.mjs ../gt5u --write     # write the files below
node scripts/build-atlas.mjs                          # repack the texture atlas
node tools/gt-source/machine-types.mjs ../gt5u        # GT machine type names, for the GTNH Planner import
npm run check && npm test
```

The run is deterministic: running `--write` twice gives the same files.

`--write` replaces everything it wrote before:

| File                                      | Contents                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/data/multiblocks/<id>.json`          | One `MultiblockDef` per machine, marked `"generated": true`                                                     |
| `src/data/gt-shapes.generated.json`       | The raw GT shape and elements per machine, checked by `src/data/gt-structures.test.ts`                          |
| `src/data/blocks.generated.json`          | Blocks the hand-made registry (`src/data/blocks.ts`) lacks, with a flat colour (the mean colour of the texture) |
| `tools/gt-source/textures.generated.json` | Atlas tiles and block faces, merged into `scripts/build-atlas.mjs`                                              |
| `tools/texture-sources/*.png`             | Source files of those tiles, copied from the clone                                                              |
| `ATTRIBUTION.md`                          | The list of those files, between the `tools/gt-source` markers                                                  |

## How it works

- **Candidates.** Every class that calls `addShape(`, plus the concrete subclasses of such a class (Ore Drilling
  Plant I–IV, the Fusion Reactors, Air Filters, ...). `*Legacy` classes and abstract classes are skipped.
- **Pieces.** `construct()` is evaluated in a sandbox (`construct.mjs`) with a stack size of 1 and fresh
  controller fields (instance field defaults such as `revision = 1` apply). It records every `buildPiece` call with
  its offsets, so multi-piece machines are merged and loops build their smallest size.
- **Elements** (`elements.mjs`). Each `addElement` expression becomes a block, the hatch kinds that may replace
  it, a hatch-only cell, air or "any". Supported forms include `ofBlock`, `Casings.X.asElement()`,
  `ofFrame`, glass and coil helpers, `ofChain`, `buildHatchAdder` / `HatchElementBuilder` (`atLeast`, `anyOf`,
  `adder`, `buildAndChain`), `ofHatchAdder`, `buildSteamInput`, `classicHatches`, `lazy(...)`, getters that
  return blocks, metas or `ItemList` entries, and element factories such as `glassElement()`.
- **Blocks** (`registry.mjs`). A block field and meta resolve to a name (lang file or `addStringLocalization`)
  and the textures from the block class's `getIcon`. That can be a `Textures.BlockIcons` or GT++
  `TexturesGtBlock` icon, an icon array such as `MACHINECASINGS_SIDE[meta]`, an icon the class registers with
  `registerIcon`, or a texture named in the block's constructor. `side < 2 ? TOP : SIDE` (or an `if` on the side)
  gives the block its own top and bottom. A texture that a hand-made block already uses maps to that block. Frames
  are the `frameGt` icon tinted with the material colour. Tier lists (`ofBlocksTiered`) show their first entry,
  whether written inline, as `Casings.X` pairs, as an `IntStream.range` or in a field or method of the machine.
- **Controllers.** Each machine gets its own controller block (`gt5u.controller.<id>`): the faces of the casing
  its hatches go on, with the idle front overlay drawn by its `getTexture` (or GT++'s `getInactiveOverlay`),
  as the controller looks in game.

## Approximations

Generated entries are copied cell by cell from the source, but they are not checked in game:

- **Hatch counts.** Energy (or dynamo), maintenance and muffler are required once each when the structure allows
  them. The real minimums (for example, two energy hatches) are in the machine's tooltip.
- **Choices.** Where the structure accepts one of several blocks, the first one is shown: the lowest tier of a
  tiered casing, Reinforced Glass for any glass, Cupronickel for any coil. Machine-specific
  hatches (data, lenses, beamline, ...) show as `gt5u.specialHatch`. Elements that pick a tier at run time
  (LSC capacitor cells, TFFT storage fields, Space Elevator motors) show as `gt5u.tieredCasing`.
- **Sealed hatches.** A hatch kind whose every cell has no open face (only faces into the structure, its air or
  the ground) stays in the legend but is left out of the defaults and requirements. The entry's `notes` says so.
- **Controller.** The controller faces north (the shape's front) unless structure stands right in front of it.
  In that case it faces the first open side.

## Skipped (5.09.54.133)

Besides legacy and abstract classes, these are left out, usually because their shape is built at run time:

- **Computed shapes:** Antimatter Forge, Antimatter Generator, Large Hadron Collider, Nanochip Assembly Complex,
  Water Purification Plant, Space Elevator modules (Manager, Research), Extreme Industrial Greenhouse,
  Mega Industrial Apiary, Forge of the Gods.
- **Elements it cannot read:** Windmill (dispenser or clay), YOTTank (cells by tier), Forge of the Gods modules.
- **`construct()` it cannot run:** Manual Transformer, Exo-Foundry, Large Rocket Engine, Solar Tower.
- **Other:** the Biological Coordination module (its shape has no controller), `StructureWrapper`.

Add a skipped machine by hand (see "Adding a multiblock" in the main README), or teach `elements.mjs` /
`construct.mjs` the missing form and rerun.
