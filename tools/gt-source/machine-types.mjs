// Writes src/data/gt-machine-types.generated.json: the machine types GT names in each catalog multiblock's
// tooltip (`getMachineType()`, `addMachineType("...")`), e.g. "Vacuum Furnace, Dehydrator" for the
// Utupu-Tanuri. GTNH Planner shows these names, so the import can find the multiblock by them.
//
//   node tools/gt-source/machine-types.mjs ../gt5u
//
// Only types that name exactly one catalog multiblock are kept (lower case, type -> id).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const clone = process.argv[2];
if (!clone) {
  console.error('usage: node tools/gt-source/machine-types.mjs <GT5-Unofficial clone>');
  process.exit(1);
}

const dir = 'src/data/multiblocks';
const byType = new Map();
let read = 0;
for (const f of readdirSync(dir).sort()) {
  const def = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const m = (def.source ?? '').match(/\/blob\/[^/]+\/(.+\.java)$/);
  if (!m) continue;
  const file = join(clone, m[1]);
  if (!existsSync(file)) continue;
  read++;
  const src = readFileSync(file, 'utf8');
  const found = [
    ...[...src.matchAll(/getMachineType\(\)\s*\{\s*return\s+"([^"]+)"/g)].map((r) => r[1]),
    ...[...src.matchAll(/addMachineType\(\s*"([^"]+)"/g)].map((r) => r[1]),
  ];
  for (const t of found.flatMap((s) => s.split(','))) {
    const k = t.trim().toLowerCase();
    if (!k) continue;
    if (!byType.has(k)) byType.set(k, new Set());
    byType.get(k).add(def.id);
  }
}

const out = {};
for (const [k, ids] of [...byType].sort(([a], [b]) => (a < b ? -1 : 1)))
  if (ids.size === 1) out[k] = [...ids][0];
writeFileSync('src/data/gt-machine-types.generated.json', JSON.stringify(out, null, 2) + '\n');
console.log(`${read} sources read, ${Object.keys(out).length} machine types written`);
