// @ts-check
// SA-Opus, improve-generating phase 1, review of P1-01's outputs (SA-Astra, uncommitted on fce2f36): checks the
// committed-to-be adoption record against the plan's section 4.4 items and P1-01 step 5, re-hashes every indexed
// input, then runs an identical copy of the reader in the git-ignored folder tests/artifacts/p1r3/ (the depth of
// evidence/) at the same HEAD and compares its record with SA-Astra's, after mapping the copy's own path back.
// Unlocked reads, Git reads and pure report arithmetic only; no test runner, engine run or benchmark.
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-01-review.mjs
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const E = 'docs/improve-generating-phase-1/evidence';
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {string | Buffer} */ b) => createHash('sha256').update(b).digest('hex');
const lf = (/** @type {string} */ s) => s.replace(/\r\n/g, '\n');
const git = (/** @type {string[]} */ a) => execFileSync('git', ['--no-pager', ...a], { cwd: ROOT, encoding: 'utf8' }).trim();
/** @type {string[]} */
const out = [];
const row = (/** @type {string} */ name, /** @type {boolean} */ ok, /** @type {string} */ detail) => {
  out.push(`| ${name} | ${ok ? 'pass' : 'FAIL'} | ${detail} |`);
};

const head = git(['rev-parse', 'HEAD']);
const r = JSON.parse(readFileSync(abs(`${E}/adoption.json`), 'utf8'));
const mdText = readFileSync(abs(`${E}/adoption.md`), 'utf8');

// 1. Plan section 4.4, item 1: commits, digest, bridges.
row('commits and digest', r.format === 'pentomino-phase1-adoption' && r.version === 1
  && r.planCommit === 'eca0f94717a56de43c52f6cb54d739360670fef8' && r.inspectedCommit === head
  && r.frozenCommit === '3fc65f4681a53d3984d9218c15efbf696cc3a1a5' && r.measuredNewCommit === '27c6189e40bfe2000a454f755797c5745d7c2e84'
  && r.mainReference === 'b5eb85805f609af7deaa2489eb08675c60b2cc49'
  && r.source.currentDigest === 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4'
  && r.source.measuredDigest === r.source.currentDigest && r.source.sourceFileCount === 40,
`inspected ${r.inspectedCommit} (HEAD ${head}); digest ${r.source.currentDigest.slice(0, 12)}… of ${r.source.sourceFileCount} files`);
row('bridges', r.bridges.frozenToMain.length === 0 && r.bridges.measuredToInspected.length === 0
  && isDeepStrictEqual(r.bridges.mainToInspected, ['core/engine/clues.js', 'core/engine/difficulty.js', 'core/engine/types.js'])
  && isDeepStrictEqual(r.source.frozenProductionDiff, r.bridges.mainToInspected) && r.source.runtimeAndTrackedTestsUnchangedFromMeasuredCommit === true,
`frozen=main; measured=inspected; main to inspected ${r.bridges.mainToInspected.join(', ')}`);

// 2. Item 2: the four publications, ledger, comparison, identity, memory, counts, limits, conditions.
const pubs = ['old/A-2026-11-18', 'new/A-2026-11-18', 'new/B-2026-11-18', 'old/B-2026-11-18']
  .map((s) => `docs/improve-generating/evidence/phase1/P6-bench/${s}`);
const inputPaths = r.inputs.map((/** @type {any} */ i) => i.path);
row('four publications and their Markdown indexed', pubs.every((p) => inputPaths.includes(`${p}.json`) && inputPaths.includes(`${p}.md`))
  && ['compare.json', 'ledger.jsonl'].every((n) => inputPaths.includes(`docs/improve-generating/evidence/phase1/P6-bench/${n}`)),
`${pubs.length} JSON + ${pubs.length} Markdown publications, compare.json, ledger.jsonl`);
const b = r.bench;
const ten = b.cells.find((/** @type {any} */ c) => c.cell === '10x10-nightmare');
const nine = b.identity.list.filter((/** @type {any} */ x) => x.caseId === '10x10-nightmare' && x.oldAccepted === 9);
row('counts and identity', b.rows === 70 && b.identity.pairs === 35 && b.identity.equal === 35 && b.identity.differ === 0
  && b.identity.incomplete === 0 && b.cells.length === 7 && ten.oldTen === 4 && ten.newTen === 4
  && nine.length === 1 && nine[0].newAccepted === 9 && nine[0].category === 'equal' && nine[0].oldDigest === nine[0].newDigest,
`70 rows; 35/35 equal, 0 differ/incomplete; 10x10 ${ten.oldTen}/5 and ${ten.newTen}/5 ten; its 9/9 pair (rep ${nine[0]?.rep}) equal`);
row('memory', b.memory.processPeak === 589246464 && b.memory.processLimit === 1610612736 && b.memory.accountedPeak === 242014758
  && b.memory.accountedLimit === 1254096896 && b.memory.sideCells === 14 && b.memory.bothChecksPass === true,
`process ${b.memory.processPeak}/${b.memory.processLimit}; accounted ${b.memory.accountedPeak}/${b.memory.accountedLimit}; 14 side-cells pass`);
row('ledger and limitations', b.ledger.countedSeconds === 2244.925 && b.ledger.allowanceSeconds === 2700 && b.ledger.invocations === 4
  && Array.isArray(b.limitations) && b.limitations.length > 0,
`${b.ledger.countedSeconds} of ${b.ledger.allowanceSeconds} counted s, ${b.ledger.invocations} invocations; ${b.limitations.length} T14 limitations kept`);

