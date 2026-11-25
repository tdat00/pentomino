// @ts-check
// Read-only review of the phase-2 joint drafts, their prices, text tables and existing contracts.
// No engine, test runner, generation, replay or tree builder is invoked.
// node docs\improve-generating-phase-2\evidence\sa-astra\joint-review-audit.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-phase-2/evidence/sa-astra';
const abs = (p) => join(ROOT, ...p.split('/'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const inputs = [];
const read = (p) => {
  const b = readFileSync(abs(p));
  inputs.push({ path: p, sha256Raw: sha(b) });
  return b.toString('utf8').replace(/\r\n/g, '\n');
};
const json = (p) => JSON.parse(read(p));
const base = execFileSync('git', ['--no-pager', 'rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
assert.equal(base, '7c1bad226830667fa6626ff97c960ca3bddd7794');
const feature = 'docs/improve-generating-phase-2';
const docs = Object.fromEntries(['report.md', 'plan.md', 'clarifications.md'].map((f) => [f, read(`${feature}/${f}`)]));
const audit = json(`${HERE}/round1-cross-audit.json`);
const optionsText = read(`${feature}/evidence/sa-opus/p2-q1-options.md`);
read(`${feature}/evidence/sa-opus/p2-q1-options.mjs`);
const byKey = new Map(audit.rows.map((r) => [r.key, r]));
const ordered = (stage) => audit.stages[stage].schedule.flatMap((i) => i.keys).map((k) => byKey.get(k));
const simulate = (rows) => {
  let next = 0, invocations = 0, nodeS = 0;
  while (next < rows.length) {
    let e = 2, n = 0;
    while (next < rows.length && e + rows[next].rowLimitS + 10 <= 885) {
      e += Math.min(rows[next].rowS, rows[next].rowLimitS + 10);
      next += 1;
      n += 1;
    }
    assert.ok(n > 0);
    invocations += 1;
    nodeS += e;
  }
  return { rows: rows.length, invocations, nodeS, countedS: nodeS + 45 * invocations };
};
const scenario = (transform) => Object.fromEntries(['A', 'B'].map((stage) => {
  const s = simulate(ordered(stage).map(transform).filter(Boolean));
  const it = audit.items.filter((i) => i.stage === stage);
  const countedS = s.countedS + it.reduce((n, i) => n + i.countedS, 0);
  const guardS = 1.25 * s.countedS + it.reduce((n, i) => n + i.guardS, 0);
  return [stage, { ...s, totalCountedS: countedS, guardS, grantMinutes: Math.ceil(guardS / 60) }];
}));
const prices = {
  agreed: scenario((r) => r),
  stress: scenario((r) => r.component === 'non-table' ? { ...r, rowS: r.rowLimitS } : r),
  withoutSentinels: scenario((r) => r.component === 'non-table' ? null : r),
};
for (const [name, price] of Object.entries(prices)) {
  const grant = price.A.grantMinutes + price.B.grantMinutes;
  assert.equal(grant, { agreed: 812, stress: 1303, withoutSentinels: 729 }[name]);
  assert.ok(optionsText.includes(`${price.A.grantMinutes} + ${price.B.grantMinutes} = ${grant}`));
  for (const stage of ['A', 'B']) {
    const p = price[stage];
    assert.ok(optionsText.includes(`| ${stage} | ${p.rows} | ${p.invocations} | ${(p.totalCountedS / 60).toFixed(3)} | ${(p.guardS / 60).toFixed(3)} | ${p.grantMinutes} |`));
  }
}
assert.equal(prices.agreed.A.rows + prices.agreed.B.rows, 1013);
assert.equal(prices.withoutSentinels.A.rows + prices.withoutSentinels.B.rows, 873);

const devTasks = [...docs['plan.md'].matchAll(/^\| (P2-\d+) \| (.*?) \| Dev \| (.*?) \| ([\d.]+) \|$/gm)]
  .map((m) => ({ id: m[1], task: m[2], dependencies: m[3], hours: Number(m[4]) }));
assert.equal(devTasks.length, 17);
assert.equal(devTasks.reduce((s, t) => s + t.hours, 0), 46);
assert.ok(devTasks.every((t) => t.hours <= 3));
const decisionRows = docs['plan.md'].split('\n').filter((s) => /^\| D-P2-\d+ \|/.test(s));
assert.equal(decisionRows.length, 14);
assert.equal(decisionRows.filter((s) => /\| Owner/.test(s)).length, 3);

const textRows = (s) => s.split('\n').filter((l) => /^\| `(?:notice\.|replay\.step\.)/.test(l)).map((l) => {
  const [key, en, vi] = l.slice(1, -1).split('|').map((x) => x.trim());
  return { key: key.replaceAll('`', ''), en, vi };
});
const planTexts = textRows(docs['plan.md']);
const clarificationTexts = textRows(docs['clarifications.md']);
assert.equal(planTexts.length, 9);
assert.equal(clarificationTexts.length, 13);
const params = (s) => [...s.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
for (const row of planTexts) {
  const q = clarificationTexts.find((r) => r.key === row.key);
  assert.deepEqual(q, row, row.key);
  assert.deepEqual(params(row.en), params(row.vi), row.key);
}
const approvedPlain = textRows(read(`${feature}/sa-astra/round-1-cross-review.md`));
assert.equal(approvedPlain.length, 4);
for (const row of approvedPlain) assert.deepEqual(planTexts.find((r) => r.key === row.key), row, row.key);
for (const row of clarificationTexts) assert.deepEqual(params(row.en), params(row.vi), row.key);

const sample = json('tests/fixtures/generated-sample-pack.json');
const generation = json('tests/fixtures/generation-case.json');
assert.equal(sample.generation.made, undefined);
assert.equal(generation.generation, undefined);
const boards = json('tools/ig-proto/data/boards-v1.json').cases;
const historicalRows = audit.inputs.filter((i) => i.path.endsWith('.runs.json')).flatMap((i) => {
  const rows = json(i.path).rows;
  return rows.map((r) => ({ path: i.path, ...r }));
});
assert.equal(historicalRows.length, 1500);
const offeredV4Nightmare = historicalRows.filter((r) => r.caseId.endsWith('-nightmare')
  && !r.path.includes('/log-link/') && boards[r.caseId].area <= 484 && Number.isFinite(r.run.igSetMs));
const maxOfferedSetMs = Math.max(...offeredV4Nightmare.map((r) => r.run.igSetMs));
assert.equal((maxOfferedSetMs / 1000).toFixed(1), '16.1');
const reserveCutRows = historicalRows.filter((r) => r.run.partialReason === 'set:reserve-cut')
  .map((r) => ({ path: r.path, cell: r.caseId, rep: r.rep }));
assert.equal(reserveCutRows.length, 2);
assert.equal(new Set(reserveCutRows.map((r) => `${r.cell}/${r.rep}`)).size, 1);
const verdicts = json('docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json');
const classRatios = Object.fromEntries(verdicts.classes.map((c) => [c.id, c.faster.geoMean]));
assert.equal(classRatios['n-mid'].toFixed(2), '2.30');
assert.equal(classRatios['n-upper'].toFixed(2), '1.79');
assert.equal(classRatios['n-large'].toFixed(2), '1.59');
const controlLower = Object.fromEntries(verdicts.controls.map((c) => [c.cell, c.gate.noRegression?.lower ?? null]));
assert.equal(controlLower['32x15-nightmare'].toFixed(4), '0.9127');
assert.equal(controlLower['3x29-nightmare'].toFixed(4), '0.9473');
assert.equal(verdicts.controls.filter((c) => c.gate.verdict === 'pass').length, 9);
assert.equal(verdicts.controls.filter((c) => c.gate.verdict === 'fail').length, 1);
assert.equal(verdicts.masters.length, 16);
assert.equal(verdicts.manifest.value.resampleSeed, 20261116);
assert.equal(verdicts.manifest.value.resamples, 10000);
const prior = json('tools/ig-proto/data/prior-s3-v1.json');
assert.equal(Object.keys(prior.cells).length, 27);
const freeze = json('docs/improve-generating/evidence/frozen/V4-S3/freeze.json');
assert.equal(freeze.values.W['n-mid'], 190000000);
assert.deepEqual(freeze.values.callBudget, {
  any: { nightmare: 10000000000, 'hell-1': 40000000000 },
  require: { nightmare: 32000000000, 'hell-1': 40000000000 },
});
assert.equal(freeze.values.setAttemptsBound, 4);
assert.deepEqual(freeze.values.deadline, {
  reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000,
});
const variant = json('tools/ig-proto/variants/v4.json');
const ps = json('tools/ig-proto/variants/v4-ps.json');
const select = read('tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js');
assert.ok(select.includes('const c0 = clamp(prior ?? K - IG.U0, 1, K - 2);'));
assert.ok(select.includes('const screened = W < DEDUCE.work;'));
assert.ok(variant.edits.some((e) => e.replace?.includes('/^gen-v4-proto:[a-z0-9][a-z0-9-]{0,39}$/')));
assert.ok(ps.edits.find((e) => e.id === 'ps-7').append.includes("if (uniqueness === 'require' && cal.certificate?.status !== 'unique')"));
const reportSource = read('tools/bench/report.js');
const sourceBlock = reportSource.match(/SOURCE_FILES = Object\.freeze\(\[([\s\S]*?)\]\)/)[1];
const fingerprintFiles = [...sourceBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);
assert.equal(fingerprintFiles.length, 40);
const plannedNewRuntime = ['core/engine/gen-v4.js', 'core/engine/clue-primitives.js',
  'core/engine/select-v4.js', 'core/browser/generation-deadline.js'];
assert.ok(plannedNewRuntime.every((f) => !fingerprintFiles.includes(f)));
for (const p of [
  'core/browser/generation-client.js', 'core/engine/generate.js', 'core/engine/policy.js',
  'tools/ig-proto/variants/live.json', 'tools/ig-proto/variants/v4-p5.json', 'tools/ig-proto/variants/ps-levels.json',
  'docs/improve-generating/plan.md', 'docs/improve-generating-stages-2-4/stage4-report.md',
  'generator/locale.vi.js', 'USERGUIDE.vn.md', `${HERE}/joint-review-audit.mjs`,
]) read(p);
const result = {
  base, status: 'joint drafts reviewed before owner-answer insertion; not an engine measurement',
  prices, devTasks, developerHours: 46, developerTasks: 17, decisionsBeforeOwnerAnswers: 14,
  ownerRowsBeforeAnswers: 3, jointRowsBeforeAnswers: 11,
  planTexts, clarificationTexts, approvedPlainMatches: 4, localePlaceholderParity: 'pass',
  historicalNumbers: { rows: historicalRows.length, maxOfferedSetMs, reserveCutRows, reserveCutDistinctCellSeeds: 1,
    classRatios, controlLower, masterCells: 16, controlsPassing: 9, controlsFailing: 1,
    resampleSeed: 20261116, resamples: 10000, memoryMiB: { process: 1536, accounted: 300 + 4 * (160 + 32 + 32) } },
  versionsOnlyFixtureScope: { generationCaseHasNoGenerationProvenance: true, samplePackHasNoMadeRecords: true },
  screenFallback: '760 M means no screen in the frozen selector (screened = W < DEDUCE.work); not a defect',
  proposedNewRuntimeMissingFromExistingFingerprint: plannedNewRuntime,
  engineInvocations: 0, countedMeasurementSeconds: 0,
  inputIndexHash: sha(JSON.stringify(inputs)), inputs,
  reviewedDrafts: docs,
};
writeFileSync(relative(process.cwd(), abs(`${HERE}/joint-review-audit.json`)),
  `${JSON.stringify(result, null, 2)}\n`.replace(/\n/g, '\r\n'), 'utf8');
console.log(JSON.stringify({
  priceGrants: Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, v.A.grantMinutes + v.B.grantMinutes])),
  developerTasks: 17, developerHours: 46, decisions: 14, planStrings: planTexts.length,
  clarificationStrings: clarificationTexts.length, approvedPlainMatches: 4,
  inputs: inputs.length, inputIndexHash: result.inputIndexHash, engineInvocations: 0,
}, null, 2));
