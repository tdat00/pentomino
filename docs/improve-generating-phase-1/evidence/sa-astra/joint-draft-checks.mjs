// @ts-check
// Data/syntax checks of the joint draft. The proposed test is changed only in memory and is never executed.
// node docs\improve-generating-phase-1\evidence\sa-astra\joint-draft-checks.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSourceDigest } from '../../../../tools/bench/report.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const F = 'docs/improve-generating-phase-1';
const abs = (p) => join(ROOT, ...p.split('/'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const inputs = new Map();
const read = (p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, sha256Raw: sha(b), sha256Lf: sha(b.toString('utf8').replace(/\r\n/g, '\n')) });
  return b.toString('utf8').replace(/\r\n/g, '\n');
};
const checks = [];
const check = (v, name) => {
  if (!v) throw new Error(name);
  checks.push(name);
};
const occurrences = (s, find) => s.split(find).length - 1;
const rowCount = (s, id) => [...s.matchAll(new RegExp(`^\\| ${id} \\|`, 'gm'))].length;
const source = read('tests/generate.test.js');
const start = source.indexOf("describe('deterministic parallel simulation', () => {");
const end = source.indexOf("describe('recorded generation fixture', () => {", start);
check(start >= 0 && end > start, 'The planned simulation block exists');
const block = source.slice(start, end);
const oldName = 'pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}';
const newName = 'pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}';
const oldLoop = 'for (const width of [1, 2, 3, 4]) {';
const newLoop = 'for (const width of [1, 2, 3, 4, 8]) {';
check(occurrences(block, oldName) === 1 && occurrences(block, oldLoop) === 1, 'Each planned test edit has one anchor in its block');
check(block.includes("[['fixture-set-0', ''], ['fixture-set-1', ' (slow)']]")
  && block.includes("for (const order of ['a', 'b', 'c'])") && block.includes('quantity: 5,'),
'Both seed cases, three orders and quantity five are present');
check(!block.includes('createPool(') && block.includes('puzzleCandidate(frozen, done.slot, done.attempt)')
  && block.includes('width - inflight.length'), 'The simulation uses the real candidate and an uncapped logical lane count, not the production pool');
const changed = block.replace(oldName, newName).replace(oldLoop, newLoop);
const proposed = source.slice(0, start) + changed + source.slice(end);
check(proposed.slice(0, start) === source.slice(0, start)
  && proposed.endsWith(source.slice(end)), 'The proposed edit leaves all other tests untouched');
execFileSync(process.execPath, ['--check', '--input-type=module'], { cwd: ROOT, input: proposed, encoding: 'utf8' });
checks.push('The in-memory proposed test file passes Node syntax checking; no test ran');

const detail = read('docs/design-detail.md');
const oldDoc = 'Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).';
check(occurrences(detail, oldDoc) === 1, 'The test-table sentence has exactly one anchor');
check(detail.includes('with any pool size (1–4)'), 'The separate production width guarantee remains 1-4');
const pool = read('core/browser/worker-pool.js');
check(pool.includes('export const MAX_POOL_SIZE = 4;')
  && pool.includes('size > MAX_POOL_SIZE'), 'Production still rejects width eight');
const digest = await computeSourceDigest(read);
check(digest === 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4',
  'The measured P6 source digest is still unchanged');

const report = read(`${F}/report.md`);
const plan = read(`${F}/plan.md`);
const questions = read(`${F}/clarifications.md`);
const request = read(`${F}/request.md`);
const reportSummary = report.split('## Summary\n')[1]?.split('## 1.')[0].trim().split('\n') ?? [];
check(reportSummary.length > 0 && reportSummary.length <= 10, 'The joint report opens with at most ten summary lines');
check(plan.includes('Status: Draft (round 1)'), 'Plan status is Draft (round 1)');
check(questions.trim() === '# Clarifications: improve-generating phase 1\n\nNo open questions.', 'Clarifications contains no unanswered owner question/default');
check(request.includes('vậy cần tách 2 PR cho 2 phase này.')
  && request.includes('branch `gen-v4` and base `main`'),
  'The superseding two-PR instruction and owner-selected branch/base are recorded');
check(plan.includes('`gen-v4` from that point, not from `main`')
  && plan.includes("Phase 1's last task:") && plan.includes('initially includes phase-1 commits'),
  'Branch origin, PR base, phase-one last task and inherited prefix are explicit');
check(!plan.includes('Keep the same unmerged PR.') && !report.includes('The owner directed phases 1 and 2 into one PR'),
  'No superseded active one-PR route remains');
for (const id of ['D-P1-01', 'D-P1-02', 'D-P1-03', 'D-P1-04', 'D-P1-05', 'D-P1-06', 'D-P1-07', 'D-P1-08']) {
  check(rowCount(plan, id) === 1, `${id} has one decision row`);
}
for (const id of ['P1-01', 'P1-02', 'P1-03', 'P1-04', 'P1-05']) {
  check(rowCount(plan, id) === 1, `${id} has one ordered task row`);
}
check(plan.includes('Do not use `-AllowExit1`') && plan.includes('Every command must exit 0'),
  'Qualification explicitly fails closed');
check(plan.includes('Do not describe that summary') && plan.includes('30 simulation comparisons'),
  'The simulation evidence strength is stated accurately');
check(plan.includes('never merge') || plan.includes('Never merge') || plan.includes('never merge.'),
  'No-merge is an explicit task boundary');
check(plan.includes('Do not claim empty PR status checks are a green CI run')
  && plan.includes('do not\ndispatch it for PR validation'), 'The deployment workflow is not used as a PR check');
check(source === read('tests/generate.test.js') && detail === read('docs/design-detail.md'),
  'Production test/spec files were not written');
for (const p of [
  `${F}/sa-astra/round-1-analysis.md`, `${F}/sa-astra/round-1-cross-review.md`,
  `${F}/sa-opus/round-1-analysis.md`, `${F}/sa-opus/round-1-cross-review.md`,
  `${F}/evidence/sa-astra/joint-draft-checks.mjs`, '.github/workflows/pages.yml',
]) read(p);
const result = {
  status: 'draft checks pass', base: 'c63c553', sourceBase: '006ca68', digest,
  checks, proposedComparisons: 2 * 5 * 3, proposedTestExecuted: false, newEngineRuns: 0,
  originalTestSha256Lf: sha(source), proposedTestSha256Lf: sha(proposed),
  reportSha256Lf: sha(report), planSha256Lf: sha(plan),
  inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
writeFileSync(relative(process.cwd(), abs(`${F}/evidence/sa-astra/joint-draft-checks.json`)),
  `${JSON.stringify(result, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
console.log(JSON.stringify({ status: result.status, checks: checks.length, inputCount: inputs.size,
  digest, proposedComparisons: result.proposedComparisons, proposedTestExecuted: false,
  newEngineRuns: 0, reportSha256Lf: result.reportSha256Lf, planSha256Lf: result.planSha256Lf }, null, 2));
