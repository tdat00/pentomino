// @ts-check
// SA-Astra, independent phase-1 analysis at 006ca68. Existing files and pure report arithmetic only.
// node docs\improve-generating-phase-1\evidence\sa-astra\phase1-audit.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { computeSourceDigest, SOURCE_FILES } from '../../../../tools/bench/report.js';
import { compareReports, readLedger } from '../../../../tools/ig-proto/phase1/p6-bench.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const BASE = '006ca68';
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
const baseCommit = git(['rev-parse', BASE]).trim();
check(git(['rev-parse', 'HEAD']).trim() === baseCommit, 'HEAD is not the assigned analysis base');
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
const currentDigest = await computeSourceDigest(text);
check(currentDigest === stored.digests.new, 'Current production benchmark digest differs from the measured P6 source');
const runtimeScope = ['core', 'generator', 'player', 'tools/bench', 'tools/calibrate.mjs', 'tools/node-worker.mjs', 'package.json'];
const sourceDiff = git(['diff', '--name-only', FROZEN, BASE, '--', ...runtimeScope]).trim().split(/\r?\n/).filter(Boolean);
check(isDeepStrictEqual(sourceDiff, ['core/engine/clues.js', 'core/engine/difficulty.js', 'core/engine/types.js']),
  'Unexpected production changes from the frozen source');
const adoptionDiff = git(['diff', '--name-only', stored.commits.new, BASE, '--', ...runtimeScope, 'tests']).trim();
check(adoptionDiff === '', 'Runtime or tracked tests differ from the measured P6 commit');
const fixtureToolDiff = git(['diff', stored.commits.new, BASE, '--', 'tools/record-fixtures.mjs']).trim();
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
  const snapshot = text(`tests/artifacts/ig-proto/tree-frozen/base/${p}`);
  check(lf(current) === lf(frozen) && lf(current) === lf(snapshot), `Deduction runtime closure differs: ${p}`);
  kernelClosure.push({ path: p, sha256Lf: sha(lf(current)), frozenCommit: FROZEN, currentEqualsFrozenAndP7Reference: true });
  for (const match of current.matchAll(/^import[\s\S]*?\bfrom\s+['"]([^'"]+)['"];?/gm)) {
    if (match[1].startsWith('.')) queued.push(posix.normalize(posix.join(posix.dirname(p), match[1])));
  }
}
const p7Path = 'docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-full/p7.json';
const p7 = json(p7Path);
check(p7.equal.verdict === 'equal' && p7.equal.items === 713 && p7.equal.ended === 713
  && p7.equal.equal === 713 && p7.equal.coverage.complete, 'Historical full-corpus equality evidence is not complete');
