// @ts-check
// Task-pack structure, existing API and data/anchor checks. No proposed task or engine run is executed.
// node docs\improve-generating-phase-1\evidence\sa-astra\pack-contract-checks.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSourceDigest, SOURCE_FILES } from '../../../../tools/bench/report.js';
import { readLedger, compareReports, renderMarkdown } from '../../../../tools/ig-proto/phase1/p6-bench.mjs';
import { stampSite } from '../../../../tools/stamp-version.mjs';
import { checkSite } from '../../../../tools/check-site.mjs';
import { provenanceVersions } from '../../../../core/engine/generate.js';
import { APP_VERSION } from '../../../../core/engine/version.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-phase-1/evidence/sa-astra';
const PACK = 'tasks/improve-generating-phase-1';
const BASE = 'eca0f94717a56de43c52f6cb54d739360670fef8';
const abs = (p) => join(ROOT, ...p.split('/'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const inputs = new Map();
const read = (p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, sha256Raw: sha(b), sha256Lf: sha(b.toString('utf8').replace(/\r\n/g, '\n')) });
  return b.toString('utf8').replace(/\r\n/g, '\n');
};
const git = (args) => execFileSync('git', ['--no-pager', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const checks = [];
const check = (v, name) => { if (!v) throw new Error(name); checks.push(name); };
const tasks = [
  ['P1-01', 'P1-01-source-bound-adoption.md', 3, 'Dev-Sonnet'],
  ['P1-02', 'P1-02-fold-width-eight.md', 0.5, 'Dev-Sonnet'],
  ['P1-03a', 'P1-03a-qualification-reader.md', 2.5, 'Dev-Sonnet'],
  ['P1-03b', 'P1-03b-current-qualification.md', 0, 'the orchestrator'],
  ['P1-04', 'P1-04-readiness-and-pr-description.md', 1, 'Dev-Sonnet'],
  ['P1-05', 'P1-05-publish-phase-one.md', 0, 'the orchestrator'],
];
const dependencies = { 'P1-01': [], 'P1-02': ['P1-01'], 'P1-03a': ['P1-02'],
  'P1-03b': ['P1-03a'], 'P1-04': ['P1-03b'], 'P1-05': ['P1-04'] };
const headings = ['Goal', 'Authority and fixed points', 'Scope', 'Steps', 'Tests', 'Documentation',
  'Commands and gates', 'Stop points and questions', 'Acceptance criteria', 'Checklist', 'Final report', 'Execution log'];
const fields = ['Feature, plan', 'Repository, branch, base', 'Depends on', 'Pack author / reviewer', 'Executor', 'Estimate'];
const execution = ['Start, end, duration', 'Waiting for rulings', 'Agent id, model',
  'Calls; input, output and cache-read tokens', 'AI credits', 'Questions and rulings', 'Fix rounds',
  'Gates re-run by the orchestrator', 'Commit', 'Issues and named items'];
const index = read(`${PACK}/check-list.md`);
check(git(['rev-parse', 'eca0f94']).trim() === BASE, 'Named pack base resolves exactly');
const taskTexts = [];
for (const [id, file, hours, executor] of tasks) {
  const s = read(`${PACK}/${file}`);
  taskTexts.push({ id, file, text: s });
  let prev = -1;
  for (const h of headings) {
    const matches = [...s.matchAll(new RegExp(`^## ${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?$`, 'gm'))];
    check(matches.length === 1 && matches[0].index > prev, `${id}: one ordered ${h} section`);
    prev = matches[0].index;
  }
  for (const f of fields) check(s.includes(`| ${f} |`), `${id}: header ${f}`);
  check(s.includes('`eca0f94`') && s.includes('SA-Astra / SA-Opus'), `${id}: base/architect roles`);
  const executorLine = s.split('\n').find((l) => l.startsWith('| Executor |')) ?? '';
  check(executorLine.includes(executor), `${id}: executor`);
  const depLine = s.split('\n').find((l) => l.startsWith('| Depends on |')) ?? '';
  const indexLine = index.split('\n').find((l) => l.startsWith(`- [ ] ${id} `)) ?? '';
  for (const dep of dependencies[id]) {
    check(depLine.includes(dep) && indexLine.includes(dep), `${id}: prerequisite ${dep} agrees with the index`);
    check(tasks.findIndex((t) => t[0] === dep) < tasks.findIndex((t) => t[0] === id), `${id}: prerequisite is earlier in serial order`);
  }
  check(hours <= 3 && s.includes(`developer ${hours} h`), `${id}: estimate at most three developer hours`);
  const log = s.slice(s.indexOf('## Execution log'));
  for (const f of execution) check(log.includes(`| ${f} |`), `${id}: execution field ${f}`);
  check(s.includes('### Business') && s.includes('### Technical') && s.includes(`| ${id}-B01 |`)
    && s.includes(`| ${id}-T01 |`), `${id}: measurable AC tables`);
  check(s.includes('QUESTION:') && s.includes('G-PROTECTED') && s.includes('G-WORKTREE'), `${id}: stops and guards`);
  check(index.includes(`- [ ] ${id} `) && index.includes(`\`${file}\``), `${id}: indexed once with file`);
  check(!/if needed|as appropriate|\bTODO\b|\bTBD\b/.test(s), `${id}: no unresolved discretionary placeholder`);
  check(!/^---\|/m.test(s), `${id}: no malformed table separator`);
}
for (const id of ['D-P1-01', 'D-P1-02', 'D-P1-03', 'D-P1-04', 'D-P1-05', 'D-P1-06', 'D-P1-07', 'D-P1-08']) {
  check(index.includes(`| ${id} |`), `Decision register contains ${id}`);
}
for (const id of [...Array.from({ length: 4 }, (_, i) => `P1-B0${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `P1-T${String(i + 1).padStart(2, '0')}`)]) {
  check(index.includes(id), `Traceability names ${id}`);
}
check(tasks.reduce((n, t) => n + t[2], 0) === 7, 'Developer total is seven hours');
check(index.includes('1,725-second') && index.includes('five locked'), 'Five-invocation envelope retained');
check(typeof readLedger === 'function' && typeof compareReports === 'function' && typeof renderMarkdown === 'function'
  && typeof stampSite === 'function' && typeof checkSite === 'function', 'All named existing data/static APIs are exported');
const p = provenanceVersions();
const versions = { algo: p.algo, policy: p.policy, rng: p.rng, model: p.ratingModel, app: APP_VERSION };
check(JSON.stringify(versions) === JSON.stringify({ algo: 'gen-v3', policy: 'mixed-v3', rng: 'xoshiro128ss-v1', model: 'difficulty-v3', app: '1.0.0' }),
  'provenanceVersions mapping matches the actual API');
const digest = await computeSourceDigest(read);
check(digest === 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4'
  && SOURCE_FILES.length === 40, 'Measured production source unchanged');

const generated = read('tests/generate.test.js');
const begin = generated.indexOf("describe('deterministic parallel simulation', () => {");
const end = generated.indexOf("describe('recorded generation fixture', () => {", begin);
const part = generated.slice(begin, end);
const oldName = 'pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}';
const oldWidth = 'for (const width of [1, 2, 3, 4]) {';
check(begin >= 0 && end > begin && part.split(oldName).length === 2 && part.split(oldWidth).length === 2,
  'P1-02 replacements are each unique in their block');
const changed = generated.slice(0, begin) + part.replace(oldName, 'pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}')
  .replace(oldWidth, 'for (const width of [1, 2, 3, 4, 8]) {') + generated.slice(end);
execFileSync(process.execPath, ['--check', '--input-type=module'], { cwd: ROOT, input: changed, encoding: 'utf8' });
checks.push('Proposed test source parses without executing it');
const detail = read('docs/design-detail.md');
check(detail.split('Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).').length === 2,
  'P1-02 documentation anchor is unique');
const actualTests = [...globSync('tests/**/*.test.js', { cwd: ROOT })].map((s) => s.replaceAll('\\', '/')).sort();
const trackedTests = git(['ls-files', '-z', '--', 'tests']).split('\0').filter((s) => s.endsWith('.test.js')).sort();
check(JSON.stringify(actualTests) === JSON.stringify(trackedTests), 'Node test glob matches tracked test inputs at the base');

const h = 'docs/improve-generating/evidence/phase1/P6-bench';
const comparison = JSON.parse(read(`${h}/compare.json`));
check(renderMarkdown(comparison).replace(/\r\n/g, '\n') === read(`${h}/compare.md`), 'Existing comparison Markdown reproduces');
for (const entry of comparison.reports) {
  const pp = `${h}/${entry.file}`;
  read(pp);
  check(inputs.get(pp).sha256Raw === entry.sha256, `Bound report bytes exist: ${entry.file}`);
  read(pp.replace(/\.json$/, '.md'));
}
read(`${h}/ledger.jsonl`);
read('tools/ig-proto/phase1/p6-bench.mjs');
read('tools/stamp-version.mjs');
read('tools/check-site.mjs');
read('tools/ig-proto/lock/ig-lock.ps1');
read('docs/improve-generating-phase-1/evidence/sa-opus/p1-run.mjs');
read('docs/improve-generating-phase-1/plan.md');
read(`${HERE}/pack-contract-checks.mjs`);
const result = { base: BASE, tasks: tasks.map(([id, file, developerHours, executor]) => ({ id, file, developerHours, executor })),
  developerHours: 7, checkCount: checks.length, checks, sourceDigest: digest, versions, nodeTestFiles: actualTests.length,
  proposedTestExecuted: false, newEngineRuns: 0, inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()] };
writeFileSync(relative(process.cwd(), abs(`${HERE}/pack-contract-checks.json`)),
  `${JSON.stringify(result, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
console.log(JSON.stringify({ base: BASE, tasks: tasks.length, developerHours: 7, checks: checks.length,
  inputCount: inputs.size, nodeTestFiles: actualTests.length, sourceDigest: digest, newEngineRuns: 0 }, null, 2));
