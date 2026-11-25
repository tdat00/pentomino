// @ts-check
// SA-Opus, improve-generating phase 1, review of the task pack (review-1.md, R1-2): applies the proposed P1-01 edit
// list to a copy of SA-Astra's historical phase1-audit.mjs, in the git-ignored folder tests/artifacts/p1r/ (the same
// depth as docs/improve-generating-phase-1/evidence/), runs the copy once (it must write the record), runs it again
// (it must refuse and change nothing), reports, and removes the folder. The historical file is only read.
// Unlocked reads, Git reads and pure report arithmetic only; no test runner, engine run or benchmark.
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-01-edit-proto.mjs
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const SOURCE = join(ROOT, 'docs', 'improve-generating-phase-1', 'evidence', 'sa-astra', 'phase1-audit.mjs');
const SCRATCH = join(ROOT, 'tests', 'artifacts', 'p1r');
const COPY = join(SCRATCH, 'adoption-reader.mjs');
const sha = (/** @type {string | Buffer} */ b) => createHash('sha256').update(b).digest('hex');

/** The R1-2 edit list: [find (must occur exactly once in the original), replacement]. */
const EDITS = [
  ['// SA-Astra, independent phase-1 analysis at 006ca68. Existing files and pure report arithmetic only.\n'
    + '// node docs\\improve-generating-phase-1\\evidence\\sa-astra\\phase1-audit.mjs\n',
  '// improve-generating phase 1, P1-01: the source-bound adoption record (plan §4.4). Unlocked file and Git reads and\n'
    + '// pure report arithmetic only. node docs\\improve-generating-phase-1\\evidence\\adoption-reader.mjs\n'],
  ["import { readFileSync, writeFileSync } from 'node:fs';", "import { existsSync, readFileSync, writeFileSync } from 'node:fs';"],
  ["import { computeSourceDigest, SOURCE_FILES } from '../../../../tools/bench/report.js';\n"
    + "import { compareReports, readLedger } from '../../../../tools/ig-proto/phase1/p6-bench.mjs';\n",
  "import { computeSourceDigest, SOURCE_FILES } from '../../../tools/bench/report.js';\n"
    + "import { compareReports, readLedger, renderMarkdown } from '../../../tools/ig-proto/phase1/p6-bench.mjs';\n"
    + "import { provenanceVersions } from '../../../core/engine/generate.js';\n"
    + "import { APP_VERSION } from '../../../core/engine/version.js';\n"],
  ["const ROOT = join(HERE, '..', '..', '..', '..');\nconst BASE = '006ca68';\n",
    "const ROOT = join(HERE, '..', '..', '..');\n"
    + "const SELF = relative(ROOT, fileURLToPath(import.meta.url)).split('\\\\').join('/');\n"
    + "const PLAN = 'eca0f94717a56de43c52f6cb54d739360670fef8';\n"
    + "const MEASURED_NEW = '27c6189e40bfe2000a454f755797c5745d7c2e84';\n"
    + "const MAIN_REFERENCE = 'b5eb85805f609af7deaa2489eb08675c60b2cc49';\n"
    + "const P6_DIGEST = 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4';\n"
    + "const SITE = ['index.html', 'redirect.js', 'sitemap.xml', 'assets', 'core', 'generator', 'player'];\n"
    + "const P6_FILES = ['core/engine/clues.js', 'core/engine/difficulty.js', 'core/engine/types.js'];\n"
    + "const NINE = ['deduce', 'dlx', 'geometry', 'levels', 'placements', 'policy', 'qualification', 'tiling', 'workspace']\n"
    + '  .map((n) => `core/engine/${n}.js`);\n'
    + "const OUT = ['adoption.json', 'adoption.md'].map((n) => join(HERE, n));\n"],
  ["const baseCommit = git(['rev-parse', BASE]).trim();\n"
    + "check(git(['rev-parse', 'HEAD']).trim() === baseCommit, 'HEAD is not the assigned analysis base');\n",
  "check(OUT.every((p) => !existsSync(p)), 'adoption output exists; the record is written once');\n"
    + "const inspected = git(['rev-parse', 'HEAD']).trim();\n"
    + "git(['merge-base', '--is-ancestor', PLAN, inspected]);\n"
    + "check(git(['rev-parse', 'origin/main']).trim() === MAIN_REFERENCE, 'origin/main is not the main reference');\n"
    + "check(git(['status', '--porcelain', '--untracked-files=all', '--', ...SITE, 'tests', 'tools', 'package.json', '.github']).trim() === '',\n"
    + "  'tested paths have uncommitted or untracked changes');\n"],
  ["check(isDeepStrictEqual(recomputed, stored), 'P6 comparison no longer reproduces exactly from its four reports');\n",
    "check(isDeepStrictEqual(recomputed, stored), 'P6 comparison no longer reproduces exactly from its four reports');\n"
    + "check(stored.commits.new === MEASURED_NEW, 'compare.json names another measured commit');\n"
    + "check(lf(renderMarkdown(recomputed)) === lf(text(`${EVIDENCE}/compare.md`)), 'compare.md does not re-render from the comparison');\n"],
  ['check(currentDigest === stored.digests.new, ', 'check(currentDigest === stored.digests.new && currentDigest === P6_DIGEST, '],
  ["git(['diff', '--name-only', FROZEN, BASE, '--', ...runtimeScope])", "git(['diff', '--name-only', FROZEN, inspected, '--', ...runtimeScope])"],
  ["git(['diff', '--name-only', stored.commits.new, BASE, '--', ...runtimeScope, 'tests'])",
    "git(['diff', '--name-only', stored.commits.new, inspected, '--', ...runtimeScope, 'tests'])"],
  ["check(adoptionDiff === '', 'Runtime or tracked tests differ from the measured P6 commit');\n",
    "check(adoptionDiff === '', 'Runtime or tracked tests differ from the measured P6 commit');\n"
    + "const names = (/** @type {string} */ out) => out.trim().split(/\\r?\\n/).filter(Boolean);\n"
    + 'const bridges = {\n'
    + "  frozenToMain: names(git(['diff', '--name-only', FROZEN, MAIN_REFERENCE, '--', ...SITE])),\n"
    + "  measuredToInspected: names(git(['diff', '--name-only', MEASURED_NEW, inspected, '--', ...SITE])),\n"
    + "  mainToInspected: names(git(['diff', '--name-only', MAIN_REFERENCE, inspected, '--', ...SITE])),\n"
    + '};\n'
    + 'check(bridges.frozenToMain.length === 0 && bridges.measuredToInspected.length === 0\n'
    + "  && isDeepStrictEqual(bridges.mainToInspected, P6_FILES), 'the deployed-site bridge changed');\n"],
  ["git(['diff', stored.commits.new, BASE, '--', 'tools/record-fixtures.mjs'])",
    "git(['diff', stored.commits.new, inspected, '--', 'tools/record-fixtures.mjs'])"],
  ['  const snapshot = text(`tests/artifacts/ig-proto/tree-frozen/base/${p}`);\n'
    + '  check(lf(current) === lf(frozen) && lf(current) === lf(snapshot), `Deduction runtime closure differs: ${p}`);\n'
    + '  kernelClosure.push({ path: p, sha256Lf: sha(lf(current)), frozenCommit: FROZEN, currentEqualsFrozenAndP7Reference: true });\n',
  '  check(lf(current) === lf(frozen), `Deduction runtime closure differs: ${p}`);\n'
    + '  kernelClosure.push({ path: p, sha256Lf: sha(lf(current)), frozenCommit: FROZEN, currentEqualsFrozen: true });\n'],
  ["const p7Path = 'docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-full/p7.json';\n",
    "check(isDeepStrictEqual(kernelClosure.map((k) => k.path).sort(), NINE), 'the deduction closure is not the nine files');\n"
    + "const p7Path = 'docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-full/p7.json';\n"],
  ['for (const input of p7.meta.inputs) {\n'
    + '  check(sha(lf(text(input.path))) === input.sha256, `Changed P7 corpus/evidence input ${input.path}`);\n'
    + '}\n',
  "check(lf(text(p7Path)) === lf(execFileSync('git', ['--no-pager', 'show', `${PLAN}:${p7Path}`], { cwd: ROOT, encoding: 'utf8' })),\n"
    + "  'p7.json differs from the plan commit');\n"],
  [' sourceInputsChecked: p7.meta.inputs.length,', ''],
  ["  limitation: 'Historical P7 equality is reference-kernel corpus evidence, not a fresh P6 lean/full-rating run. '\n"
    + "    + 'The unchanged runtime closure supports adoption only; no P7 candidate is proposed for production.',\n",
  "  limitation: 'Context only: the historical 713-item P7 report is reference-kernel corpus evidence, not a fresh P6 run, '\n"
    + "    + 'and no P7 candidate is adopted. Its git-ignored raw inputs are not re-checked here.',\n"],
  ['const sourceFiles = [\n', 'const pv = provenanceVersions();\n'
    + 'const versions = { algo: pv.algo, policy: pv.policy, rng: pv.rng, model: pv.ratingModel, app: APP_VERSION };\n'
    + "check(isDeepStrictEqual(versions, { algo: 'gen-v3', policy: 'mixed-v3', rng: 'xoshiro128ss-v1', model: 'difficulty-v3', app: '1.0.0' }),\n"
    + "  'the version tuple changed');\n"
    + 'for (const f of fixtures.filter((x) => x.versions !== null)) {\n'
    + '  check(isDeepStrictEqual(f.versions, { algo: versions.algo, policy: versions.policy, rng: versions.rng, model: versions.model }),\n'
    + '    `fixture versions changed: ${f.path}`);\n'
    + '}\n'
    + 'const sourceFiles = [`${FEATURE}/plan.md`, \'tasks/improve-generating-v4/T14-p6-phase1-bench.md\', SELF];\n'
    + 'const unusedAnalysisList = [\n'],
  ["  feature: 'improve-generating-phase-1', reviewer: 'SA-Astra', base: baseCommit, branch, commits,\n",
    "  format: 'pentomino-phase1-adoption', version: 1, planCommit: PLAN, inspectedCommit: inspected, branch, commits,\n"
    + '  frozenCommit: FROZEN, measuredNewCommit: MEASURED_NEW, mainReference: MAIN_REFERENCE, versions, bridges,\n'
    + "  historical: 'T14 (826ce79): four publications, 70 rows, 35 equal pairs, 14 memory side-cells, 2,244.925 counted s; not re-run.',\n"
    + "  current: 'Source digest, bridges, nine-file closure, fixtures and versions checked at the inspected commit.',\n"],
  ['  equality, fixtures, fixtureVerification,\n', '  equality, fixtures,\n'],
  ['const write = (name, value) => writeFileSync(relative(process.cwd(), join(HERE, name)),\n'
    + "  `${lf(value).replace(/\\n*$/, '')}\\n`.replace(/\\n/g, '\\r\\n'), 'utf8');\n"
    + "write('phase1-audit.json', JSON.stringify(result, null, 2));\n",
  'const write = (name, value) => writeFileSync(join(HERE, name),\n'
    + "  `${lf(value).replace(/\\n*$/, '')}\\n`.replace(/\\n/g, '\\r\\n'), { encoding: 'utf8', flag: 'wx' });\n"
    + "write('adoption.json', JSON.stringify(result, null, 2));\n"],
  ["  '# Phase-1 source and evidence audit (SA-Astra)',\n", "  '# Phase-1 adoption record (P1-01)',\n"],
  ["  `Base: \\`${BASE}\\`; current measured-source digest \\`${currentDigest}\\` (${SOURCE_FILES.length} files), equal to T14's new source.`,\n",
    "  `Inspected commit \\`${inspected}\\` (plan \\`${PLAN}\\`); measured-source digest \\`${currentDigest}\\` (${SOURCE_FILES.length} files), equal to T14's new source \\`${MEASURED_NEW}\\`.`,\n"
    + "  `Deployed-site bridge: frozen \\`${FROZEN.slice(0, 7)}\\` equals main \\`${MAIN_REFERENCE.slice(0, 7)}\\`; main to inspected differs only in ${bridges.mainToInspected.join(', ')}. Versions: ${Object.values(versions).join(' / ')}.`,\n"],
  ["  'The historical full equality report is complete: 713/713 items, including the PM4 inputs and 16 memory observations. All 12 bound observation/corpus inputs still hash correctly.',\n",
    "  'The historical P7 equality report (713/713 items) is cited as context only.',\n"],
  ["  'node docs\\\\improve-generating-phase-1\\\\evidence\\\\sa-astra\\\\phase1-audit.mjs',\n",
    "  'node docs\\\\improve-generating-phase-1\\\\evidence\\\\adoption-reader.mjs',\n"],
  ['complete hashes and read-only Git commands in \\`phase1-audit.json\\`.`,', 'complete hashes and read-only Git commands in \\`adoption.json\\`.`,'],
  ["write('phase1-audit.md', md.join('\\n'));\n", "write('adoption.md', md.join('\\n'));\n"],
];

