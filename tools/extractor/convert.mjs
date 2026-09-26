#!/usr/bin/env node
// CLI: convert gtnh-process-line-solver multiblock dump files into planner MultiblockDef JSON.
// Runs on plain Node >= 22.18 / 23.6 (built-in TypeScript type stripping imports convert.ts).
// See tools/extractor/README.md.
import { mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertDump, formatJson, HATCH_KIND_ORDER, isDumpMeta, parseDump } from './convert.ts';
import { localCells } from '../../src/model/geometry.ts';
import { BLOCKS } from '../../src/data/blocks.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const catalogDir = resolve(repoRoot, 'src', 'data', 'multiblocks');

const USAGE = `Usage: node tools/extractor/convert.mjs --in <dump.json|dir> [options]

Options:
  --in <path>             Dump file, or directory of dump files (e.g. <datasetOut>/multiblocks). Required.
  --out <dir>             Output directory (default tools/extractor/out). Never src/data/multiblocks.
  --block-map <file>      Block map JSON (default tools/extractor/block-map.json).
  --variant <sel>         first | last | largest | all | <trigger stack size>   (default first)
  --hint-fallback <kinds> Comma list of hatch kinds for hint dots when a dump has no hatch_slots.
  --shareable <kinds>     Comma list of hatch kinds written to shareableHatches (default none).
  --strict                Exit 1 when any warning was produced.
  -h, --help              Show this help.

Hatch kinds: ${HATCH_KIND_ORDER.join(', ')}`;

/** @param {string[]} argv */
function parseArgs(argv) {
  /** @type {{in?: string, out: string, blockMap: string, variant: string, hintFallback: string[], shareable: string[], strict: boolean, help: boolean}} */
  const o = {
    out: join(here, 'out'),
    blockMap: join(here, 'block-map.json'),
    variant: 'first',
    hintFallback: [],
    shareable: [],
    strict: false,
    help: false,
  };
  const kinds = (/** @type {string} */ s, /** @type {string} */ flag) => {
    const list = s
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    for (const k of list) if (!HATCH_KIND_ORDER.includes(k)) usage(`${flag}: unknown hatch kind "${k}"`);
    return list;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) usage(`${a} needs a value`);
      return v;
    };
    if (a === '--in') o.in = val();
    else if (a === '--out') o.out = val();
    else if (a === '--block-map') o.blockMap = val();
    else if (a === '--variant') o.variant = val();
    else if (a === '--hint-fallback') o.hintFallback = kinds(val(), a);
    else if (a === '--shareable') o.shareable = kinds(val(), a);
    else if (a === '--strict') o.strict = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else usage(`unknown argument "${a}"`);
  }
  return o;
}

/** @param {string} msg @returns {never} */
function usage(msg) {
  console.error(`error: ${msg}\n\n${USAGE}`);
  process.exit(2);
}

/** True when `p` is `dir` or below it. @param {string} p @param {string} dir */
function isInside(p, dir) {
  const rel = relative(dir, p);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/** Validate --variant up front. @param {string} v */
function checkVariant(v) {
  if (v === 'all' || v === 'first' || v === 'last' || v === 'largest') return;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) usage(`--variant: expected first|last|largest|all|<int>, got "${v}"`);
}

/** Variant selectors for one doc. @param {string} v @param {import('./convert.ts').DumpDoc} doc */
function variantSelectors(v, doc) {
  if (v === 'all')
    return [...doc.variants]
      .sort((a, b) => a.trigger_stack_size - b.trigger_stack_size)
      .map((x) => x.trigger_stack_size);
  if (v === 'first' || v === 'last' || v === 'largest') return [v];
  return [Number(v)];
}

