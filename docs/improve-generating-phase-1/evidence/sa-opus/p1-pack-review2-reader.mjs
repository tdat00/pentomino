// @ts-check
// SA-Opus, improve-generating phase 1, review 2 of the task pack (review-2.md): checks P1-01 as revised. It rebuilds
// the edited reader from the review-1 edit list exactly as cited (p1-01-edit-proto.mjs, lines 22-144), applies
// P1-01's one extra writer replacement, compares both SHA-256 values with the pack, runs the adapted reader in the
// git-ignored folder tests/artifacts/p1r2/, at the depth of evidence/ (first from Q:\git, a different
// working directory, then from the repository: write-once), checks the record fields that P1-03b and P1-04 read, runs
// the pack's strict G-FORMAT on the reader and both outputs, and removes the folder. The prototype and the historical
// audit script are only read. Unlocked reads, Git reads and pure report arithmetic; no test runner or engine run.
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-pack-review2-reader.mjs
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const PROTO = join(HERE, 'p1-01-edit-proto.mjs');
const SOURCE = join(ROOT, 'docs', 'improve-generating-phase-1', 'evidence', 'sa-astra', 'phase1-audit.mjs');
const SCRATCH = join(ROOT, 'tests', 'artifacts', 'p1r2'); // three levels, the depth of evidence/
const READER = join(SCRATCH, 'adoption-reader.mjs');
const sha = (/** @type {string | Buffer} */ b) => createHash('sha256').update(b).digest('hex');
const crlf = (/** @type {string} */ s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
/** @type {string[]} */
const out = [];
const row = (/** @type {string} */ name, /** @type {boolean} */ ok, /** @type {string} */ detail) => {
  out.push(`| ${name} | ${ok ? 'pass' : 'FAIL'} | ${detail} |`);
};

// 1. The cited prototype lines: EDITS 22-124, the apply loop 126-134, the deletions 135-142, the final line 143-144.
const lines = readFileSync(PROTO, 'utf8').replace(/\r\n/g, '\n').split('\n');
const at = (/** @type {number} */ n) => lines[n - 1];
row('prototype line ranges', at(22) === 'const EDITS = [' && at(124) === '];'
  && at(135).startsWith('// The analysis-only blocks') && at(143).startsWith('text = text.replace(/console')
  && at(145).startsWith('for (const gone of'),
`EDITS 22-124; deletions 135-142; final line 143-144; line 145 starts the leftover check and 146-163 are the scratch runner (P1-01 cites "22-144" for EDITS and "146-163" for the deletions/final line)`);
const build = new Function('readFileSync', 'SOURCE', `${lines.slice(21, 144).join('\n')}\nreturn text;`);
const edited = /** @type {string} */ (build(readFileSync, SOURCE));
const unadapted = sha(crlf(edited));
row('review-1 edited reader', unadapted === 'cfd0b9639f36293cf97e898a9d10d5f80ef58c62ba65e4c44a6595e379453137',
  `${edited.split('\n').length} lines; SHA-256 ${unadapted}`);
const find = 'const write = (name, value) => writeFileSync(join(HERE, name),';
const adapted = edited.replace(find, 'const write = (name, value) => writeFileSync(relative(process.cwd(), join(HERE, name)),');
row('P1-01 writer replacement anchor', edited.split(find).length === 2, 'exactly one occurrence');
const adaptedSha = sha(crlf(adapted));
row('P1-01 adapted reader', adaptedSha === '9130200bae6301c1a6f7da2f75edcf919377a93379bcacbcb4dc67c10c3c6ecc',
  `${adapted.split('\n').length} lines; SHA-256 ${adaptedSha}`);

// 2. Run the adapted reader: first from Q:\git (another working directory), then again from the repository.
rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(SCRATCH, { recursive: true });
try {
  writeFileSync(READER, crlf(adapted));
  const outputs = ['adoption.json', 'adoption.md'].map((n) => join(SCRATCH, n));
  const hashes = () => outputs.map((p) => { try { return sha(readFileSync(p)); } catch { return 'missing'; } }).join(' ');
  const first = spawnSync(process.execPath, [READER], { cwd: join(ROOT, '..'), encoding: 'utf8' });
  row('first run from Q:\\git (relative writes)', first.status === 0 && !hashes().includes('missing'),
    `exit ${first.status}; \`${first.stdout.trim()}\`${first.stderr.trim() ? `; ${first.stderr.trim().split('\n').find((l) => l.startsWith('Error')) ?? ''}` : ''}`);
  const before = hashes();
  const second = spawnSync(process.execPath, [READER], { cwd: ROOT, encoding: 'utf8' });
  row('second run from the repository (write-once)', second.status === 1 && before === hashes()
    && second.stderr.includes('adoption output exists; the record is written once'),
  `exit ${second.status}; outputs unchanged: ${before === hashes()}`);

  // 3. The fields that P1-03b block A and P1-04 step 2 read.
  const r = JSON.parse(readFileSync(outputs[0], 'utf8'));
  const cell = r.bench.cells[0];
  const m = r.bench.memory;
  row('fields read by P1-03b and P1-04', r.format === 'pentomino-phase1-adoption' && r.version === 1
    && r.source.currentDigest === 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4'
    && ['cell', 'oldTen', 'newTen', 'equal', 'pairs'].every((k) => k in cell) && typeof cell.response.median === 'number'
    && r.bench.cells.length === 7 && Array.isArray(r.bridges.mainToInspected),
  `format ${r.format}; source.currentDigest; bench.cells x${r.bench.cells.length} with cell/oldTen/newTen/equal/pairs/response.median; bridges`);
  row('memory figures in P1-01 step 5', m.processPeak === 589246464 && m.processLimit === 1610612736
    && m.accountedPeak === 242014758 && m.accountedLimit === 1254096896 && m.sideCells === 14 && m.bothChecksPass === true,
  `process ${m.processPeak} of ${m.processLimit}; accounted ${m.accountedPeak} of ${m.accountedLimit}; side-cells ${m.sideCells}; both pass ${m.bothChecksPass}`);
  const ten = r.bench.cells.find((/** @type {any} */ c) => c.cell === '10x10-nightmare');
  row('10x10 and totals', ten.oldTen === 4 && ten.newTen === 4 && r.bench.rows === 70 && r.bench.identity.equal === 35,
    `10x10 ${ten.oldTen}/5 and ${ten.newTen}/5; rows ${r.bench.rows}; equal ${r.bench.identity.equal}/${r.bench.identity.pairs}`);

  // 4. The pack's strict G-FORMAT (check-list §3.3) on the reader and both outputs.
  const gformat = "import { readFileSync } from 'node:fs'; import { checkText } from './tools/check-conventions.mjs'; let bad = 0; for (const f of process.argv.slice(1)) { const b = readFileSync(f); const t = b.toString('utf8'); const p = checkText(f, b); if (b.includes(10) && !t.includes('\\r\\n')) p.push(f + ': LF line endings, not CRLF'); t.replace(/\\r\\n/g, '\\n').split('\\n').forEach((l, i) => { const m = f + ':' + (i + 1) + ': trailing whitespace'; if (/[ \\t]+$/.test(l) && !p.includes(m)) p.push(m); }); for (const x of p) { console.error(x); bad += 1; } } console.log(bad ? 'format: ' + bad + ' problem(s)' : 'format: OK (' + (process.argv.length - 1) + ' files)'); process.exitCode = bad ? 1 : 0;";
  const fmt = spawnSync(process.execPath, ['--input-type=module', '-e', gformat, READER, ...outputs], { cwd: ROOT, encoding: 'utf8' });
  row('strict G-FORMAT on the reader and both outputs', fmt.status === 0, `exit ${fmt.status}; ${fmt.stdout.trim()}${fmt.stderr.trim() ? `; ${fmt.stderr.trim()}` : ''}`);
} finally {
  rmSync(SCRATCH, { recursive: true, force: true });
}

const md = ['# Phase-1 task pack, review 2: P1-01 reader checks (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-1\\evidence\\sa-opus\\p1-pack-review2-reader.mjs` (unlocked; scratch removed).', '',
  '| Check | Result | Detail |', '|---|---|---|', ...out, ''];
writeFileSync(join(HERE, 'p1-pack-review2-reader.md'), md.join('\r\n'));
process.stdout.write(`${md.join('\n')}\n`);
