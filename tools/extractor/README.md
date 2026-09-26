# Structure extractor → planner converter

Tooling to import GTNH multiblock structures automatically instead of transcribing them by hand.

It has two stages:

1. **Dump** (Java, upstream, run by a human): the `gtnh-extractor` Forge mod from
   [MrBruh/gtnh-process-line-solver](https://github.com/MrBruh/gtnh-process-line-solver)
   (`tools/gtnh-extractor/`, Apache-2.0) boots a headless GTNH dev server, builds every GregTech
   `IConstructable` controller with the same `construct(...)` code the in-game hologram projector
   runs, scans the placed blocks, and writes one JSON file per controller.
2. **Convert** (Node, this directory): `convert.mjs` turns those files into our `MultiblockDef`
   JSON (`src/model/types.ts`) in a review directory. A human then promotes the good ones into
   `src/data/multiblocks/`.

Nothing generated is committed here: the full dump needs the GTNH mod jars, which are not in this
repository. `fixtures/` holds the two illustrative dump files that ship with the upstream repo
(see `fixtures/NOTICE`).

## Dump format (schema v2)

One `<registry>_<meta>.json` per controller (e.g. `gregtech_gt_blockmachines_1000.json`) plus a
`_meta.json` run summary (`pack_version`, `mod_versions`, `generated_at`, `failures`, ...).

```jsonc
{
  "schema": 2,
  "controller": {
    "registry_name": "gregtech:gt.blockmachines", // controller block
    "meta": 1000,                                 // GT meta tile entity id
    "display_name": "Electric Blast Furnace",
    "source_class": "gregtech.common.tileentities.machines.multi.MTEElectricBlastFurnace",
    "facing_convention": "controller front = NORTH (-Z) ... offsets d = [dx,dy,dz] world-space deltas from the controller block"
  },
  "variants": [                                    // one per distinct shape over trigger stack 1..16
    {
      "trigger_stack_size": 1,
      "channels": { "gt_no_hatch": 1 },
      "blocks": [{ "d": [0, 0, 0], "block": "gregtech:gt.blockmachines", "meta": 1000 }, ...], // every non-air cell
      "hints": [{ "d": [-1, 0, 1], "hint": 1 }],                    // hologram hint dots (hint = dot number)
      "hatch_slots": [{ "d": [-1, 0, 1], "kinds": ["Energy", "InputBus", ...] }], // GT HatchElement names
      "bbox": [3, 4, 3]
    }
  ],
  "substitutions": { "coil": [{ "channel_value": 0, "block": "gregtech:gt.blockcasings5", "meta": 0 }, ...] },
  "failures": ["variant family truncated: ..."]   // caveats about this controller
}
```

- The extractor places every controller facing **north (-Z)**, which is our local frame, so the
  converter only translates offsets to the bounding-box min corner.
- Only non-air blocks are recorded. The dump cannot tell "must be air" from "any block".
- Hatch cells come from `hatch_slots` (the structure element's hatch adder was probed with one
  hatch of each GT `HatchElement` kind); the casing that was placed there is the fallback block.
- The upstream fixtures are hand-made placeholders: block metas and hatch kinds are illustrative,
  and their offsets start at the min corner instead of at the controller. A real dump puts the
  controller at `d = [0, 0, 0]` and has negative offsets; the converter handles both.

## What the converter does

`convert.ts` (pure, tested by `convert.test.ts`) exports `parseDump`, `convertDump`,
`validateDef` and `formatJson`. `convertDump(doc, options) -> { def, warnings }`:

| Dump                                               | `MultiblockDef`                                                                                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| block matching `controller.registry_name` + `meta` | `~`, `controller.pos`, `facing: "north"`, `blockId` from the block map (exact `<registry>:<meta>` entry, else `gt.controller`)                                                                        |
| `blocks[]` `(block, meta)`                         | legend `blockId` via `block-map.json` (`"<registry>:<meta>"` or `"<registry>:*"`); unknown (including non-controller `gt.blockmachines` tiles such as pipes) → `ext.<registry>.<meta>` + warning      |
| `hatch_slots[].kinds`                              | legend `hatches`: InputBus→itemIn, OutputBus→itemOut, InputHatch→fluidIn, OutputHatch→fluidOut, (Exotic/MultiAmp)Energy→energy, (Exotic)Dynamo→dynamo, Maintenance, Muffler. Others dropped + warning |
| hatch slot with no block                           | the hatch block of its first kind                                                                                                                                                                     |
| empty cell inside the box                          | `-` if enclosed by the structure (flood fill from outside), otherwise ` `                                                                                                                             |
| kinds present                                      | `hatchBlocks` (`gt.hatch.*`), `defaultHatches`                                                                                                                                                        |
| —                                                  | `shareableHatches` = `--shareable` (default none), no `requiredHatches`, no `tier`                                                                                                                    |
| bounding-box faces                                 | `wallshare: true` if on some axis both opposite faces are solid casing and identical block for block                                                                                                  |
| `source_class`                                     | `source` GitHub link into GT5-Unofficial (gregtech, gtPlusPlus, bartworks, tectech, ...)                                                                                                              |
| `substitutions`, `failures`, variant, pack version | `notes` / warnings                                                                                                                                                                                    |

Variant choice: `first` (trigger stack 1, the smallest complete form; default), `last`,
`largest` (most blocks), a trigger stack number, or `all` in the CLI (one file per form, id suffix
`-t<stack>`).

## Running the converter

Needs Node ≥ 22.18 (built-in TypeScript type stripping; no build step).

```sh
node tools/extractor/convert.mjs --in tools/extractor/fixtures              # -> tools/extractor/out/
node tools/extractor/convert.mjs --in <datasetOut>/multiblocks --out /tmp/mb --variant all
node tools/extractor/convert.mjs --help
```

Flags: `--in <file|dir>` (required), `--out <dir>` (default `tools/extractor/out/`, gitignored;
the CLI refuses `src/data/multiblocks/`), `--block-map <file>`, `--variant <sel>`,
`--hint-fallback <kinds>` (treat hint dots as hatch cells when a dump has no `hatch_slots`),
`--shareable <kinds>`, `--strict` (exit 1 on any warning). Every written def is checked with
`validateDef` and `geometry.localCells`. `_report.json` in the output dir lists the warnings per
written file, the inputs that failed, and `staleFiles` (older `.json` files in the output dir that
this run did not produce — the CLI never deletes anything, so use a fresh `--out` or clear it
yourself). Exit code: 0 ok, 1 some file failed (or warnings with `--strict`), 2 usage error.

## Running the Java extractor (human, needs the GTNH dev environment)

Not run by this repository's CI or agents: the first run downloads Minecraft/Forge, the Java
toolchains and the GT5-Unofficial dependency tree from the GTNH Nexus (several GB).

Prerequisites:

- Git, and a **full JDK 25** with `JAVA_HOME` pointing at it (the Gradle daemon is pinned to 25;
  without `JAVA_HOME` Gradle falls through to an auto-provisioned JRE and fails with a confusing
  "must have the executable 'javac'" error). Leave Gradle toolchain auto-download enabled: it also
  fetches a Zulu JDK 17 and a Java 8 toolchain.
- Network access to `https://nexus.gtnewhorizons.com/repository/public/`.
- The pack version to dump is pinned in the upstream `tools/gtnh-extractor/dependencies.gradle`
  (GT5-Unofficial + StructureLib; 2.9.0-beta-2 = GT5U 5.09.54.20, StructureLib 1.4.42 at the time
  of writing). Edit those two coordinates to target another pack.

Steps (bash, e.g. Git Bash on Windows):

```sh
git clone https://github.com/MrBruh/gtnh-process-line-solver.git
cd gtnh-process-line-solver/tools/gtnh-extractor
export JAVA_HOME="/c/Program Files/Java/jdk-25"          # your JDK 25

# Accept the EULA / offline mode up front: piped stdin answers do not survive a detached shell.
mkdir -p run/server
printf 'eula=true\n' > run/server/eula.txt
printf 'server-port=25599\nonline-mode=false\n' > run/server.properties

./gradlew setupCIWorkspace                               # one-time: decompile MC, fetch deps (slow)
./gradlew runServer -PdatasetOut=../../_dump_out -PpackVersion=2.9.0-beta-2
# BUILD SUCCESSFUL (real exit status 0) == dump finished; output in _dump_out/multiblocks/
```

`-PdebugMeta=<id>` logs the hint pass of one controller. Controllers that could not be dumped
are listed in `_meta.json` `failures` (at 2.9.0-beta-2 upstream reports ~296 controllers dumped).

Then convert:

```sh
cd <this repo>
node tools/extractor/convert.mjs --in ../gtnh-process-line-solver/_dump_out/multiblocks --out tools/extractor/out
```

## Reviewing and promoting a file

1. Read the warnings (console or `tools/extractor/out/_report.json`). For every
   `unmapped block <registry>:<meta>`: add a block to `src/data/blocks.ts` (name, colour) and a
   `"<registry>:<meta>": "<id>"` entry to `block-map.json`, then re-run. Do not promote files
   that still contain `ext.*` ids.
2. Check the structure against the GT5-Unofficial source linked in `source` (or the in-game
   hologram): `-` cells (enclosed empty cells are assumed to be required air), hatch cells,
   controller position.
3. Decide the planner-specific fields the dump cannot know: `tier`, `requiredHatches` (e.g. EBF
   muffler min 1 max 1, maintenance min 1), `shareableHatches`, `defaultHatches`, and whether
   `wallshare` is really allowed in game. Trim `notes`.
4. Pick a good `id` (it is part of saved plans and share links; never rename after release).
5. Copy the file into `src/data/multiblocks/<id>.json`, run `npx prettier --write` on it, then
   `npm run check && npm test` and look at it in `npm run dev`.

## Files

- `convert.ts` - pure converter (types, parse, convert, validate, format).
- `convert.mjs` - CLI (also re-exports `convert.ts`, because Vite resolves `./convert` to it).
- `block-map.json` - dump block identity → planner block id. Values must exist in `src/data/blocks.ts`.
- `convert.test.ts` - Vitest tests (fixtures, synthetic real-shaped dump, CLI end to end).
- `fixtures/` - upstream Apache-2.0 fixtures + `NOTICE`.
- `out/` - default output, gitignored.