// 3. Items 3-4: closure, fixtures, versions.
row('nine-file closure', r.equality.kernelClosure.length === 9 && r.equality.kernelClosure.every((/** @type {any} */ k) => k.currentEqualsFrozen === true)
  && r.equality.equal === 713 && r.equality.declared === 713 && !('sourceInputsChecked' in r.equality),
`${r.equality.kernelClosure.map((/** @type {any} */ k) => k.path.replace('core/engine/', '')).join(', ')}; P7 ${r.equality.equal}/${r.equality.declared} context`);
row('fixtures and versions', r.fixtures.length === 3 && r.fixtures.every((/** @type {any} */ f) => f.unchangedFromFrozen === true)
  && isDeepStrictEqual(r.versions, { algo: 'gen-v3', policy: 'mixed-v3', rng: 'xoshiro128ss-v1', model: 'difficulty-v3', app: '1.0.0' }),
`${r.fixtures.map((/** @type {any} */ f) => f.path.replace('tests/fixtures/', '')).join(', ')}; ${Object.values(r.versions).join(' / ')}`);

// 4. Items 5-6: historical/current, input index, reader identity, commands, limitations.
const reader = r.inputs.find((/** @type {any} */ i) => i.path === `${E}/adoption-reader.mjs`);
row('historical, current, reader, commands', typeof r.historical === 'string' && /not re-run/.test(r.historical)
  && typeof r.current === 'string' && reader?.sha256Raw === sha(readFileSync(abs(`${E}/adoption-reader.mjs`)))
  && reader?.sha256Raw === '9130200bae6301c1a6f7da2f75edcf919377a93379bcacbcb4dc67c10c3c6ecc' && r.commands.length > 0
  && r.commands.every((/** @type {any} */ c) => c.command[0] === 'git' && c.command[1] === '--no-pager'),
`reader indexed at ${reader?.sha256Raw.slice(0, 12)}…; ${r.commands.length} read-only Git commands; historical and current statements present`);
let rawOk = 0;
const bad = [];
for (const i of r.inputs) {
  const bytes = readFileSync(abs(i.path));
  if (sha(bytes) === i.sha256Raw && sha(lf(bytes.toString('utf8'))) === i.sha256Lf && bytes.length === i.bytes) rawOk += 1; else bad.push(i.path);
}
row('input index re-hashed', rawOk === r.inputs.length && r.inputs.length === 58 && sha(JSON.stringify(r.inputs)) === r.inputIndexHash,
  `${rawOk}/${r.inputs.length} raw and LF hashes and sizes match${bad.length ? `; differ: ${bad.join(', ')}` : ''}; inputIndexHash consistent`);
row('Markdown statements', mdText.includes(`Inspected commit \`${head}\``) && mdText.includes('Whole-process peak 561.949 MiB / 1536.000; accounted peak 230.803 MiB / 1196.000.')
  && mdText.includes('| 10x10-nightmare | 5/5 | 4/5 / 4/5 |') && mdText.includes('Historical ledger: 2244.925 counted s / 2700')
  && mdText.includes('not browser qualification') && mdText.includes('cited as context only') && mdText.includes(`\`${r.inputIndexHash}\``),
'inspected commit, memory, 10x10, ledger, browser limit, P7 context and input-index hash stated');

// 5. Determinism: an identical copy at the same HEAD gives the same record, apart from its own path.
const scratch = join(ROOT, 'tests', 'artifacts', 'p1r3');
rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch, { recursive: true });
try {
  copyFileSync(abs(`${E}/adoption-reader.mjs`), join(scratch, 'adoption-reader.mjs'));
  const run = spawnSync(process.execPath, [join(scratch, 'adoption-reader.mjs')], { cwd: ROOT, encoding: 'utf8' });
  const copyPath = 'tests/artifacts/p1r3/adoption-reader.mjs';
  const mapped = JSON.parse(readFileSync(join(scratch, 'adoption.json'), 'utf8').split(copyPath).join(`${E}/adoption-reader.mjs`));
  const strip = (/** @type {any} */ x) => { const y = structuredClone(x); delete y.inputIndexHash; return y; };
  const same = isDeepStrictEqual(strip(mapped), strip(r));
  const mdCopy = readFileSync(join(scratch, 'adoption.md'), 'utf8');
  const mdSame = lf(mdCopy).replace(/Input index: .*\n/, '') === lf(mdText).replace(/Input index: .*\n/, '');
  row('independent re-run at the same HEAD', run.status === 0 && same && mdSame,
    `exit ${run.status}; record equal apart from the copy's own path: ${same}; Markdown equal apart from the index-hash line: ${mdSame}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const md = ['# P1-01 adoption record: review checks (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-1\\evidence\\sa-opus\\p1-01-review.mjs` (unlocked; scratch removed).', '',
  '| Check | Result | Detail |', '|---|---|---|', ...out, ''];
writeFileSync(join(HERE, 'p1-01-review.md'), md.join('\r\n'));
process.stdout.write(`${md.join('\n')}\n`);