const original = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');
let text = original;
/** @type {string[]} */
const report = [];
for (const [find, replace] of EDITS) {
  const count = text.split(find).length - 1;
  if (count !== 1) throw new Error(`anchor occurs ${count} times: ${find.slice(0, 90)}`);
  text = text.replace(find, () => replace);
}
// The analysis-only blocks the list deletes: the reading list, its read loop and the projection.
for (const [start, end] of [['const unusedAnalysisList = [\n', 'for (const p of sourceFiles) text(p);\n'],
  ['const fixtureVerification = {\n', '};\n']]) {
  const i = text.indexOf(start);
  const j = text.indexOf(end, i);
  if (i < 0 || j < 0) throw new Error(`block not found: ${start.trim()}`);
  text = text.slice(0, i) + (start.startsWith('const unused') ? 'for (const p of sourceFiles) text(p);\n' : '') + text.slice(j + end.length);
}
text = text.replace(/console\.log\(JSON\.stringify\(\{ base: baseCommit[\s\S]*$/, () => 'console.log(`phase1-adoption: recorded ${inspected} '
  + '(${runs.length} rows, ${recomputed.identity.equal} equal pairs, ${memory.sideCells} memory side-cells)`);\n');
for (const gone of ['BASE', 'baseCommit', 'fixtureVerification', 'snapshot', 'phase1-audit', 'SA-Astra']) {
  if (text.includes(gone)) report.push(`- leftover \`${gone}\` in the edited copy`);
}

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(SCRATCH, { recursive: true });
try {
  writeFileSync(COPY, text.replace(/\n/g, '\r\n'));
  const first = spawnSync(process.execPath, [COPY], { cwd: ROOT, encoding: 'utf8' });
  const outputs = ['adoption.json', 'adoption.md'].map((n) => join(SCRATCH, n));
  const hashes = () => outputs.map((p) => { try { return sha(readFileSync(p)); } catch { return 'missing'; } }).join(' ');
  const before = hashes();
  const second = spawnSync(process.execPath, [COPY], { cwd: ROOT, encoding: 'utf8' });
  const after = hashes();
  const record = JSON.parse(readFileSync(outputs[0], 'utf8'));
  report.push(
    `- Edits applied: ${EDITS.length} anchored replacements plus two deleted analysis blocks; edited copy ${text.split('\n').length} lines,`
      + ` SHA-256 of its CRLF bytes \`${sha(text.replace(/\n/g, '\r\n'))}\` (location-independent: SELF is computed at run time).`,
    `- First run: exit ${first.status}; stdout \`${first.stdout.trim()}\`${first.stderr.trim() ? `; stderr ${first.stderr.trim().split('\n')[0]}` : ''}.`,
    `- Record: format ${record.format}, inspected ${record.inspectedCommit}, versions ${Object.values(record.versions).join('/')},`
      + ` bridges main-to-inspected ${record.bridges.mainToInspected.join(', ')}, closure ${record.equality.kernelClosure.length} files,`
      + ` rows ${record.bench.rows}, equal pairs ${record.bench.identity.equal}/${record.bench.identity.pairs},`
      + ` memory side-cells ${record.bench.memory.sideCells} (both checks pass: ${record.bench.memory.bothChecksPass}), inputs ${record.inputs.length}.`,
    `- Second run (write-once): exit ${second.status}; ${second.stderr.trim().split('\n').find((l) => l.startsWith('Error')) ?? ''}`
      .trimEnd() + `; outputs unchanged: ${before === after}.`,
  );
} finally {
  rmSync(SCRATCH, { recursive: true, force: true });
}
const md = ['# P1-01 edit list: scratch application (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-1\\evidence\\sa-opus\\p1-01-edit-proto.mjs` (unlocked; scratch copy in the',
  'git-ignored tests/artifacts/p1r/, removed afterwards; the historical phase1-audit.mjs is only read).', '', ...report, ''];
writeFileSync(join(HERE, 'p1-01-edit-proto.md'), md.join('\r\n'));
process.stdout.write(`${md.join('\n')}\n`);
