// @ts-check
// SA-Opus, improve-generating phase 1, review of the task pack (review-1.md): checks that the simpler replacements
// proposed for P1-01, P1-02 and P1-03b hold at the plan commit. Unlocked reads, Git reads and pure report arithmetic
// only: no test runner, solver, rating, generation, replay or benchmark. Scratch copies go to the git-ignored
// tests/artifacts/improve-generating-phase-1/review-scratch/ folder and are removed at the end.
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review-checks.mjs
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { computeSourceDigest } from '../../../../tools/bench/report.js';
import { compareReports, readLedger, renderMarkdown } from '../../../../tools/ig-proto/phase1/p6-bench.mjs';
import { provenanceVersions } from '../../../../core/engine/generate.js';
import { APP_VERSION } from '../../../../core/engine/version.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const PLAN = 'eca0f94717a56de43c52f6cb54d739360670fef8';
const FROZEN = '3fc65f4681a53d3984d9218c15efbf696cc3a1a5';
const P6_DIGEST = 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4';
const EVIDENCE = 'docs/improve-generating/evidence/phase1/P6-bench';
const SCRATCH = 'tests/artifacts/improve-generating-phase-1/review-scratch';
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const lf = (/** @type {string} */ s) => s.replace(/\r\n/g, '\n');
const sha = (/** @type {string | Buffer} */ b) => createHash('sha256').update(b).digest('hex');
const text = (/** @type {string} */ p) => readFileSync(abs(p), 'utf8');
const git = (/** @type {string[]} */ args) => execFileSync('git', ['--no-pager', ...args], { cwd: ROOT, encoding: 'utf8' });
/** @type {string[]} */
const out = [];
const row = (/** @type {string} */ name, /** @type {boolean} */ ok, /** @type {string} */ detail) => {
  out.push(`| ${name} | ${ok ? 'pass' : 'FAIL'} | ${detail} |`);
};

out.push(`HEAD ${git(['rev-parse', 'HEAD']).trim()}; plan ${PLAN}.`, '', '| Check | Result | Detail |', '|---|---|---|');

// 1. P1-01: the stored comparison and its Markdown re-render from the four bound publications.
const stored = JSON.parse(text(`${EVIDENCE}/compare.json`));
const ledger = readLedger(text(`${EVIDENCE}/ledger.jsonl`));
const reports = stored.reports.map((/** @type {any} */ r) => {
  const entry = ledger.find((/** @type {any} */ l) => l.group === r.group && l.side === r.side && l.exit === 0);
  const bytes = readFileSync(abs(`${EVIDENCE}/${r.file}`));
  return {
    group: r.group, side: r.side, path: entry.report, bytes,
    mdPath: entry.report.replace(/\.json$/, '.md'),
    mdBytes: readFileSync(abs(`${EVIDENCE}/${r.file.replace(/\.json$/, '.md')}`)),
  };
});
const recomputed = compareReports({ reports, ledger, pending: null, newCommit: stored.commits.new });
row('compareReports deep-equals compare.json', isDeepStrictEqual(recomputed, stored), `${stored.reports.length} reports`);
const md = renderMarkdown(recomputed);
row('renderMarkdown equals compare.md (LF)', lf(md) === lf(text(`${EVIDENCE}/compare.md`)),
  `rendered ${lf(md).length} chars, stored ${lf(text(`${EVIDENCE}/compare.md`)).length}`);

// 2. P1-01: the version tuple and the fixtures' stored tuples.
const p = provenanceVersions();
const versions = { algo: p.algo, policy: p.policy, rng: p.rng, model: p.ratingModel, app: APP_VERSION };
const want = { algo: 'gen-v3', policy: 'mixed-v3', rng: 'xoshiro128ss-v1', model: 'difficulty-v3', app: '1.0.0' };
row('provenanceVersions + APP_VERSION tuple', isDeepStrictEqual(versions, want), JSON.stringify(versions));
for (const f of ['generation-case', 'replay-case']) {
  const v = JSON.parse(text(`tests/fixtures/${f}.json`)).versions;
  row(`${f}.json versions`, isDeepStrictEqual(v, { algo: want.algo, policy: want.policy, rng: want.rng, model: want.model }),
    JSON.stringify(v));
}

// 3. P1-03b: the runtime digest through the command-line callback (repo-relative path -> text).
const digest = await computeSourceDigest((/** @type {string} */ q) => readFileSync(abs(q), 'utf8'));
row('computeSourceDigest at the worktree', digest === P6_DIGEST, digest);
const oneLiner = spawnSync(process.execPath, ['--input-type=module', '-e',
  "import { readFileSync } from 'node:fs'; import { computeSourceDigest } from './tools/bench/report.js';"
  + " console.log(await computeSourceDigest((p) => readFileSync(p, 'utf8')));"], { cwd: ROOT, encoding: 'utf8' });
