# GTNH Wall-Share Planner

A 3D planner for [GregTech: New Horizons](https://github.com/GTNewHorizons/GT-New-Horizons-Modpack) multiblocks that share walls, hatches and pipes. Pick a multiblock, set how many you want, and the planner packs them so compatible casings overlap, places shared hatches and routes pipes between them.

It is a layout tool, not a recipe or production-chain calculator.

**Live:** <https://ryazhenkofc.github.io/gtnh-wallshare-planner/>

## Features

- **Catalog of 13 wall-shareable multiblocks** (Coke Oven, EBF, Vacuum Freezer, Distillation Tower, Pyrolyse Oven…) with a picker.
- **Auto-packing** of N units with optional limits counted in multiblocks (at most N along X, N layers, N along Z); controllers always face outward, and rows that cannot share a back wall get a one-block walkway. Example: 15 Pyrolyse Ovens with X 5, Layers 1, Z 3 give three rows of five.
- **Shared walls**: blocks that coincide in the same cell are counted once; incompatible overlaps are highlighted.
- **Hatches**: enable hatch kinds per plan; shareable hatches serve several controllers from one block. A hatch faces open space rather than a gap between units, and never the ground: the build stands on its lowest layer.
- **Pipe routing** per hatch kind, with length estimates and a warning for hatches left unconnected. Bends are priced in (Dijkstra over cell + direction), so pipes run in straight trunks: about half the bends of plain shortest paths, usually with fewer pipe blocks. A pipe may reach a hatch from any open side (the hatch is turned to face it, as with a wrench in game), and pipes never go underground.
- **SIMPLE / DETAILED view**: flat colours, or real GregTech textures.
- **Stats line**: units, unique blocks, shared walls, hatches and how many blocks sharing saves.
- **Save and share**: autosave in the browser, JSON download/upload, and share links.

## How to use

1. Choose a multiblock in the catalog.
2. Set the count and, if needed, the maximum footprint.
3. Toggle hatch kinds and pipes; switch between SIMPLE and DETAILED.
4. Drag to orbit, scroll or pinch to zoom, right-drag to pan, double-click to reset. Click a block to select its unit.
5. Copy a share link, or download the plan as JSON.

The planner checks layout rules for the transcribed structure only. It is not a full in-game build validation.

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
| `notes`              | Free-text notes: game version, quirks, hatch behaviour.                                      |

Coordinates follow Minecraft: X = east, Y = up, Z = south.

**Adding a multiblock**

1. Add `src/data/multiblocks/<id>.json` (see [`coke-oven.json`](src/data/multiblocks/coke-oven.json)).
2. Register any new block ids in [`src/data/blocks.ts`](src/data/blocks.ts) with a flat colour, and map them to textures in [`src/render/textures.json`](src/render/textures.json).
3. Run `npm run check && npm test`, then check the new entry in `npm run dev`.

Structures can be transcribed by hand from the GT5-Unofficial source or generated with the extractor: see [`tools/extractor/README.md`](tools/extractor/README.md).

## Textures and attribution

DETAILED view uses block textures from [GT5-Unofficial](https://github.com/GTNewHorizons/GT5-Unofficial), licensed under LGPL-3.0. They live in `public/textures/`. Sources and licence details are in [`ATTRIBUTION.md`](ATTRIBUTION.md). SIMPLE view uses flat colours only.

## Privacy

There is no server, account or tracking. Plans are stored in your browser's `localStorage`. A share link carries the compressed plan in the URL fragment (`#p=...`); browsers never send the fragment to the server, so the host only sees a request for the page.

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
