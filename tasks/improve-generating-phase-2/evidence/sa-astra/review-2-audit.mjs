// SA-Astra: read-only audit of the revised task pack. No generation, rating, replay or browser run.
// Run from the repository root: node tasks\improve-generating-phase-2\evidence\sa-astra\review-2-audit.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PACK = 'tasks\\improve-generating-phase-2';
const OUT = join(PACK, 'evidence\\sa-astra\\review-2-audit.json');
const input = new Map();
const sha = (b) => createHash('sha256').update(b).digest('hex');
function read(path) {
  const b = readFileSync(join(ROOT, path));
  input.set(path.replaceAll('\\', '/'), sha(b));
  return b.toString('utf8').replaceAll('\r\n', '\n');
}
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(head, '97a6326a5ff149ad27f667c777987fe73df35d07');
const names = readdirSync(join(ROOT, PACK)).filter((n) => /^P2-\d+[a-z]?-.*\.md$/.test(n)).sort();
const tasks = names.map((name) => {
  const text = read(join(PACK, name));
  return {
    name,
    id: name.match(/^P2-\d+[a-z]?/)[0],
    hours: Number(text.match(/^\| Estimate \| developer ([0-9.]+) h/m)?.[1] ?? 0),
    text,
  };
});
const task = (id) => tasks.find((t) => t.id === id).text;
const checklist = read(join(PACK, 'check-list.md'));
const contracts = read(join(PACK, 'contracts.md'));
const plan = read('docs\\improve-generating-phase-2\\plan.md');
const parallel = read('docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-parallel-plan.mjs');
read('docs\\improve-generating-phase-2\\sa-opus\\parallel-schedule.md');
const a = JSON.parse(read('docs\\improve-generating-phase-2\\evidence\\sa-astra\\round1-cross-audit.json'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const localeRows = (s) => s.split('\n').filter((l) => /^\| `(?:notice\.|replay\.step\.)/.test(l)).map(norm);
assert.deepEqual(localeRows(task('P2-09')), localeRows(plan));
assert.equal(localeRows(plan).length, 9);
const guides = plan.split('\n').find((l) => l.startsWith('| Guide sentence,')).split('|').slice(2, 4).map(norm);
assert.ok(guides.every((s) => norm(task('P2-17')).includes(s)));
assert.equal(tasks.length, 36);
assert.equal(tasks.filter((t) => t.hours > 0).length, 32);
assert.equal(tasks.reduce((s, t) => s + t.hours, 0), 78.25);
assert.ok(tasks.every((t) => t.hours <= 3));

// Parse only literal dependency/estimate data; do not execute the author's script.
const graph = Object.fromEntries([...parallel.matchAll(
  /^  '(P2-\d+[a-z]?)': \{ est: ([0-9.]+), lane: '[SCTJ]', deps: \[([^\]]*)\]/gm,
)].map((m) => [m[1], { hours: Number(m[2]), deps: [...m[3].matchAll(/'(P2-\d+[a-z]?)'/g)].map((x) => x[1]) }]));
assert.equal(Object.keys(graph).length, 31);
const ancestors = (id, visiting = new Set()) => {
  assert.ok(!visiting.has(id), `cycle at ${id}`);
  const next = new Set([...visiting, id]);
  return new Set(graph[id].deps.flatMap((d) => [d, ...ancestors(d, next)]));
};
const finish = (id) => graph[id].hours + Math.max(0, ...graph[id].deps.map(finish));
const longest = Math.max(...Object.keys(graph).map(finish));
assert.equal(longest, 23.5);
const dependencyCounterexamples = [
  { task: 'P2-12e', uses: 'proofs.mjs / proofs.test.mjs', producer: 'P2-12c' },
  { task: 'P2-16e', uses: 'tests/browser/deadline.html in sourcesOf unit test', producer: 'P2-16b' },
  { task: 'P2-16c', uses: 'ctx.igStage / ctx.igAttempt for scripted rating seams', producer: 'P2-12d' },
  { task: 'P2-16a', uses: 'unconditional complete phase2 test-file runner', producer: 'P2-12e' },
].map((x) => ({ ...x, producerIsPrerequisite: ancestors(x.task).has(x.producer) }));
assert.ok(dependencyCounterexamples.every((x) => !x.producerIsPrerequisite));
assert.ok(task('P2-12e').includes("'tools/ig-proto/phase2/proofs.test.mjs'"));
assert.ok(task('P2-16e').includes("sourcesOf('tests/browser/deadline.html', [])"));
assert.ok(task('P2-16c').includes("ctx.igStage === 'set'"));
assert.ok(task('P2-16a').includes("and step 4.2's runner"));

// Replay the approved schedule using its projected row cost AND enforced row-limit admission rule.
const byKey = new Map(a.rows.map((r) => [r.key, r]));
const stages = {};
for (const stage of ['A', 'B']) {
  const s = a.stages[stage];
  let nodeS = 0;
  for (const [i, g] of s.schedule.entries()) {
    let elapsed = 2;
    for (const key of g.keys) {
      const r = byKey.get(key);
      assert.equal(r.stage, stage);
      assert.ok(elapsed + r.rowLimitS + 10 <= 885, `${stage}/${i + 1}/${key} deferred`);
      elapsed += r.rowS;
    }
    assert.ok(Math.abs(elapsed - g.nodeS) < 1e-8);
    nodeS += elapsed;
  }
  const rowCountedS = nodeS + 45 * s.schedule.length;
  const items = a.items.filter((item) => item.stage === stage);
  const countedS = rowCountedS + items.reduce((sum, item) => sum + item.countedS, 0);
  const guardS = rowCountedS * 1.25 + items.reduce((sum, item) => sum + item.guardS, 0);
  stages[stage] = {
    rows: a.rows.filter((r) => r.stage === stage).length,
    rowInvocations: s.schedule.length,
    countedMinutes: countedS / 60,
    guardMinutes: guardS / 60,
    roundedStageCap: Math.ceil(guardS / 60),
  };
}
assert.equal(stages.A.roundedStageCap, 410);
assert.equal(stages.B.roundedStageCap, 402);
assert.equal(a.rows.length, 1013);
assert.ok(task('P2-18').includes('& $rg -Stage A -Group 1'));
assert.ok(!task('P2-18').includes('-Group 0'));
assert.ok(task('P2-19').includes("'replay-probe.mjs'") === false);
assert.ok(task('P2-19').includes("'tools\\ig-proto\\phase2\\replay-probe.mjs', '--all'"));
assert.ok(task('P2-19').includes('-LimitSeconds 120'));
assert.ok(task('P2-14b').includes('533'));

// Executable consequences of the written formats, not tests of unimplemented phase2 code.
const normalFields = ['complete', 'problems', 'calls', 'ended', 'terminated', 'open', 'lo', 'hi', 'ratingWork', 'countWork'];
const fullWork = {
  complete: true, problems: [], calls: 1, ended: 1, terminated: 0, open: 0,
  lo: 100, hi: 100, ratingWork: 100, countWork: 0,
  outcomes: [{ stage: 'set', attempt: 0, result: 'not-in-band', igNoWindow: 'below', budgetStop: false }],
  rerateStarts: { close: 0, rescue: 1, rerate: 0 },
};
const projectedWork = Object.fromEntries(normalFields.map((k) => [k, fullWork[k]]));
assert.ok(task('P2-13d').includes('ledger = workLedger(rowWork('));
assert.equal(projectedWork.outcomes, undefined);
assert.equal(projectedWork.rerateStarts, undefined);
const rawFour = [0, 1, 2, 3].map((attempt) => ({ stage: 'set', attempt, igNoWindow: 'below' }));
const transported = { sameSide: null, boundFired: false, attempts: [2, 0, 3, 1].map((attempt) => ({ attempt, reason: 'not-in-band' })) };
const naturalFromRaw = rawFour.length === 4 && rawFour.every((o) => o.igNoWindow === 'below');
assert.equal(naturalFromRaw, true);
assert.equal(transported.sameSide !== null, false);
const c1 = [
  { t: 'start', call: 'r:9:1:1', stage: 'set', attempt: 0 },
  { t: 'end', call: 'r:9:1:1', result: 'not-in-band', igNoWindow: 'below' },
];
assert.equal(c1.filter((l) => l.t === 'end' && l.stage === 'set' && l.attempt === 0).length, 0);
assert.equal(c1.find((l) => l.call === c1[0].call && l.t === 'end').igNoWindow, 'below');
const statusLines = [
  { t: 'start', key: 'r', invocation: 'A-1.1', at: 1 },
  { t: 'done', key: 'r', at: 2 },
];
assert.equal(statusLines.filter((l) => l.t === 'done' && l.invocation === 'A-1.1').length, 0);
assert.equal(statusLines.filter((l) => l.t === 'done' && statusLines.some((s) => s.t === 'start' && s.key === l.key && s.invocation === 'A-1.1')).length, 1);
const eligible = a.rows.filter((r) => r.arm === 'gen-v4' &&
  ((r.component === 'shipped' && r.cell !== '26x26-nightmare') || r.component === 'non-table'));
assert.equal(eligible.length, 440);
const eligibleByStage = Object.fromEntries(['A', 'B'].map((s) => [s, eligible.filter((r) => r.stage === s).length]));
assert.deepEqual(eligibleByStage, { A: 140, B: 300 });
assert.ok(task('P2-13b').includes('`E/browser/receipt.json`'));
assert.ok(task('P2-19').includes('evidence\\browser\\$c'));
assert.ok(contracts.includes("once, when the trace module loads"));
assert.ok(task('P2-12d').includes('Each case sets `IG_LOG_DIR` to its own empty folder'));
const overflow = { twins: 12, groups: 4, writtenCountedS: 12 * 260 + 4 * 45, correctedCountedS: 12 * 260 + 4 * (2 + 45) };
assert.deepEqual(overflow, { twins: 12, groups: 4, writtenCountedS: 3300, correctedCountedS: 3308 });
for (const path of [
  'core\\browser\\generation-client.js', 'tools\\ig-proto\\verdicts.mjs',
  'tools\\ig-proto\\lib\\tree.mjs', 'tools\\ig-proto\\lib\\ledger.mjs',
  'tools\\ig-proto\\snapshot.mjs', 'tools\\ig-proto\\lib\\paths.mjs',
  'tools\\ig-proto\\lock\\ig-lock.ps1', 'tools\\record-fixtures.mjs', 'tools\\bench\\report.js',
]) read(path);
const inputs = [...input].sort(([x], [y]) => x.localeCompare(y)).map(([path, hash]) => ({ path, sha256: hash }));
const output = {
  base: head,
  kind: 'static task-contract review; synthetic consequences are not implementation test results',
  generatorRuns: 0, ratingRuns: 0, replayRuns: 0, browserRuns: 0, countedMachineSeconds: 0,
  taskFiles: tasks.length, developmentTasksBeforeMeasurement: 31, publicationTextTask: 1,
  developerHours: 78.25, maximumTaskHours: 3, estimatedDependencyPathHours: longest,
  localeKeysMatch: 9, guideLanguagesMatch: 2,
  schedule: stages,
  totalCountedMinutes: stages.A.countedMinutes + stages.B.countedMinutes,
  totalGuardMinutes: stages.A.guardMinutes + stages.B.guardMinutes,
  totalStageCap: stages.A.roundedStageCap + stages.B.roundedStageCap,
  horizonAdmissionViolations: 0,
  dependencyCounterexamples,
  producerConsumer: {
    rowWorkFields: Object.keys(fullWork), storedFieldsAsWritten: Object.keys(projectedWork),
    naturalMatchRaw: naturalFromRaw, naturalMatchTransportAsWritten: transported.sameSide !== null,
    endLookupAsWritten: 0, endLookupWithCallJoin: 1,
    terminalInvocationFilterAsWritten: 0, terminalStartJoin: 1,
    eligibleByStage, overflow,
    browserProducer: 'E/browser/<check>/receipt.json', browserConsumerAsWritten: 'E/browser/receipt.json',
  },
  inputs, inputIndexHash: sha(JSON.stringify(inputs)),
};
writeFileSync(join(ROOT, OUT), `${JSON.stringify(output, null, 2)}\n`.replaceAll('\n', '\r\n'), 'utf8');
console.log(JSON.stringify({
  taskFiles: output.taskFiles, developerHours: output.developerHours, maximumTaskHours: 3,
  localeKeysMatch: 9, guideLanguagesMatch: 2, schedule: stages, totalStageCap: output.totalStageCap,
  dependencyCounterexamples, producerConsumer: output.producerConsumer,
  inputCount: inputs.length, inputIndexHash: output.inputIndexHash,
}, null, 2));
