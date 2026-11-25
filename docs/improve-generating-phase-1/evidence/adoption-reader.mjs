// @ts-check
// improve-generating phase 1, P1-01: the source-bound adoption record (plan §4.4). Unlocked file and Git reads and
// pure report arithmetic only. node docs\improve-generating-phase-1\evidence\adoption-reader.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { computeSourceDigest, SOURCE_FILES } from '../../../tools/bench/report.js';
import { compareReports, readLedger, renderMarkdown } from '../../../tools/ig-proto/phase1/p6-bench.mjs';
import { provenanceVersions } from '../../../core/engine/generate.js';
import { APP_VERSION } from '../../../core/engine/version.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const SELF = relative(ROOT, fileURLToPath(import.meta.url)).split('\\').join('/');
const PLAN = 'eca0f94717a56de43c52f6cb54d739360670fef8';
const MEASURED_NEW = '27c6189e40bfe2000a454f755797c5745d7c2e84';
const MAIN_REFERENCE = 'b5eb85805f609af7deaa2489eb08675c60b2cc49';
const P6_DIGEST = 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4';
const SITE = ['index.html', 'redirect.js', 'sitemap.xml', 'assets', 'core', 'generator', 'player'];
const P6_FILES = ['core/engine/clues.js', 'core/engine/difficulty.js', 'core/engine/types.js'];
const NINE = ['deduce', 'dlx', 'geometry', 'levels', 'placements', 'policy', 'qualification', 'tiling', 'workspace']
  .map((n) => `core/engine/${n}.js`);
