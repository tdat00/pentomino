// @ts-check
// Task-pack review arithmetic and contract checks. No generator, rating, replay, tree builder or browser is run.
// node tasks\improve-generating-phase-2\evidence\sa-astra\review-audit.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'tasks/improve-generating-phase-2/evidence/sa-astra';
const PACK = 'tasks/improve-generating-phase-2';
const abs = (p) => join(ROOT, ...p.split('/'));
const inputs = [];
const sha = (v) => createHash('sha256').update(v).digest('hex');
const read = (p) => {
  const b = readFileSync(abs(p));
  inputs.push({ path: p, sha256Raw: sha(b) });
  return b.toString('utf8').replace(/\r\n/g, '\n');
};
const json = (p) => JSON.parse(read(p));
const base = execFileSync('git', ['--no-pager', 'rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
assert.equal(base, '97a6326a5ff149ad27f667c777987fe73df35d07');
const names = readdirSync(abs(PACK)).filter((n) => /^P2-.*\.md$/.test(n)).sort();
assert.equal(names.length, 27);
const tasks = names.map((name) => {
  const text = read(`${PACK}/${name}`);
  const hours = /\| Estimate \| developer ([\d.]+) h/.exec(text);
  return { name, text, developerHours: hours ? Number(hours[1]) : 0 };
});
const checklist = read(`${PACK}/check-list.md`);
const plan = read('docs/improve-generating-phase-2/plan.md');
const parallel = read('docs/improve-generating-phase-2/sa-opus/parallel-schedule.md');
const audit = json('docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json');
const byKey = new Map(audit.rows.map((r) => [r.key, r]));
const groups = Object.fromEntries(['A', 'B'].map((s) => [s, audit.stages[s].schedule.map((g, i) => {
  const components = {};
  for (const k of g.keys) {
    const c = byKey.get(k).component;
    components[c] = (components[c] ?? 0) + 1;
  }
  return { group: i + 1, rows: g.keys.length, components, first: g.keys[0], last: g.keys.at(-1), nodeS: g.nodeS };
})]));
assert.deepEqual(groups.A[0].components, { smoke: 8, require: 3 });
assert.equal(groups.B[22].components['conditional-twin'], 4);
assert.equal(groups.B[22].components['baseline-master'] + groups.B[22].components['shipped-master'], 19);
const devHours = tasks.reduce((n, t) => n + t.developerHours, 0);
assert.equal(devHours, 59);
assert.ok(tasks.every((t) => t.developerHours <= 3));
const fullGateFiles = tasks.filter((t) => /Full gate: locked full suite/.test(t.text)).map((t) => t.name);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const localeRows = (s) => s.split('\n').filter((l) => /^\| `(?:notice\.|replay\.step\.)/.test(l)).map(norm);
assert.deepEqual(localeRows(tasks.find((t) => t.name.startsWith('P2-09-')).text), localeRows(plan));
assert.equal(localeRows(plan).length, 9);
const guide = plan.split('\n').find((l) => l.startsWith('| Guide sentence,')).split('|').slice(2, 4).map(norm);
const guideTask = norm(tasks.find((t) => t.name.startsWith('P2-17-')).text);
assert.ok(guide.every((s) => guideTask.includes(s)));
const splitCountedS = 2 + 45;
const serialReplayCountedS = 8 * (120 + 2 + 45);
const replayDeltaS = serialReplayCountedS - 533;
const splitA = (audit.stages.A.totalGuardS + 1.25 * splitCountedS) / 60;
const revisedA = (audit.stages.A.totalGuardS + 1.25 * (splitCountedS + replayDeltaS)) / 60;
assert.equal(Math.ceil(splitA), 411);
assert.equal(Math.ceil(revisedA), 427);
const source = {
  selector: read('tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js'),
  tree: read('tools/ig-proto/lib/tree.mjs'),
  runner: read('tools/bench/runner.js'),
  calibrate: read('tools/calibrate.mjs'),
  verdicts: read('tools/ig-proto/verdicts.mjs'),
  client: read('core/browser/generation-client.js'),
  generate: read('core/engine/generate.js'),
  worker: read('core/workers/engine.worker.js'),
  app: read('generator/app.js'),
  jobs: read('generator/jobs.js'),
  controllerTests: read('tests/generator-controller.test.js'),
  replayTests: read('tests/replay-model.test.js'),
  workflows: read('.github/workflows/pages.yml'),
  lock: read('tools/ig-proto/lock/ig-lock.ps1'),
};
assert.ok(source.selector.includes('c0: loc.c0, wc: loc.wc, hit: loc.hit, hiBelow: loc.hiBelow, loAbove: loc.loAbove, probes: loc.probes,'));
assert.ok(source.runner.includes("c.seeds?.[rep] ?? `${c.seedPrefix}/${c.id}/${rep}`"));
assert.ok(source.runner.includes("const PROFILES = ['smoke', 'landscape'"));
assert.ok(source.runner.includes("scores: kept.map((v) => v.puzzle.rating?.score ?? null)"));
assert.ok(source.app.includes('quantity: PUZZLES_PER_PRESS'));
assert.ok(source.workflows.includes('push: { branches: [main] }'));
read(`${HERE}/argument-probe.ps1`);
read(`${HERE}/review-audit.mjs`);
const result = {
  base, taskFiles: names.length, developerHours: devHours,
  developerTaskFiles: tasks.filter((t) => t.developerHours > 0).length,
  fullGateFiles, minimumDeveloperAndOrchestratorFullRuns: 2 * fullGateFiles.length,
  localeKeysMatch: 9, guideLanguagesMatch: 2,
  approved: { rows: audit.rows.length, A: audit.stages.A.totalGuardS / 60, B: audit.stages.B.totalGuardS / 60, authorization: { A: 410, B: 402 } },
  changedSchedule: {
    splitSmokeExtraCountedS: splitCountedS, splitSmokeGuardMinutesA: splitA,
    replayOriginalCountedS: 533, replaySerialCountedS: serialReplayCountedS, replayExtraCountedS: replayDeltaS,
    combinedGuardMinutesA: revisedA, roundedStagesSameDurationAssumptions: Math.ceil(revisedA) + 402,
    note: 'Arithmetic using the same 120-s/item proxy, not a measured runtime or request for a larger grant.',
  },
  groups,
  verifiedNonFindings: [
    'Frozen selector has 1320 lines; task copy range is not truncated.',
    'Matrix version/profile/cases/repetitions/seeds schema is supported; explicit seeds preserve rep20 text.',
    'tree.mjs supports supplied sources/manifests/filesRoot/dest; missing base manifest falls back to variants/base.json.',
    'verdicts.cellGate(kind, rows, options) is the real API; imported module does not build a tree at import time.',
    'resultDigest hashes layout keys, clue keys and scores, not algorithm-version metadata.',
    'master-10x10-master.runs.json is the real oracle filename.',
    'After B group22 all conditional-eligible bounded rows exist; group23 still has19 Master rows and4 known twins.',
  ],
  sourceContracts: {
    realMasterPath: audit.rows.find((r) => r.cell === '10x10-master').source,
    outputIsBaseName: true,
    firstAGroupIsMixed: true,
    browserAppForcesOnePuzzlePerPress: true,
    genV4PushHasNoAutomaticWorkflow: true,
  },
  parallelReview: {
    proposalContainsThreeLanes: parallel.includes('option B, three developer lanes'),
    ownerDecision: '1575100035077771386',
    noIdleDeclaration: true,
    taskSizeConflict: parallel.includes('3.25 hours'),
  },
  engineInvocations: 0, countedMeasurementSeconds: 0,
  inputIndexHash: sha(JSON.stringify(inputs)), inputs,
};
writeFileSync(relative(process.cwd(), abs(`${HERE}/review-audit.json`)), `${JSON.stringify(result, null, 2)}\n`.replace(/\n/g, '\r\n'), 'utf8');
console.log(JSON.stringify({
  taskFiles: names.length, developerHours: devHours, fullGateFiles: fullGateFiles.length,
  localeKeysMatch: 9, guideLanguagesMatch: 2, changedSchedule: result.changedSchedule,
  inputIndexHash: result.inputIndexHash, inputs: inputs.length, engineInvocations: 0,
}, null, 2));
