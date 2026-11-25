// @ts-check
// SA-Opus, improve-generating phase 1, round-1 cross-review: the read-only checks behind the cross-review's findings.
// 1. The static import closure of core/engine/deduce.js (measureDeduction) and its git diff against 3fc65f4.
// 2. The packed sizes (git pack-objects --revs --stdout, deltas included) of origin/main, of origin/main..HEAD (thin)
//    and of origin/improve-generating..HEAD (thin), against the loose-object sizes the round-1 analysis quoted.
// 3. The production pool's width limit (core/browser/worker-pool.js) and the existing width-invariance tests.
// It runs git only to read; it writes p1-xr-checks.md beside itself.
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-xr-checks.mjs
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-phase-1/evidence/sa-opus';
const git = (/** @type {string[]} */ args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

// 1. The import closure of deduce.js.
const seen = new Set();
/** @param {string} file */
const visit = (file) => {
  if (seen.has(file)) {
    return;
  }
  seen.add(file);
  const src = readFileSync(join(ROOT, file), 'utf8');
  // Runtime imports only: `import ... from '<path>'`, `export ... from '<path>'` and `import '<path>'` (no semicolon
  // in between, so a match never spans two statements; JSDoc `import('./types.js')` types are not runtime imports).
  const paths = [
    ...[...src.matchAll(/^\s*(?:import|export)\s[^'";]*?\bfrom\s+['"](\.[^'"]+)['"]/gm)].map((m) => m[1]),
    ...[...src.matchAll(/^\s*import\s+['"](\.[^'"]+)['"]/gm)].map((m) => m[1]),
  ];
  for (const p of paths) {
    visit(relative(ROOT, normalize(join(ROOT, dirname(file), p))).replace(/\\/g, '/'));
  }
};
visit('core/engine/deduce.js');
const closure = [...seen].sort();
const closureDiff = git(['diff', '--stat', '3fc65f4', 'HEAD', '--', ...closure]);

// 2. Packed sizes.
/** @param {string[]} revs @param {boolean} thin @returns {Promise<number>} */
const packed = (revs, thin) => new Promise((resolve, reject) => {
  const p = spawn('git', ['pack-objects', '--revs', '--stdout', '-q', ...(thin ? ['--thin'] : [])], { cwd: ROOT, stdio: ['pipe', 'pipe', 'inherit'] });
  let n = 0;
  p.stdout.on('data', (d) => { n += d.length; });
  p.on('close', (code) => (code === 0 ? resolve(n) : reject(new Error(`git pack-objects exit ${code}`))));
  p.stdin.end(`${revs.join('\n')}\n`);
});
const mb = (/** @type {number} */ n) => (n / 1048576).toFixed(1);
const sizes = {
  main: await packed(['origin/main'], false),
  branch: await packed(['HEAD', '^origin/main'], true),
  unpushed: await packed(['HEAD', '^origin/improve-generating'], true),
};

// 3. The pool limit and the width tests.
const grepLines = (/** @type {string} */ file, /** @type {RegExp} */ re) => readFileSync(join(ROOT, file), 'utf8').split(/\r?\n/)
  .map((line, i) => ({ line: i + 1, text: line.trim() })).filter((x) => re.test(x.text));
const pool = grepLines('core/browser/worker-pool.js', /MAX_POOL_SIZE = |size > MAX_POOL_SIZE/);
const widths = [
  ...grepLines('tests/generate.test.js', /for \(const width of \[|pool sizes 1-4/).map((x) => ({ file: 'tests/generate.test.js', ...x })),
  ...grepLines('tests/generation-client.test.js', /for \(const size of \[|runRecipe\((1|2|4)[,)]|whatever the pool width|one and four workers/).map((x) => ({ file: 'tests/generation-client.test.js', ...x })),
];

const md = [
  `# Round-1 cross-review checks (SA-Opus), base ${git(['rev-parse', '--short', 'HEAD'])}`,
  '',
  `1. The import closure of \`core/engine/deduce.js\` (${closure.length} files): ${closure.map((f) => `\`${f}\``).join(', ')}.`,
  `   \`git diff --stat 3fc65f4 HEAD -- <closure>\`: ${closureDiff === '' ? 'empty (byte-equal)' : closureDiff}.`,
  `2. Packed sizes (\`git pack-objects --revs --stdout\`, deltas included): origin/main ${mb(sizes.main)} MB; origin/main..HEAD (thin) ${mb(sizes.branch)} MB; origin/improve-generating..HEAD (thin) ${mb(sizes.unpushed)} MB.`,
  `3. The production pool: ${pool.map((x) => `core/browser/worker-pool.js:${x.line} \`${x.text}\``).join('; ')}.`,
  '   Width tests:',
  ...widths.map((x) => `   - ${x.file}:${x.line} \`${x.text}\``),
].join('\n');
writeFileSync(join(ROOT, HERE, 'p1-xr-checks.md'), `${md.replace(/\n/g, '\r\n')}\r\n`, 'utf8');
process.stdout.write(`${md}\n`);