/** Read and check the block map; any problem is a usage error. @param {string} file */
function loadBlockMap(file) {
  let map;
  try {
    map = JSON.parse(readFileSync(resolve(file), 'utf8'));
  } catch (e) {
    usage(`--block-map: ${/** @type {Error} */ (e).message}`);
  }
  const ok =
    typeof map === 'object' &&
    map !== null &&
    typeof map.blocks === 'object' &&
    map.blocks !== null &&
    !Array.isArray(map.blocks) &&
    Object.values(map.blocks).every((v) => typeof v === 'string');
  if (!ok) usage(`${file}: expected {"blocks": {"<registry>:<meta>": "<block id>", ...}}`);
  return map;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  if (!args.in) usage('--in is required');
  checkVariant(args.variant);
  const inPath = resolve(args.in);
  const outDir = resolve(args.out);
  if (isInside(outDir, catalogDir))
    usage(
      `refusing to write into ${relative(repoRoot, catalogDir)}; convert to a review dir and promote by hand`,
    );
  const blockMap = loadBlockMap(args.blockMap);

  /** @type {string[]} */
  let files = [];
  try {
    files = statSync(inPath).isDirectory()
      ? readdirSync(inPath)
          .filter((f) => f.endsWith('.json'))
          .sort()
          .map((f) => join(inPath, f))
      : [inPath];
  } catch (e) {
    usage(`--in: ${/** @type {Error} */ (e).message}`);
  }

  /** @type {{input: string, error: string}[]} */
  const failures = [];
  const fail = (/** @type {string} */ input, /** @type {unknown} */ e) => {
    const error = e instanceof Error ? e.message : String(e);
    failures.push({ input, error });
    console.error(`FAIL ${input}: ${error}`);
  };

  // Load all files first: pick up _meta.json (pack version) and skip it as a controller doc.
  let packVersion;
  const docs = [];
  for (const file of files) {
    const label = basename(file);
    try {
      const json = JSON.parse(readFileSync(file, 'utf8'));
      if (isDumpMeta(json)) {
        packVersion = json.pack_version;
        continue;
      }
      docs.push({ label, doc: parseDump(json, label) });
    } catch (e) {
      fail(label, e);
    }
  }

  mkdirSync(outDir, { recursive: true });
  const before = new Set(readdirSync(outDir).filter((f) => f.endsWith('.json') && f !== '_report.json'));
  const usedIds = new Set();
  const report = [];
  let warningCount = 0;
  for (const { label, doc } of docs) {
    for (const sel of variantSelectors(args.variant, doc)) {
      try {
        const { def, warnings, variant } = convertDump(doc, {
          blockMap,
          variant: sel,
          hintFallbackKinds: args.hintFallback,
          shareableHatches: args.shareable,
          packVersion,
        });
        if (args.variant === 'all' && doc.variants.length > 1) {
          def.id = `${def.id}-t${variant.trigger_stack_size}`;
          def.name = `${def.name} (stack ${variant.trigger_stack_size})`;
        }
        if (usedIds.has(def.id)) {
          let alt = `${def.id}-${doc.controller.meta}`;
          for (let n = 2; usedIds.has(alt); n++) alt = `${def.id}-${doc.controller.meta}-${n}`;
          warnings.push(`id "${def.id}" already used in this run; renamed to "${alt}"`);
          def.id = alt;
        }
        usedIds.add(def.id);

        // convertDump already ran validateDef; also expand the def exactly like the app will.
        localCells(def);
        const unknown = new Set(
          [
            def.controller.blockId,
            ...Object.values(def.legend).map((e) => e.blockId),
            ...Object.values(def.hatchBlocks),
          ].filter(
            // Generated `ext.*` ids were already reported as unmapped blocks.
            (id) => !BLOCKS[id] && !id.startsWith('ext.'),
          ),
        );
        if (unknown.size > 0)
          warnings.push(`block-map ids missing from src/data/blocks.ts: ${[...unknown].sort().join(', ')}`);

        const output = `${def.id}.json`;
        writeFileSync(join(outDir, output), formatJson(def) + '\n');
        before.delete(output);
        warningCount += warnings.length;
        report.push({ input: label, output, variant: variant.trigger_stack_size, warnings });
        console.log(`ok   ${label} -> ${output}${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
        for (const w of warnings) console.log(`     warn: ${w}`);
      } catch (e) {
        fail(`${label} (variant ${sel})`, e);
      }
    }
  }
  const staleFiles = [...before].sort();
  writeFileSync(
    join(outDir, '_report.json'),
    JSON.stringify({ packVersion, report, failures, staleFiles }, null, 2) + '\n',
  );
  if (staleFiles.length > 0)
    console.log(
      `\nnote: ${staleFiles.length} older .json file(s) in the output dir were not produced by this run: ${staleFiles.join(', ')}`,
    );
  console.log(
    `\n${report.length} written, ${failures.length} failed, ${warningCount} warnings -> ${outDir}${sep}`,
  );
  if (failures.length > 0) return 1;
  if (args.strict && warningCount > 0) return 1;
  return 0;
}

// Only run when executed directly. Vite/Vitest resolve the extensionless './convert' import to this
// file before convert.ts, so it also re-exports the converter API (below) and must not run main then.
const real = (/** @type {string} */ p) => {
  try {
    const r = realpathSync(p);
    return process.platform === 'win32' ? r.toLowerCase() : r;
  } catch {
    return '';
  }
};
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url)))
  process.exitCode = main();

export * from './convert.ts';