row('the P1-03b digest one-liner', oneLiner.status === 0 && oneLiner.stdout.trim() === P6_DIGEST,
  `exit ${oneLiner.status}; ${oneLiner.stdout.trim()}`);

// 4. P1-01: the deduction closure by import walk, against the frozen blobs (no git-ignored snapshot).
const visited = [];
const queue = ['core/engine/deduce.js'];
const seen = new Set();
let closureEqual = true;
while (queue.length > 0) {
  const q = /** @type {string} */ (queue.shift());
  if (seen.has(q)) continue;
  seen.add(q);
  visited.push(q);
  const current = text(q);
  closureEqual &&= lf(current) === lf(git(['show', `${FROZEN}:${q}`]));
  for (const m of current.matchAll(/^import[\s\S]*?\bfrom\s+['"]([^'"]+)['"];?/gm)) {
    if (m[1].startsWith('.')) queue.push(posix.normalize(posix.join(posix.dirname(q), m[1])));
  }
}
const nine = ['deduce', 'policy', 'tiling', 'levels', 'qualification', 'dlx', 'geometry', 'placements', 'workspace']
  .map((n) => `core/engine/${n}.js`).sort();
row('deduction closure is the nine files, equal to FROZEN', closureEqual && isDeepStrictEqual([...visited].sort(), nine),
  visited.map((v) => v.replace('core/engine/', '')).join(', '));

// 5. P1-01: the P7 context report and its inputs are tracked (an import of git-ignored raw files is not required).
const p7Path = 'docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-full/p7.json';
const p7 = JSON.parse(text(p7Path));
const tracked = (/** @type {string} */ q) => spawnSync('git', ['ls-files', '--error-unmatch', '--', q], { cwd: ROOT }).status === 0;
const untracked = p7.meta.inputs.map((/** @type {any} */ i) => i.path).filter((/** @type {string} */ q) => !tracked(q));
row('p7.json tracked and equal to the plan blob', tracked(p7Path) && lf(text(p7Path)) === lf(git(['show', `${PLAN}:${p7Path}`])),
  `equal ${p7.equal.equal}/${p7.equal.items}`);
row('p7.json meta.inputs tracked', untracked.length === 0,
  `${p7.meta.inputs.length} inputs; untracked: ${untracked.length === 0 ? 'none' : untracked.join(', ')}`);

// 6. P1-02: the exact expected -U0 hunks of the two planned edits, by --no-index on scratch copies.
mkdirSync(abs(SCRATCH), { recursive: true });
try {
  const planned = [
    {
      path: 'tests/generate.test.js',
      edit: (/** @type {string} */ s) => {
        const start = s.indexOf("describe('deterministic parallel simulation', () => {");
        const end = s.indexOf("describe('recorded generation fixture', () => {");
        const block = s.slice(start, end)
          .replace('pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}',
            'pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}')
          .replace('for (const width of [1, 2, 3, 4]) {', 'for (const width of [1, 2, 3, 4, 8]) {');
        return s.slice(0, start) + block + s.slice(end);
      },
    },
    {
      path: 'docs/design-detail.md',
      edit: (/** @type {string} */ s) => s.replace(
        'Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).',
        'Fold determinism: identical output for simulated pool widths 1, 2, 3, 4 and 8 and three shuffled completion'
        + ' orders, against the serial fold. Width 8 is a test-only simulation; the production pool remains limited to four.'),
    },
  ];
  for (const { path, edit } of planned) {
    const base = lf(git(['show', `${PLAN}:${path}`]));
    const a = `${SCRATCH}/a-${posix.basename(path)}`;
    const b = `${SCRATCH}/b-${posix.basename(path)}`;
    writeFileSync(abs(a), base);
    writeFileSync(abs(b), edit(base));
    const numstat = spawnSync('git', ['--no-pager', 'diff', '--no-index', '--numstat', '--', a, b], { cwd: ROOT, encoding: 'utf8' });
    const hunks = spawnSync('git', ['--no-pager', 'diff', '--no-index', '-U0', '--', a, b], { cwd: ROOT, encoding: 'utf8' });
    const headers = hunks.stdout.split('\n').filter((l) => l.startsWith('@@'));
    const counts = numstat.stdout.trim().split(/\s+/).slice(0, 2).join(' ');
    row(`planned edit of ${path}`, true, `numstat ${counts}; hunks ${headers.map((h) => `\`${h}\``).join(', ')}`);
  }
} finally {
  rmSync(abs(SCRATCH), { recursive: true, force: true });
}

const result = ['# Phase-1 task-pack review checks (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-1\\evidence\\sa-opus\\p1-pack-review-checks.mjs` (unlocked; reads only).', '',
  ...out, ''];
writeFileSync(join(HERE, 'p1-pack-review-checks.md'), result.join('\r\n'), 'utf8');
process.stdout.write(`${result.join('\n')}\n`);