const OUT = ['adoption.json', 'adoption.md'].map((n) => join(HERE, n));
const FROZEN = '3fc65f4681a53d3984d9218c15efbf696cc3a1a5';
const FEATURE = 'docs/improve-generating-phase-1';
const EVIDENCE = 'docs/improve-generating/evidence/phase1/P6-bench';
const abs = (p) => join(ROOT, ...p.split('/'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const lf = (s) => s.replace(/\r\n/g, '\n');
const inputs = new Map();
const readBytes = (p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, bytes: b.length, sha256Raw: sha(b), sha256Lf: sha(lf(b.toString('utf8'))) });
  return b;
};
const text = (p) => readBytes(p).toString('utf8');
const json = (p) => JSON.parse(text(p));
const commands = [];
const git = (args) => {
  const out = execFileSync('git', ['--no-pager', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  commands.push({ command: ['git', '--no-pager', ...args], sha256Lf: sha(lf(out)), output: out.trim() });
  return out;
};
const check = (v, why) => { if (!v) throw new Error(why); };
check(OUT.every((p) => !existsSync(p)), 'adoption output exists; the record is written once');
const inspected = git(['rev-parse', 'HEAD']).trim();
git(['merge-base', '--is-ancestor', PLAN, inspected]);
check(git(['rev-parse', 'origin/main']).trim() === MAIN_REFERENCE, 'origin/main is not the main reference');
check(git(['status', '--porcelain', '--untracked-files=all', '--', ...SITE, 'tests', 'tools', 'package.json', '.github']).trim() === '',
  'tested paths have uncommitted or untracked changes');
const branch = git(['branch', '--show-current']).trim();
const stored = json(`${EVIDENCE}/compare.json`);
const ledger = readLedger(text(`${EVIDENCE}/ledger.jsonl`));
const reports = stored.reports.map((r) => {
  const entry = ledger.find((l) => l.group === r.group && l.side === r.side && l.exit === 0);
  check(entry !== undefined, `No successful invocation for ${r.group}/${r.side}`);
  const published = `${EVIDENCE}/${r.file}`;
  const bytes = readBytes(published);
  check(sha(bytes) === r.sha256 && sha(bytes) === entry.reportSha256, `Changed published report ${published}`);
  return {
    group: r.group, side: r.side, path: entry.report, bytes,
    mdPath: entry.report.replace(/\.json$/, '.md'),
    mdBytes: readBytes(published.replace(/\.json$/, '.md')),
  };
});
const recomputed = compareReports({ reports, ledger, pending: null, newCommit: stored.commits.new });
check(isDeepStrictEqual(recomputed, stored), 'P6 comparison no longer reproduces exactly from its four reports');
check(stored.commits.new === MEASURED_NEW, 'compare.json names another measured commit');
check(lf(renderMarkdown(recomputed)) === lf(text(`${EVIDENCE}/compare.md`)), 'compare.md does not re-render from the comparison');
const currentDigest = await computeSourceDigest(text);
check(currentDigest === stored.digests.new && currentDigest === P6_DIGEST, 'Current production benchmark digest differs from the measured P6 source');
const runtimeScope = ['core', 'generator', 'player', 'tools/bench', 'tools/calibrate.mjs', 'tools/node-worker.mjs', 'package.json'];
const sourceDiff = git(['diff', '--name-only', FROZEN, inspected, '--', ...runtimeScope]).trim().split(/\r?\n/).filter(Boolean);
check(isDeepStrictEqual(sourceDiff, ['core/engine/clues.js', 'core/engine/difficulty.js', 'core/engine/types.js']),
  'Unexpected production changes from the frozen source');
const adoptionDiff = git(['diff', '--name-only', stored.commits.new, inspected, '--', ...runtimeScope, 'tests']).trim();
check(adoptionDiff === '', 'Runtime or tracked tests differ from the measured P6 commit');
const names = (/** @type {string} */ out) => out.trim().split(/\r?\n/).filter(Boolean);
const bridges = {
  frozenToMain: names(git(['diff', '--name-only', FROZEN, MAIN_REFERENCE, '--', ...SITE])),
  measuredToInspected: names(git(['diff', '--name-only', MEASURED_NEW, inspected, '--', ...SITE])),
  mainToInspected: names(git(['diff', '--name-only', MAIN_REFERENCE, inspected, '--', ...SITE])),
};
check(bridges.frozenToMain.length === 0 && bridges.measuredToInspected.length === 0
  && isDeepStrictEqual(bridges.mainToInspected, P6_FILES), 'the deployed-site bridge changed');
const fixtureToolDiff = git(['diff', stored.commits.new, inspected, '--', 'tools/record-fixtures.mjs']).trim();
const commits = {
  p6: git(['log', '-1', '--format=%H %s', '--', 'core/engine/difficulty.js']).trim(),
  streaming: git(['log', '-1', '--format=%H %s', '--', 'tests/generator-controller.test.js', 'tests/generation-client.test.js']).trim(),
  benchmark: git(['log', '-1', '--format=%H %s', '--', 'tasks/improve-generating-v4/T14-p6-phase1-bench.md']).trim(),
};

// Prove the unchanged runtime dependency closure of the deduction entry point, not just its top-level file.
const kernelClosure = [];
const queued = ['core/engine/deduce.js'];
const visited = new Set();
while (queued.length > 0) {
  const p = queued.shift();
  if (visited.has(p)) continue;
  visited.add(p);
  const current = text(p);
  const frozen = execFileSync('git', ['--no-pager', 'show', `${FROZEN}:${p}`], { cwd: ROOT, encoding: 'utf8' });
  check(lf(current) === lf(frozen), `Deduction runtime closure differs: ${p}`);
  kernelClosure.push({ path: p, sha256Lf: sha(lf(current)), frozenCommit: FROZEN, currentEqualsFrozen: true });
  for (const match of current.matchAll(/^import[\s\S]*?\bfrom\s+['"]([^'"]+)['"];?/gm)) {
    if (match[1].startsWith('.')) queued.push(posix.normalize(posix.join(posix.dirname(p), match[1])));
  }
}
check(isDeepStrictEqual(kernelClosure.map((k) => k.path).sort(), NINE), 'the deduction closure is not the nine files');
const p7Path = 'docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-full/p7.json';
const p7 = json(p7Path);
check(p7.equal.verdict === 'equal' && p7.equal.items === 713 && p7.equal.ended === 713
  && p7.equal.equal === 713 && p7.equal.coverage.complete, 'Historical full-corpus equality evidence is not complete');
check(lf(text(p7Path)) === lf(execFileSync('git', ['--no-pager', 'show', `${PLAN}:${p7Path}`], { cwd: ROOT, encoding: 'utf8' })),
  'p7.json differs from the plan commit');
check(p7.equal.declared.reference.copyDigest === stored.digests.old, 'P7 reference is not the frozen reference');
const equality = {
  report: p7Path, declared: p7.equal.items, ended: p7.equal.ended, equal: p7.equal.equal,
  memoryObservations: p7.equal.coverage.memory.length, kernelClosure,
  limitation: 'Context only: the historical 713-item P7 report is reference-kernel corpus evidence, not a fresh P6 run, '
    + 'and no P7 candidate is adopted. Its git-ignored raw inputs are not re-checked here.',
};

const fixtures = ['generation-case.json', 'generated-sample-pack.json', 'replay-case.json'].map((name) => {
  const p = `tests/fixtures/${name}`;
  const d = json(p);
  const frozen = execFileSync('git', ['--no-pager', 'show', `${FROZEN}:${p}`], { cwd: ROOT, encoding: 'utf8' });
  check(sha(lf(frozen)) === inputs.get(p).sha256Lf, `Fixture changed from frozen source: ${p}`);
  return { path: p, sha256Lf: inputs.get(p).sha256Lf, unchangedFromFrozen: true, versions: d.versions ?? null,
    recipe: d.recipe ?? (name === 'generation-case.json' ? {
      seedText: d.seedText, batchSeed: d.batchSeed, levelId: d.levelId, uniqueness: d.uniqueness, quantity: d.quantity,
    } : null) };
});
const pv = provenanceVersions();
const versions = { algo: pv.algo, policy: pv.policy, rng: pv.rng, model: pv.ratingModel, app: APP_VERSION };
check(isDeepStrictEqual(versions, { algo: 'gen-v3', policy: 'mixed-v3', rng: 'xoshiro128ss-v1', model: 'difficulty-v3', app: '1.0.0' }),
  'the version tuple changed');
for (const f of fixtures.filter((x) => x.versions !== null)) {
  check(isDeepStrictEqual(f.versions, { algo: versions.algo, policy: versions.policy, rng: versions.rng, model: versions.model }),
    `fixture versions changed: ${f.path}`);
}
const sourceFiles = [`${FEATURE}/plan.md`, 'tasks/improve-generating-v4/T14-p6-phase1-bench.md', SELF];
for (const p of sourceFiles) text(p);
const cells = recomputed.cells.map((c) => ({
  cell: c.caseId, pairs: c.identity.pairs, equal: c.identity.equal,
  oldTen: c.old.tenOfN, newTen: c.new.tenOfN,
  t10: c.ratios.t10, response: c.ratios.response,
  oldProcess: c.old.checks.peakProcessMemory, newProcess: c.new.checks.peakProcessMemory,
  oldAccounted: c.old.checks.byteAccounting, newAccounted: c.new.checks.byteAccounting,
}));
const runs = reports.flatMap((r) => JSON.parse(Buffer.from(r.bytes).toString('utf8')).runs);
const memory = {
  processLimit: recomputed.memory.processLimitBytes, accountedLimit: recomputed.memory.accountedLimitBytes,
  processPeak: Math.max(...runs.map((r) => r.peakProcessBytes)),
  accountedPeak: Math.max(...runs.map((r) => r.peakAccountedBytes)),
  sideCells: cells.length * 2, bothChecksPass: recomputed.cells.every((c) =>
    ['old', 'new'].every((side) => Object.values(c[side].checks).every((x) => x.status === 'pass'))),
};
const result = {
  format: 'pentomino-phase1-adoption', version: 1, planCommit: PLAN, inspectedCommit: inspected, branch, commits,
  frozenCommit: FROZEN, measuredNewCommit: MEASURED_NEW, mainReference: MAIN_REFERENCE, versions, bridges,
  historical: 'T14 (826ce79): four publications, 70 rows, 35 equal pairs, 14 memory side-cells, 2,244.925 counted s; not re-run.',
  current: 'Source digest, bridges, nine-file closure, fixtures and versions checked at the inspected commit.',
  source: { currentDigest, measuredDigest: stored.digests.new, sourceFileCount: SOURCE_FILES.length,
    frozenProductionDiff: sourceDiff, runtimeAndTrackedTestsUnchangedFromMeasuredCommit: adoptionDiff === '', fixtureToolDiff },
  bench: { inputComparisonReproduced: true, oldCommit: stored.commits.old, newCommit: stored.commits.new,
    rows: runs.length, identity: recomputed.identity, cells, levels: recomputed.levels.map((l) => ({ level: l.level, response: l.ratios.response })),
    memory, ledger: recomputed.ledger, limitations: recomputed.limitations },
  equality, fixtures,
  scope: 'Unlocked source/evidence reads, hashes and pure statistics only. No rating, solving, generation, replay, tree build, '
    + 'npm test, fixture regeneration, browser run or measured request. New counted benchmark cost: 0.',
  commands, inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
const write = (name, value) => writeFileSync(relative(process.cwd(), join(HERE, name)),
  `${lf(value).replace(/\n*$/, '')}\n`.replace(/\n/g, '\r\n'), { encoding: 'utf8', flag: 'wx' });
write('adoption.json', JSON.stringify(result, null, 2));
const mib = (n) => (n / 1048576).toFixed(3);
const md = [
  '# Phase-1 adoption record (P1-01)',
  '',
  `Inspected commit \`${inspected}\` (plan \`${PLAN}\`); measured-source digest \`${currentDigest}\` (${SOURCE_FILES.length} files), equal to T14's new source \`${MEASURED_NEW}\`.`,
  `Deployed-site bridge: frozen \`${FROZEN.slice(0, 7)}\` equals main \`${MAIN_REFERENCE.slice(0, 7)}\`; main to inspected differs only in ${bridges.mainToInspected.join(', ')}. Versions: ${Object.values(versions).join(' / ')}.`,
  'Only the three P6 production files differ from the frozen source. Production, tracked tests and fixture bytes are unchanged from the measured P6 commit.',
  'The fixture-check tool has one later change: LF/CRLF-normalized comparison. No fixture or recipe was changed.',
  '',
  '## Existing benchmark, recomputed from its four bound publications',
  '',
  '| Cell | Equal pairs | Reached ten: old / new | Paired response ratio old/new (median) | Paired T10 ratio (median; n) |',
  '|---|---:|---|---:|---|',
  ...cells.map((c) => `| ${c.cell} | ${c.equal}/${c.pairs} | ${c.oldTen}/5 / ${c.newTen}/5 | ${c.response.median.toFixed(5)} | ${c.t10.median.toFixed(5)}; ${c.t10.n} |`),
  '',
  `Whole-process peak ${mib(memory.processPeak)} MiB / ${mib(memory.processLimit)}; accounted peak ${mib(memory.accountedPeak)} MiB / ${mib(memory.accountedLimit)}.`,
  `${memory.sideCells} side-cells pass both memory checks; model-too-large checks also pass. ${runs.length} rows, ${recomputed.identity.equal}/${recomputed.identity.pairs} equal pairs.`,
  `Historical ledger: ${recomputed.ledger.countedSeconds} counted s / ${recomputed.ledger.allowanceSeconds}; four successful invocations, not a new allowance.`,
  'These five-seed Node figures are descriptive, not browser qualification or a first-visible-puzzle service level.',
  '',
  '## Deduction and compatibility',
  '',
  `${kernelClosure.length} runtime dependency files of measureDeduction are byte-identical after LF normalization to frozen 3fc65f4 and the historical P7 reference.`,
  'The historical P7 equality report (713/713 items) is cited as context only.',
  equality.limitation,
  ...fixtures.map((f) => `- \`${f.path}\`: unchanged from the frozen source; LF SHA-256 \`${f.sha256Lf}\`.`),
  '',
  '## Reproduction and limitations',
  '',
  '```',
  'node docs\\improve-generating-phase-1\\evidence\\adoption-reader.mjs',
  '```',
  '',
  result.scope,
  `Input index: ${inputs.size} paths; SHA-256 \`${result.inputIndexHash}\`; complete hashes and read-only Git commands in \`adoption.json\`.`,
];
write('adoption.md', md.join('\n'));
console.log(`phase1-adoption: recorded ${inspected} (${runs.length} rows, ${recomputed.identity.equal} equal pairs, ${memory.sideCells} memory side-cells)`);
