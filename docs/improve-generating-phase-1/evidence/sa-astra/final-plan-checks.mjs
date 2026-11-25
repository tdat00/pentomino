// @ts-check
// Finalization checks only: no test, solver, generation, replay, branch or PR operation.
// node docs\improve-generating-phase-1\evidence\sa-astra\final-plan-checks.mjs
import { createHash } from 'node:crypto';
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
const plan = read(`${F}/plan.md`);
const report = read(`${F}/report.md`);
const review = read(`${F}/sa-opus/review-report-plan.md`);
const questions = read(`${F}/clarifications.md`);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
check(plan.includes('Status: Final (2026-11-25, base c63c553)'), 'Final plan status and base');
check(report.includes('Final joint report, accepted by SA-Astra and SA-Opus'), 'Final joint report status');
check(review.includes('SA-Opus accepts `report.md` and `plan.md` with RR1 applied'), 'Reviewer conditional acceptance is explicit');
check(norm(plan).includes('Known before any merge: the developer guides (EN and VI) do not yet name `tools/ig-proto/`, which this branch adds; a later documentation task adds the line before any merge (`AGENTS.md`).'),
  'RR1 required disclosure applied');
check(plan.includes('| N-P1-DOC |') && plan.includes('not merely the other PR'), 'Pre-merge documentation gap remains tracked for the correct branch');
for (const p of ['DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md']) {
  check(!read(p).includes('ig-proto'), `Known documentation gap verified: ${p}`);
}
const prRequirements = plan.split("PR #11's rewritten description must:\n")[1]?.split('Use existing **PR #11**')[0] ?? '';
for (const p of ['core/engine/clues.js', 'core/engine/difficulty.js', 'core/engine/types.js',
  'tests/clues.test.js', 'tests/difficulty.test.js', 'tests/generation-client.test.js',
  'tests/generator-controller.test.js', 'tests/generate.test.js', 'docs/design-detail.md']) {
  check(prRequirements.includes(`\`${p}\``), `RR2 literal changed-file entry: ${p}`);
}
check(prRequirements.includes("P1-03's actual verification results") && prRequirements.includes('sections 4.1-4.2')
  && prRequirements.includes('section 13.2'), 'RR2 documentation sections and verification results');
const publication = plan.split('\n').find((l) => l.startsWith('| P1-T10 |')) ?? '';
check(publication.includes('no phase-2 commit on `improve-generating`'), 'RR3 publication acceptance');
for (const [name, text] of [['plan', plan], ['report', report]]) {
  check(text.includes('- SA-Astra (drafter): accepted, 2026-11-25;'), `${name}: SA-Astra accepted`);
  check(text.includes('- SA-Opus (reviewer): accepted, 2026-11-25;'), `${name}: reviewer acceptance recorded with its condition`);
}
check(questions.trim() === '# Clarifications: improve-generating phase 1\n\nNo open questions.', 'No open questions');
check(plan.includes('`gen-v4` from that point, not from `main`')
  && plan.includes('initially includes phase-1 commits') && plan.includes('| D-P1-07 |'),
  'Current two-PR branch-origin/base contract retained');
check(plan.includes('Do not use `-AllowExit1`') && plan.includes('do not\ndispatch it for PR validation'),
  'Fail-closed and no-deployment boundaries retained');
const draft = JSON.parse(read(`${F}/evidence/sa-astra/joint-draft-checks.json`));
check(sha(JSON.stringify(draft.inputs)) === draft.inputIndexHash, 'Prior draft witness index is intact');
let unchanged = 0;
for (const input of draft.inputs) {
  if ([`${F}/report.md`, `${F}/plan.md`].includes(input.path)) continue;
  read(input.path);
  check(inputs.get(input.path).sha256Raw === input.sha256Raw, `Unchanged draft prerequisite: ${input.path}`);
  unchanged += 1;
}
const digest = await computeSourceDigest(read);
check(digest === 'a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4', 'Production still matches the measured P6 source');
read(`${F}/evidence/sa-astra/final-plan-checks.mjs`);
const result = {
  status: 'final accepted plan checks pass', base: 'c63c553', sourceBase: '006ca68',
  rr: { RR1: 'applied', RR2: 'applied', RR3: 'applied' }, checks, unchangedDraftPrerequisites: unchanged,
  sourceDigest: digest, implementationExecuted: false, newEngineRuns: 0, committed: false,
  planSha256Lf: sha(plan), reportSha256Lf: sha(report),
  inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
writeFileSync(relative(process.cwd(), abs(`${F}/evidence/sa-astra/final-plan-checks.json`)),
  `${JSON.stringify(result, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
console.log(JSON.stringify({ status: result.status, rr: result.rr, checks: checks.length, inputCount: inputs.size,
  unchangedDraftPrerequisites: unchanged, sourceDigest: digest, newEngineRuns: 0, committed: false,
  planSha256Lf: result.planSha256Lf, reportSha256Lf: result.reportSha256Lf }, null, 2));
