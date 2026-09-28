// Fails when the build outgrows its budget. Run after `npm run build`.
//
// Budgets sit about 15-20 % above the sizes measured when they were set (September 2026: main JS 321 KB,
// site worker 87 KB, CSS 4 KB gzipped; atlas 90 KB; dist 2.5 MB), so ordinary changes pass and real growth
// (a new dependency, an unsplit data file, an atlas that doubled) is a conscious decision: raise the budget
// here in the same change, with the reason.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const dist = process.argv[2] ?? 'dist';

/** [what, file matcher, measure, budget in bytes] */
const budgets = [
  ['main script (gzip)', /^assets\/main-.*\.js$/, 'gzip', 380 * KB],
  ['site worker (gzip)', /^assets\/siteWorker-.*\.js$/, 'gzip', 105 * KB],
  ['styles (gzip)', /^assets\/.*\.css$/, 'gzip', 6 * KB],
  ['texture atlas', /^textures\/atlas\.png$/, 'raw', 110 * KB],
  ['whole site', /./, 'raw', 3 * 1024 * KB],
];

function files(dir, prefix = '') {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const rel = prefix + name;
    return statSync(path).isDirectory() ? files(path, `${rel}/`) : [rel];
  });
}

if (!existsSync(dist)) {
  console.error(`No ${dist}/: run npm run build first.`);
  process.exit(1);
}
const all = files(dist);
let failed = false;
for (const [what, match, measure, budget] of budgets) {
  const hit = all.filter((f) => match.test(f));
  if (hit.length === 0) {
    console.error(`✗ ${what}: no file matches ${match}`);
    failed = true;
    continue;
  }
  const size = hit.reduce((sum, f) => {
    const bytes = readFileSync(join(dist, f));
    return sum + (measure === 'gzip' ? gzipSync(bytes).length : bytes.length);
  }, 0);
  const ok = size <= budget;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${what}: ${(size / KB).toFixed(1)} KB of ${(budget / KB).toFixed(0)} KB`);
}
// The security headers must ship with the site.
if (!all.includes('_headers')) {
  console.error('✗ _headers is missing from the build');
  failed = true;
}
process.exit(failed ? 1 : 0);
