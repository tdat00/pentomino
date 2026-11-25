// @ts-check
// Review-1 revision checks: task structure, source anchors and a disposable copy of the exact adoption reader.
// No engine, test runner or remote mutation. node docs\improve-generating-phase-1\evidence\sa-astra\pack-r1-checks.mjs
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { checkText } from '../../../../tools/check-conventions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
process.chdir(ROOT);
const HERE = 'docs\\improve-generating-phase-1\\evidence\\sa-astra';
const PACK = 'tasks\\improve-generating-phase-1';
const BASE = 'eca0f94717a56de43c52f6cb54d739360670fef8';
const SCRATCH = 'tests\\artifacts\\sa-astra-p1-pack-r1';
const expectedReader = '9130200bae6301c1a6f7da2f75edcf919377a93379bcacbcb4dc67c10c3c6ecc';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const lf = (s) => s.replace(/\r\n/g, '\n');
const inputs = new Map();
const read = (p) => {
  const b = readFileSync(p);
  inputs.set(p.replaceAll('\\', '/'), { path: p.replaceAll('\\', '/'), sha256Raw: sha(b), sha256Lf: sha(lf(b.toString('utf8'))) });
  return lf(b.toString('utf8'));
};
const git = (...args) => execFileSync('git', ['--no-pager', ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const checks = [];
const check = (v, name) => { if (!v) throw new Error(name); checks.push(name); };
const tasks = [
  ['P1-01', 'P1-01-source-bound-adoption.md', null, 'SA-Astra', 0],
  ['P1-02', 'P1-02-fold-width-eight.md', 'P1-01', 'Dev-Sonnet', 0.5],
  ['P1-03b', 'P1-03b-current-qualification.md', 'P1-02', 'The orchestrator', 0],
  ['P1-04', 'P1-04-readiness-and-pr-description.md', 'P1-03b', 'Dev-Sonnet', 1],
  ['P1-05', 'P1-05-publish-phase-one.md', 'P1-04', 'The orchestrator', 0],
];
const headings = ['Goal', 'Authority and fixed points', 'Scope', 'Steps', 'Tests', 'Documentation',
  'Commands and gates', 'Stop points and questions', 'Acceptance criteria', 'Checklist', 'Final report', 'Execution log'];
const fields = ['Feature, plan', 'Repository, branch, base', 'Depends on', 'Pack author / reviewer', 'Executor', 'Estimate'];
const execution = ['Start, end, duration', 'Waiting for rulings', 'Agent id, model',
  'Calls; input, output and cache-read tokens', 'AI credits', 'Questions and rulings', 'Fix rounds',
  'Gates re-run by the orchestrator', 'Commit', 'Issues and named items'];
check(git('rev-parse', 'HEAD').trim() === BASE, 'Task-pack revision inspected at assigned base');
check(git('branch', '--show-current').trim() === 'improve-generating', 'Assigned branch');
check(git('diff', '--exit-code', BASE, '--', '.').trim() === '', 'No tracked source, test, plan or evidence changed');
check(git('status', '--porcelain', '--untracked-files=all', '--', 'core', 'tests', 'tools', 'generator', 'player', 'assets', '.github', 'package.json').trim() === '',
  'No untracked/dirty production, test or tool paths');
const index = read(`${PACK}\\check-list.md`);
const plan = read('docs\\improve-generating-phase-1\\plan.md');
const textById = new Map();
check(readdirSync(PACK).filter((p) => /^P1-.*\.md$/.test(p)).length === 5, 'Five active task files');
check(!existsSync(`${PACK}\\P1-03a-qualification-reader.md`), 'P1-03a withdrawn');
for (const [id, file, dependency, executor, hours] of tasks) {
  const p = `${PACK}\\${file}`;
  const t = read(p);
  textById.set(id, t);
  const hs = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  check(JSON.stringify(hs) === JSON.stringify(headings), `${id}: all required sections once, in order`);
  for (const f of fields) check(t.includes(`| ${f} |`), `${id}: header ${f}`);
  check(t.includes(BASE) && t.includes('SA-Astra / SA-Opus'), `${id}: base and roles`);
  const ex = t.split('\n').find((l) => l.startsWith('| Executor |'));
  check(ex?.includes(executor), `${id}: assigned executor`);
  const dep = t.split('\n').find((l) => l.startsWith('| Depends on |'));
  const entry = index.split('\n').find((l) => l.startsWith(`- [ ] ${id} `));
  check(Boolean(entry) && (dependency === null || (entry.includes(dependency) && dep?.includes(dependency))), `${id}: dependency and index agree`);
  const log = t.slice(t.indexOf('## Execution log'));
  for (const f of execution) check(log.includes(`| ${f} |`), `${id}: execution field ${f}`);
  check(t.includes('### Business') && t.includes('### Technical') && t.includes(`| ${id}-B01 |`)
    && t.includes(`| ${id}-T01 |`), `${id}: business/technical acceptance tables`);
  check(t.includes('QUESTION:') && t.includes('G-PROTECTED') && t.includes('G-WORKTREE') && t.includes('G-FORMAT'),
    `${id}: fail-closed, scope and real format gates`);
  check(!/if needed|as appropriate|\bTODO\b|\bTBD\b/.test(t), `${id}: no unresolved discretionary placeholder`);
  check(!/qualification-reader\.mjs|check --stage|fold-width8\/index\.json|publication\.json|fork-point\.json/.test(t),
    `${id}: no withdrawn machinery`);
  check(hours <= 3, `${id}: developer estimate within task limit`);
}
for (let n = 1; n <= 8; n += 1) {
  const id = `D-P1-0${n}`;
  const row = plan.split('\n').find((l) => l.startsWith(`| ${id} |`));
  check(Boolean(row) && index.split('\n').includes(row), `Decision ${id} copied verbatim`);
}
for (const id of [...Array.from({ length: 4 }, (_, n) => `P1-B0${n + 1}`),
  ...Array.from({ length: 10 }, (_, n) => `P1-T${String(n + 1).padStart(2, '0')}`)]) {
  check(index.includes(id), `Traceability explicitly names ${id}`);
}
check(tasks.reduce((n, t) => n + t[4], 0) === 1.5 && index.includes('0.9 orchestrator hours'),
  'Estimates: developer 1.5 h, SA 1 h plus reviews, orchestrator 0.9 h');
check(index.includes('1,725 s') && index.includes('Exactly five engine/test invocations'), 'Same five-run ceiling');
check(index.includes('[Environment]::CurrentDirectory = (Get-Location).Path'), '.NET directory correction present');
check(index.includes('checkText') && index.includes('trailing whitespace') && index.includes('LF line endings, not CRLF'),
  'G-FORMAT checks docs/tasks and strict CRLF/trailing whitespace');
check(textById.get('P1-04').includes('metrics section (§7.1)') && textById.get('P1-04').includes('identical at one and four workers'),
  'PR wording corrects both factual findings');
check(textById.get('P1-02').includes('production guarantee in §8.2'), 'Pool-guarantee citation corrected');
const publish = textById.get('P1-05');
check((publish.match(/^\s+git --no-pager push origin /gm) ?? []).length === 1
  && (publish.match(/^\s+gh pr edit 11 /gm) ?? []).length === 1
  && (publish.match(/^\s+git --no-pager commit -m /gm) ?? []).length === 1,
  'One normal-flow bookkeeping commit, push and PR edit');
check(publish.includes('publication pending at') && publish.includes('index checkbox\n   pending at commit time'),
  'Bookkeeping does not preclaim a remote success');

const gen = read('tests\\generate.test.js');
const start = gen.indexOf("describe('deterministic parallel simulation', () => {");
const end = gen.indexOf("describe('recorded generation fixture', () => {", start);
const block = gen.slice(start, end);
const oldName = 'pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}';
const newName = 'pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}';
const oldWidth = 'for (const width of [1, 2, 3, 4]) {';
check(start >= 0 && end > start && block.split(oldName).length === 2 && block.split(oldWidth).length === 2,
  'Both test edit anchors unique within the approved block');
const updated = gen.slice(0, start) + block.replace(oldName, newName).replace(oldWidth, 'for (const width of [1, 2, 3, 4, 8]) {') + gen.slice(end);
check(updated.split('\n')[807].includes(newName) && updated.split('\n')[820].includes('[1, 2, 3, 4, 8]')
  && updated.split('\n')[419].includes(oldWidth), 'G-STAGE test line positions exact; other width loop unchanged');
execFileSync(process.execPath, ['--check', '--input-type=module'], { input: updated, encoding: 'utf8' });
checks.push('Proposed test source parses without execution');
const detail = read('docs\\design-detail.md');
check(detail.split('\n')[3075].includes('Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).'),
  'Specification replacement is on line 3076');
check(detail.split('\n')[2189].includes('any pool size (1–4)'), 'Production guarantee at §8.2 line 2190');
check(read('core\\browser\\worker-pool.js').includes('const MAX_POOL_SIZE = 4;'), 'Production pool cap remains four');
check(read('tests\\generation-client.test.js').includes('progressive presentation: accepted puzzles stream in slot order, the same at one and four workers'),
  'T13 client-test wording matches source');
check(read('docs\\improve-generating\\evidence\\frozen\\V4-S4F\\verdicts.md').includes('Phase 0: FAIL (control 26x26-nightmare: fail)'),
  'Original phase-0 FAIL preserved');

const prototype = read('docs\\improve-generating-phase-1\\evidence\\sa-opus\\p1-01-edit-proto.mjs');
const i = prototype.indexOf('const EDITS = [');
const j = prototype.indexOf('\n];', i) + 3;
check(i >= 0 && j > i, 'Review edit-list boundaries found without executing the prototype');
const edits = runInNewContext(`${prototype.slice(i, j)}\nEDITS;`, {}, { timeout: 1000 });
check(edits.length === 26, 'Exactly 26 review edits');
let reader = read(`${HERE}\\phase1-audit.mjs`);
const originalHash = inputs.get(`${HERE.replaceAll('\\', '/')}/phase1-audit.mjs`).sha256Raw;
for (const [find, replace] of edits) {
  check(reader.split(find).length === 2, `Unique review anchor ${checks.filter((x) => x.startsWith('Unique review anchor')).length + 1}`);
  reader = reader.replace(find, () => replace);
}
for (const [a, b] of [['const unusedAnalysisList = [\n', 'for (const p of sourceFiles) text(p);\n'],
  ['const fixtureVerification = {\n', '};\n']]) {
  const x = reader.indexOf(a);
  const y = reader.indexOf(b, x);
  check(x >= 0 && y > x, `Remove analysis block ${a.trim()}`);
  reader = reader.slice(0, x) + (a.startsWith('const unused') ? 'for (const p of sourceFiles) text(p);\n' : '') + reader.slice(y + b.length);
}
reader = reader.replace(/console\.log\(JSON\.stringify\(\{ base: baseCommit[\s\S]*$/, () => 'console.log(`phase1-adoption: recorded ${inspected} '
  + '(${runs.length} rows, ${recomputed.identity.equal} equal pairs, ${memory.sideCells} memory side-cells)`);\n');
check(sha(reader.replace(/\n/g, '\r\n')) === 'cfd0b9639f36293cf97e898a9d10d5f80ef58c62ba65e4c44a6595e379453137',
  'Unadapted reader exactly matches the review SHA');
reader = reader.replace('const write = (name, value) => writeFileSync(join(HERE, name),',
  'const write = (name, value) => writeFileSync(relative(process.cwd(), join(HERE, name)),');
const readerBytes = Buffer.from(reader.replace(/\n/g, '\r\n'));
check(sha(readerBytes) === expectedReader, 'Relative-write adaptation exactly matches the task SHA');
execFileSync(process.execPath, ['--check', '--input-type=module'], { input: reader, encoding: 'utf8' });
checks.push('Retargeted reader parses');
check(!existsSync(SCRATCH), 'Disposable owned reader folder absent before use');
mkdirSync(SCRATCH);
let adoption;
try {
  const copy = `${SCRATCH}\\adoption-reader.mjs`;
  writeFileSync(copy, readerBytes);
  const first = spawnSync(process.execPath, [copy], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  check(first.status === 0, `Disposable reader first run: exit ${first.status}; ${first.stderr.trim().split('\n')[0] ?? ''}`);
  const record = JSON.parse(readFileSync(`${SCRATCH}\\adoption.json`, 'utf8'));
  const hashOutputs = () => ['adoption.json', 'adoption.md'].map((p) => sha(readFileSync(`${SCRATCH}\\${p}`)));
  const before = hashOutputs();
  const second = spawnSync(process.execPath, [copy], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  check(second.status === 1 && second.stderr.includes('adoption output exists; the record is written once'),
    'Disposable reader second run refuses');
  check(JSON.stringify(before) === JSON.stringify(hashOutputs()), 'Refused second run changes neither output');
  check(record.bench.rows === 70 && record.bench.identity.equal === 35 && record.bench.memory.sideCells === 14
    && record.bench.memory.bothChecksPass && record.equality.kernelClosure.length === 9 && record.inputs.length === 58,
  'Reader reproduces 70/35/14, nine-file closure, 58 inputs');
  check(record.source.currentDigest === 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4',
    'Current measured-source digest unchanged');
  check(record.inputs.every((x) => !x.path.endsWith('tests/generate.test.js') && !x.path.endsWith('docs/design-detail.md')),
    'Later approved test/spec edit is not an immutable adoption-input byte binding');
  adoption = { stdout: first.stdout.trim(), refusal: 'adoption output exists; the record is written once',
    rows: record.bench.rows, equalPairs: record.bench.identity.equal, memory: record.bench.memory,
    kernelFiles: record.equality.kernelClosure.length, inputs: record.inputs.length, outputHashes: before,
    sourceDigest: record.source.currentDigest, inputsWereScratch: true };
} finally {
  rmSync(SCRATCH, { recursive: true, force: true });
}
check(!existsSync(SCRATCH), 'Owned reader scratch cleaned');
check(sha(readFileSync(`${HERE}\\phase1-audit.mjs`)) === originalHash, 'Historical audit unchanged');
read(relative(ROOT, fileURLToPath(import.meta.url)));
for (const p of [...tasks.map((t) => `${PACK}\\${t[1]}`), `${PACK}\\check-list.md`,
  relative(ROOT, fileURLToPath(import.meta.url))]) {
  const b = readFileSync(p);
  const t = b.toString('utf8');
  check(checkText(p, b).length === 0 && t.includes('\r\n') && !/[ \t]+$/m.test(lf(t)),
    `${p}: UTF-8 no BOM, CRLF, no trailing whitespace, final newline`);
}
check(git('diff', '--exit-code', BASE, '--', '.').trim() === '', 'All tracked files still untouched after checks');
const result = {
  base: BASE, command: 'node docs\\improve-generating-phase-1\\evidence\\sa-astra\\pack-r1-checks.mjs',
  tasks: tasks.map(([id, file, dependency, executor, developerHours]) => ({ id, file, dependency, executor, developerHours })),
  developerHours: 1.5, saHours: '1 plus joint reviews', orchestratorHours: 0.9, engineInvocations: 0,
  reviewEdits: edits.length, readerSha256: expectedReader, adoption, checkCount: checks.length, checks,
  scope: 'Task-pack validation only. The disposable adoption outputs are not the P1-01 deliverables and were removed.',
  inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
writeFileSync(`${HERE}\\pack-r1-checks.json`, `${JSON.stringify(result, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
console.log(JSON.stringify({ tasks: tasks.length, checks: checks.length, readerSha256: expectedReader,
  adoptionRowsPairsMemory: [70, 35, 14], inputs: inputs.size, engineInvocations: 0 }, null, 2));
