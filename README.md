# GTNH Wall-Share Planner

A 3D planner for [GregTech: New Horizons](https://github.com/GTNewHorizons/GT-New-Horizons-Modpack) multiblocks that share walls, hatches and pipes. Pick a multiblock, set how many you want, and the planner packs them so compatible casings overlap, places shared hatches and routes pipes between them.

It is a layout tool, not a recipe or production-chain calculator. Structures follow GT:NH **2.9.0-beta-3**
(GT5-Unofficial 5.09.54.133).

**Live:** <https://ryazhenkofc.github.io/gtnh-wallshare-planner/>

## Features

- **Catalog of 37 multiblocks** with a picker: steam machines (Steam Separator, Grinder, Squasher, Presser, Hearth, Blender, Purifier, Fuser), Coke Oven, EBF, Vacuum Freezer, Distillation Tower, Pyrolyse Oven, Large Boilers, Large Turbines, combustion engines, Assembly Line, Large Fluid Extractor, Industrial Autoclave and more. Almost every GT multiblock can share walls in game (structure checks do not claim casings), so the catalog is limited only by what has been transcribed.
- **Adjustable sizes** for multiblocks GT builds in variable size: Distillation Tower height (3 to 12) and Assembly Line length (5 to 16).
- **Auto-packing** of N units with optional limits counted in multiblocks (at most N along X, N layers, N along Z); controllers always face outward, and rows that cannot share a back wall get a one-block walkway. Example: 15 Pyrolyse Ovens with X 5, Layers 1, Z 3 give three rows of five.
- **Shared walls**: blocks that coincide in the same cell are counted once; incompatible overlaps are highlighted.
- **Hatches**: enable hatch kinds per plan; shareable hatches serve several controllers from one block. A hatch faces open space rather than a gap between units, and never the ground: the build stands on its lowest layer.
- **Pipe routing** per hatch kind (items, fluids, steam), with length estimates and a warning for hatches left unconnected. Bends are priced in (Dijkstra over cell + direction), so pipes run in straight trunks: about half the bends of plain shortest paths, usually with fewer pipe blocks. A pipe may reach a hatch from any open side (the hatch is turned to face it, as with a wrench in game), and pipes never go underground.
- **Cable routing**: the Cables toggle connects energy hatches (and dynamo hatches of generators) with thinner cables, like pipes.
- **SIMPLE / DETAILED view**: flat colours, or real GregTech textures.
- **Stats line**: units, unique blocks, shared walls, hatches and how many blocks sharing saves.
- **Save and share**: autosave in the browser, JSON download/upload, and share links.
- **Sites** (the SITE view): several groups of multiblocks on a bounded ground area (30 × 30 by default), joined by
  links that each carry one item, fluid or EU. Every group gets one hatch per resource it takes or gives, pipes are
  routed between groups and to input/output ports on the site edges, and animated arrows show which way each
  pipe flows. Groups can be arranged automatically along the flow, moved and turned by hand.
- **GTNH Planner import**: open a chain exported from [GTNH Planner](https://gtnhplanner.com) (its board's
  Export JSON) and it becomes a site: one group per recipe node, links from its edges, ports for whatever enters
  or leaves the chain.

## How to use

1. Choose a multiblock in the catalog.
2. Set the count and, if needed, the maximum footprint.
3. Set the height or length of a resizable multiblock; toggle hatch kinds, pipes and cables; switch between SIMPLE and DETAILED.
4. Drag to orbit, scroll or pinch to zoom, right-drag to pan, double-click to reset. Click a block to select its unit.
5. Copy a share link, or download the plan as JSON.

The planner checks layout rules for the transcribed structure only. It is not a full in-game build validation.

### Sites

1. Switch to SITE in the top bar. Use SITE (top right) to open the site panel.
2. Import a chain (IMPORT FROM GTNH PLANNER), or build one by hand: ADD MULTIBLOCK, then ADD LINK with a start
   (a group or SITE INPUT), an end (a group or SITE OUTPUT) and a resource. In the single-machine view, SETTINGS →
   ADD TO SITE copies the current plan into the site as a group.
3. ARRANGE lays the groups out west to east along the flow. Select a group (click it, or pick it in the panel)
   and move it with the arrow keys (Shift: 5 blocks) or R to turn it; X and Z in the panel place it exactly.
4. Click a pipe or a legend entry to highlight one resource; the other nets fade. The bottom line shows the
   selected group or net, and PROBLEMS lists overlaps, groups outside the site, hatches that did not fit and
   pipes that could not be routed.

In the import dialog every recipe node can be placed as a catalog multiblock, a single-block machine (a
1-block machine whose faces take the pipes), a placeholder (a 3×3×3 stand-in for a multiblock not in the catalog
yet), a site port (passive sources such as crops, bees and ore veins) or skipped. The machine name mapping lives
in [`src/data/gtnhplanner-machines.ts`](src/data/gtnhplanner-machines.ts). Storages between machines are passed
through; product drains become output ports, trash drains void ports. Thaumcraft aspect flows are left out.

## Data model

Each multiblock is one JSON file in [`src/data/multiblocks/`](src/data/multiblocks/), typed as `MultiblockDef` in [`src/model/types.ts`](src/model/types.ts). Files are picked up at build time; there is no registry to edit.

| Field                | Meaning                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `id`, `name`, `tier` | Stable id (used in saved plans and links), display name, short tag such as `Steam` or `LV`.  |
| `source`             | Link to the GT5-Unofficial source the structure was transcribed from.                        |
| `size`               | `[x, y, z]` in blocks.                                                                       |
| `layers`             | `layers[y][z]` is a string of length `x`. `~` controller, `-` must be air, space = not part. |
| `legend`             | Every other character: `{ blockId, hatches? }`. `hatches` lists kinds that may replace it.   |
| `controller`         | `{ pos, facing, blockId }`; `pos` is the `~` cell, `facing` the front face (local frame).    |
| `hatchBlocks`        | Block id placed for each hatch kind.                                                         |
| `shareableHatches`   | Hatch kinds whose single block may serve several controllers.                                |
| `requiredHatches`    | Optional `{ min, max }` per hatch kind and unit.                                             |
| `defaultHatches`     | Hatch kinds enabled in a new plan.                                                           |
| `wallshare`          | Whether casings of two units may overlap when the blocks match.                              |
| `resize`             | Optional variable size: `{ axis, from, to, min, max, default, label }`, see below.           |
| `notes`              | Free-text notes: game version, quirks, hatch behaviour.                                      |

Coordinates follow Minecraft: X = east, Y = up, Z = south.

**Variable size.** A multiblock that GT builds in several sizes stores its smallest form (`size[axis] === min`)
with one copy of a repeating slab `[from, to)` along `axis`. A plan's height or length inserts more copies after
it (`sizedDef` in [`src/model/resize.ts`](src/model/resize.ts)). A slab cell with a `region` gets one numbered
region per copy (`layer` → `layer1`, `layer2`, …), and `requiredHatches.*.regions` naming it grow to match, so
the Distillation Tower keeps one output hatch per layer. Never change `default`: plans without a size use it.

**Adding a multiblock**

1. Add `src/data/multiblocks/<id>.json` (see [`coke-oven.json`](src/data/multiblocks/coke-oven.json)).
2. Register any new block ids in [`src/data/blocks.ts`](src/data/blocks.ts) with a flat colour, and map them to textures in [`src/render/textures.json`](src/render/textures.json).
3. Run `npm run check && npm test`, then check the new entry in `npm run dev`.

Structures can be transcribed by hand from the GT5-Unofficial source or generated with the extractor: see [`tools/extractor/README.md`](tools/extractor/README.md).

## Textures and attribution

DETAILED view uses block textures from [GT5-Unofficial](https://github.com/GTNewHorizons/GT5-Unofficial), licensed under LGPL-3.0. They live in `public/textures/`. Sources and licence details are in [`ATTRIBUTION.md`](ATTRIBUTION.md). SIMPLE view uses flat colours only.

## Privacy

There is no server, account or tracking. Plans are stored in your browser's `localStorage`. A share link carries the compressed plan in the URL fragment (`#p=...`, or `#s=...` for a site); browsers never send the fragment to the server, so the host only sees a request for the page.

The GTNH Planner import reads the file you open or paste in the browser. It makes no request to gtnhplanner.com
(its API does not allow requests from other sites), and item icons are not loaded: resources show as colours.

## Development

Requires Node 24 LTS.

```sh
npm ci          # install
npm run dev     # dev server with hot reload
npm run check   # svelte-check + TypeScript
npm test        # unit tests (Vitest)
npm run e2e     # Playwright smoke tests; first run: npx playwright install chromium
npm run build   # production build into dist/
npm run format  # Prettier
```

Stack: TypeScript, Svelte 5, Three.js, Vite.

### Project structure

```
src/
  data/        block registry, catalog, multiblocks/*.json
  model/       pure logic: geometry, layout, walls, hatches (ports), routing, scene model
    site/      sites: group builds, net router, auto-arrange, site scene
  import/      GTNH Planner project import
  render/      Three.js renderer, SIMPLE and DETAILED materials, texture mapping
  share/       share-link codec and local persistence
  state/       app store
  ui/          Svelte components
  i18n/        UI strings
public/        static files copied as-is (favicon, textures)
e2e/           Playwright tests
tools/         offline tooling (structure extractor)
```

## Deployment

The build is a static site in `dist/` with relative asset paths (`base: './'`), so it works from any sub-path.

**GitHub Pages.** In the repository settings, open Pages and set the source to GitHub Actions. Every push to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml): type-check, unit tests, build, then deploy `dist/`. Pull requests run [`ci.yml`](.github/workflows/ci.yml), which adds formatting and end-to-end checks.

**Cloudflare Pages** (or any static host). Build command `npm run build`, output directory `dist`. Set the environment variable `NODE_VERSION=24` if the host does not pick it up.

## License

The planner is released under the [MIT License](LICENSE), © 2026 ryazhenkofc.

Bundled third-party files keep their own licences:

- GT5-Unofficial block textures in `public/textures/` (the sources and the generated `atlas.png`) are under LGPL-3.0; see [`ATTRIBUTION.md`](ATTRIBUTION.md).
- The two structure fixtures in `tools/extractor/fixtures/` come from gtnh-process-line-solver under Apache-2.0; see their [`NOTICE`](tools/extractor/fixtures/NOTICE).