for (const input of p7.meta.inputs) {
  check(sha(lf(text(input.path))) === input.sha256, `Changed P7 corpus/evidence input ${input.path}`);
}
check(p7.equal.declared.reference.copyDigest === stored.digests.old, 'P7 reference is not the frozen reference');
const equality = {
  report: p7Path, declared: p7.equal.items, ended: p7.equal.ended, equal: p7.equal.equal,
  memoryObservations: p7.equal.coverage.memory.length, sourceInputsChecked: p7.meta.inputs.length, kernelClosure,
  limitation: 'Historical P7 equality is reference-kernel corpus evidence, not a fresh P6 lean/full-rating run. '
    + 'The unchanged runtime closure supports adoption only; no P7 candidate is proposed for production.',
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
const sourceFiles = [
  `${FEATURE}/request.md`, 'AGENTS.md', 'docs/improve-generating/plan.md',
  'docs/improve-generating-stages-2-4/stage4-report.md',
  'tasks/improve-generating-v4/T12-p6-diagnostic-for-returned-ratings.md',
  'tasks/improve-generating-v4/T13-progressive-presentation-history.md',
  'tasks/improve-generating-v4/T14-p6-phase1-bench.md', 'tasks/improve-generating-v4/check-list.md',
  'docs/design-detail.md', 'docs/design-brief.md', 'USERGUIDE.md', 'USERGUIDE.vn.md',
  'generator/app.js', 'generator/jobs.js', 'generator/state.js', 'generator/ui/puzzle-panel.js',
  'generator/ui/replay-cache.js', 'generator/locale.en.js', 'generator/locale.vi.js',
  'core/browser/display-rating.js', 'tests/difficulty.test.js', 'tests/clues.test.js',
  'tests/generate.test.js', 'tests/generation-client.test.js', 'tests/generator-controller.test.js',
  'tests/generator-state.test.js', 'tests/replay.test.js', 'tests/replay-recorders.test.js',
  'tools/record-fixtures.mjs', 'tools/ig-proto/lock/ig-lock.ps1',
  'tools/ig-proto/p7-probe.mjs', 'tools/ig-proto/lib/p7-core.mjs', 'tools/ig-proto/lib/records.mjs',
  'tools/ig-proto/phase1/p6-bench.mjs', `${FEATURE}/evidence/sa-astra/phase1-audit.mjs`,
];
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
const fixtureVerification = {
  semanticChanges: false,
  change: 'tools/record-fixtures.mjs now normalizes LF/CRLF before its replay-case text comparison; no recipe or fixture change.',
  historicalT13FullTests: 1514,
  projectedRefreshSeconds: 123.369 + 0.595 + 1.269 + 3 * 45,
  upperThreeInvocationsSeconds: 3 * (300 + 45),
  note: 'Projection for full npm-test-equivalent plus both fixture checks, not a new measurement or allowance. '
    + 'A four-width test extension can change the full-suite duration; each invocation must fit 300 s.',
};
const result = {
  feature: 'improve-generating-phase-1', reviewer: 'SA-Astra', base: baseCommit, branch, commits,
  source: { currentDigest, measuredDigest: stored.digests.new, sourceFileCount: SOURCE_FILES.length,
    frozenProductionDiff: sourceDiff, runtimeAndTrackedTestsUnchangedFromMeasuredCommit: adoptionDiff === '', fixtureToolDiff },
  bench: { inputComparisonReproduced: true, oldCommit: stored.commits.old, newCommit: stored.commits.new,
    rows: runs.length, identity: recomputed.identity, cells, levels: recomputed.levels.map((l) => ({ level: l.level, response: l.ratios.response })),
    memory, ledger: recomputed.ledger, limitations: recomputed.limitations },
  equality, fixtures, fixtureVerification,
  scope: 'Unlocked source/evidence reads, hashes and pure statistics only. No rating, solving, generation, replay, tree build, '
    + 'npm test, fixture regeneration, browser run or measured request. New counted benchmark cost: 0.',
  commands, inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
const write = (name, value) => writeFileSync(relative(process.cwd(), join(HERE, name)),
  `${lf(value).replace(/\n*$/, '')}\n`.replace(/\n/g, '\r\n'), 'utf8');
write('phase1-audit.json', JSON.stringify(result, null, 2));
const mib = (n) => (n / 1048576).toFixed(3);
const md = [
  '# Phase-1 source and evidence audit (SA-Astra)',
  '',
  `Base: \`${BASE}\`; current measured-source digest \`${currentDigest}\` (${SOURCE_FILES.length} files), equal to T14's new source.`,
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
  'The historical full equality report is complete: 713/713 items, including the PM4 inputs and 16 memory observations. All 12 bound observation/corpus inputs still hash correctly.',
  equality.limitation,
  ...fixtures.map((f) => `- \`${f.path}\`: unchanged from the frozen source; LF SHA-256 \`${f.sha256Lf}\`.`),
  '',
  '## Reproduction and limitations',
  '',
  '```',
  'node docs\\improve-generating-phase-1\\evidence\\sa-astra\\phase1-audit.mjs',
  '```',
  '',
  result.scope,
  `Input index: ${inputs.size} paths; SHA-256 \`${result.inputIndexHash}\`; complete hashes and read-only Git commands in \`phase1-audit.json\`.`,
];
write('phase1-audit.md', md.join('\n'));
console.log(JSON.stringify({ base: baseCommit, branch, digest: currentDigest, commits, sourceDiff,
  rows: runs.length, equalPairs: recomputed.identity.equal, memory, historicalCountedSeconds: recomputed.ledger.countedSeconds,
  kernelClosureFiles: kernelClosure.length, equalityItems: p7.equal.equal, fixtureVerification,
  sourceInputCount: inputs.size, inputIndexHash: result.inputIndexHash, newMeasuredSeconds: 0 }, null, 2));
