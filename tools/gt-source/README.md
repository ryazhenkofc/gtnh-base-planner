# GT source reader

Reads the [GT5-Unofficial](https://github.com/GTNewHorizons/GT5-Unofficial) Java sources without compiling them.
The catalog itself is built from a dump of the running game (see [`tools/game-dump/`](../game-dump/README.md));
this code is what is left of the older converter that read the structures from the sources:

- `registry.mjs` indexes a checkout (block classes and their `getIcon`, icon fields, lang files, materials,
  controller names and front overlays). `tools/game-dump/static-textures.mjs` uses it to find the texture of
  every dumped block when no client texture dump is at hand.
- `java.mjs` holds the small Java text helpers it needs (comments, calls, argument lists, method bodies).
- `machine-types.mjs` writes `src/data/gt-machine-types.generated.json`: the machine types GT names in each
  catalog multiblock's tooltip, so the GTNH Planner import can find a multiblock by them.

The catalog follows GT5-Unofficial **5.09.54.133** (GT:NH 2.9.0-beta-3). A sparse, blob-less clone is enough:

```sh
git clone --filter=blob:none --no-checkout --depth 1 --branch 5.09.54.133 \
  https://github.com/GTNewHorizons/GT5-Unofficial.git ../gt5u
git -C ../gt5u sparse-checkout set --no-cone '/src/main/java/' '/src/main/resources/assets/*/lang/en_US.lang'
git -C ../gt5u checkout

node tools/gt-source/machine-types.mjs ../gt5u
```

Four catalog entries still come from the old converter, because the game dump cannot build them (their mods are
not on the dump's dev server): Extreme Entity Crusher, Large Essentia Smeltery, Research Completer and Space
Elevator. Their GT shapes are in `src/data/gt-shapes.generated.json`, checked by `src/data/gt-structures.test.ts`.
