// @ts-check
// SA-Astra phase-2 cross-review: independent row/price/coverage reconciliation. No engine or measurement.
// node docs\improve-generating-phase-2\evidence\sa-astra\round1-cross-audit.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-phase-2/evidence/sa-astra';
const BASE = '7c1bad226830667fa6626ff97c960ca3bddd7794';
const inputs = new Map();
const abs = (p) => join(ROOT, ...p.split('/'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const read = (p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, sha256Raw: sha(b), sha256Lf: sha(b.toString('utf8').replace(/\r\n/g, '\n')) });
  return b.toString('utf8').replace(/\r\n/g, '\n');
};
const json = (p) => JSON.parse(read(p));
assert.equal(execFileSync('git', ['--no-pager', 'rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE);
const originalAstra = json(`${HERE}/round1-audit.json`);
read('docs/improve-generating-phase-2/sa-opus/round-1-analysis.md');
read('docs/improve-generating-phase-2/evidence/sa-opus/p2-price-basis.mjs');
read('docs/improve-generating-phase-2/evidence/sa-opus/p2-prior-coverage.mjs');
const manifest = read('tools/ig-proto/manifest.mjs');
const begin = manifest.indexOf('const HORIZON_S = 885;');
const end = manifest.indexOf('// ---- Plans (V4-T11c) ----', begin);
assert.ok(begin >= 0 && end > begin);
const api = runInNewContext(`${manifest.slice(begin, end).replace(/^export /gm, '')}\n({ PRICING, stepPrice });`, {}, { timeout: 1000 });
const P = JSON.parse(JSON.stringify(api.PRICING));
const mean = (a) => a.reduce((s, n) => s + n, 0) / a.length;
const median = (a) => {
  const s = a.slice().sort((x, y) => x - y), i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const sets = new Map();
for (const [task, arms] of [['V4-S4', ['fr-frozen', 'fr-frozen-none', 'log-link']],
  ['V4-S4C', ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']]]) {
  for (const arm of arms) {
    const dir = `docs/improve-generating/evidence/frozen/${task}/${arm}`;
    for (const f of readdirSync(abs(dir)).filter((f) => f.endsWith('.runs.json')).sort()) {
      const path = `${dir}/${f}`, rows = json(path).rows;
      assert.ok(rows.length > 0);
      const cell = rows[0].caseId;
      assert.ok(rows.every((r) => r.caseId === cell && r.run.probeKind === 'generation'));
      const seconds = rows.map((r) => r.run.responseMs / 1000);
      sets.set(`${task}/${arm}/${cell}`, { path, task, arm, cell, rows, mean: mean(seconds), median: median(seconds) });
    }
  }
}
assert.equal(sets.size, 99);
const get = (k) => { const v = sets.get(k); assert.ok(v, k); return v; };
const invocations = new Map(['V4-S4', 'V4-S4C'].map((task) => [
  task, read(`tests/artifacts/ig-proto/frozen/${task}/invocations.jsonl`).trim().split('\n').map(JSON.parse),
]));
const proofRuns = invocations.get('V4-S4').filter((r) => r.step.startsWith('parity-'));
assert.equal(proofRuns.length, 4);
const proofCountedS = proofRuns.reduce((s, r) => s + r.countedSeconds, 0);
assert.ok(Math.abs(proofCountedS - 1400.916) < 1e-8);
const calibration = [...invocations].map(([task, all]) => {
  const logs = all.filter((r) => r.step.startsWith('rows-'));
  const rows = [...sets.values()].filter((r) => r.task === task);
  const n = rows.reduce((s, r) => s + r.rows.length, 0);
  const responseS = rows.reduce((s, r) => s + r.mean * r.rows.length, 0);
  const nodeS = logs.reduce((s, r) => s + r.nodeSeconds, 0);
  const countedS = logs.reduce((s, r) => s + r.countedSeconds, 0);
  const quote = (which) => rows.reduce((sum, r) => {
    const p = api.stepPrice({ type: 'rows', rows: r.rows.length,
      rowS: which === 'initial-astra' ? 1.25 * r.median : r.mean + (which === 'mean+1' ? 1 : 2),
      rowLimitS: task === 'V4-S4' && r.arm !== 'log-link' ? 130 : 260 });
    return sum + p.countedS;
  }, 0);
  return { task, rows: n, rowInvocations: logs.length, rowCountedS: countedS, responseS, rowNodeS: nodeS,
    residualPerRowS: (nodeS - responseS) / n,
    initialAstraCountedS: quote('initial-astra'), meanPlusOneCountedS: quote('mean+1'), meanPlusTwoCountedS: quote('mean+2') };
});

const prior = json('tools/ig-proto/data/prior-s3-v1.json').cells;
const coverage = [484, 360].map((cap) => {
  let ordered = 0, unordered = 0, orderedPrior = 0, unorderedPrior = 0;
  for (let w = 3; w <= 32; w += 1) for (let h = 3; h <= 32; h += 1) {
    const area = w * h;
    if (area < 81 || area > cap) continue;
    ordered += 1;
    if (prior[`nightmare@${area}`]) orderedPrior += 1;
    if (w <= h) { unordered += 1; if (prior[`nightmare@${area}`]) unorderedPrior += 1; }
  }
  return { cap, ordered, orderedPrior, unordered, unorderedPrior, notUserFrequency: true };
});
assert.deepEqual(coverage.map((c) => [c.unordered, c.unorderedPrior]), [[295, 29], [236, 20]]);

const freeze = json('docs/improve-generating/evidence/frozen/V4-S3/freeze.json');
const data = json('tools/ig-proto/data/frozen-round-v1.json');
const verdicts = json('docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json');
const shipped = new Map(verdicts.classes.flatMap((c) => c.cells.map((id) => [id, c.shipped])));
const all = freeze.classes.flatMap((c) => c.cells);
const controls = all.filter((c) => c.endsWith('-nightmare') && !data.cells.failingNightmare.includes(c));
const nmid = verdicts.classes.find((c) => c.id === 'n-mid').cells;
const thin = ['3x29-nightmare', '32x15-nightmare', '22x22-nightmare'];
const exception = '26x26-nightmare';
const rows = [];
const add = (component, stage, arm, cell, reps, source, options = {}) => {
  const rowLimitS = arm === 'today' || arm === 'uncapped' || cell === exception || cell.endsWith('-master') ? 260 : 130;
  const ref = source ? get(source) : null;
  for (const rep of reps) {
    const responseProxyS = options.atLimit ? null : options.specificResponseS ?? ref.mean;
    rows.push({
      key: `${component}/${arm}/${cell}/${rep}`, component, stage, arm, cell, rep,
      seed: component === 'require' ? `ig-p2/require/${cell}/${rep}` : `landscape/${cell}/${rep}`,
      rowLimitS, rowS: options.atLimit ? rowLimitS : responseProxyS + 2,
      source: ref?.path ?? null, proxy: options.atLimit ? 'unmeasured: full row limit' : options.proxy ?? 'matched frozen arm/cell mean response + 2 s',
      admission: 'elapsed + rowLimitS + 10 <= 885', ...options,
    });
  }
};
const range = (n, start = 20) => Array.from({ length: n }, (_, i) => start + i);
// Separate smoke purpose. These eight observations are not pooled with the 20-row performance cohort.
for (const c of ['14x14-nightmare', '10x10-nightmare', '18x18-nightmare', '22x22-nightmare',
  '26x26-nightmare', '20x20-hell-1', '15x20-nightmare', '10x10-master']) {
  add('smoke', 'A', 'gen-v4', c, [20], `V4-S4/${c === exception || c.endsWith('-master') ? 'log-link' : shipped.get(c)}/${c}`,
    { purpose: 'port correctness only; timings not admitted to performance statistics' });
}
for (const c of all) {
  const stage = thin.includes(c) ? 'A' : 'B';
  add('shipped', stage, 'gen-v4', c, range(20), `V4-S4/${c === exception ? 'log-link' : shipped.get(c)}/${c}`);
}
for (const c of controls) add('baseline-control', thin.includes(c) ? 'A' : 'B', 'today', c, range(20), `V4-S4/log-link/${c}`);
for (const c of data.cells.master) {
  add('shipped-master', 'B', 'gen-v4', c, range(5), `V4-S4/log-link/${c}`);
  add('baseline-master', 'B', 'today', c, range(5), `V4-S4/log-link/${c}`);
}
for (const c of nmid) add('n-mid-no-screen', 'B', 'no-screen', c, range(20), `V4-S4/fr-frozen-none/${c}`);
for (const [cell, adjacent] of [
  ['11x11-nightmare', '10x10-nightmare'],
  ['18x19-nightmare', '18x18-nightmare'],
  ['21x21-nightmare', '20x21-nightmare'],
]) {
  add('non-table', 'A', 'gen-v4', cell, range(20), `V4-S4/fr-frozen-none/${adjacent}`,
    { proxy: `unmeasured cell: adjacent ${adjacent} mean + 2 s; risk-stage assumption, not data for this cell` });
  add('non-table', 'A', 'today', cell, range(20), `V4-S4/log-link/${adjacent}`,
    { proxy: `unmeasured cell: adjacent ${adjacent} mean + 2 s; risk-stage assumption, not data for this cell` });
}
add('non-table', 'A', 'gen-v4', '15x15-nightmare', range(20), 'V4-S4/fr-frozen/15x15b10-nightmare',
  { proxy: 'unmeasured cell: adjacent 15x15b10 screened mean + 2 s; not evidence for the missing-prior path' });
for (const c of ['22x22-nightmare', '32x15-nightmare', '22x22-hell-1', '32x15-hell-1']) {
  for (const arm of c.endsWith('-nightmare') ? ['today', 'gen-v4', 'uncapped'] : ['gen-v4', 'uncapped']) {
    add('require', 'A', arm, c, range(5, 0), null, { atLimit: true, uniqueness: 'require', quantity: 10, maxActive: 484,
      diagnosticOffer: c.endsWith('-hell-1') });
  }
}
const historicalTriggers = [];
for (const cell of all.filter((c) => c !== exception)) {
  const bounded = get(`V4-S4/${shipped.get(cell)}/${cell}`);
  for (const r of bounded.rows) {
    if (r.run.acceptedCount >= 10 && !/time-limit|reserve-cut|response-bound|no-window/.test(r.run.partialReason ?? '')) continue;
    const twin = get(`V4-S4C/${shipped.get(cell)}-uncapped/${cell}`);
    const matched = twin.rows.find((t) => t.rep === r.rep);
    assert.ok(matched);
    historicalTriggers.push({ cell, rep: r.rep, reason: r.run.partialReason, boundedAccepted: r.run.acceptedCount,
      twinAccepted: matched.run.acceptedCount, twinResponseS: matched.run.responseMs / 1000 });
    add('conditional-twin', 'B', 'uncapped', cell, [r.rep], `V4-S4C/${shipped.get(cell)}-uncapped/${cell}`,
      { specificResponseS: matched.run.responseMs / 1000, proxy: 'same frozen-trigger row response + 2 s (not all-cell median)' });
  }
}
assert.equal(historicalTriggers.length, 10);
assert.ok(historicalTriggers.every((r) => r.cell === '14x14-hell-1'));
for (let i = 0; i < 5; i += 1) add('conditional-twin', 'B', 'uncapped', `unresolved-trigger-${i}`, [0], null,
  { atLimit: true, seed: null, proxy: 'five additional trigger slots at full row limit; actual row keys resolved by the predeclared predicate' });
assert.equal(rows.length, 1013);
assert.equal(new Set(rows.map((r) => r.key)).size, rows.length);

// Heterogeneous row schedule. One driver may checkpoint and continue into the next cell/arm within the same
// stage invocation. Each request is still a fresh process, cold and four-worker; no requests run concurrently.
const schedule = (list) => {
  const inv = [];
  let next = 0;
  while (next < list.length) {
    let nodeS = P.startupS;
    const keys = [];
    while (next < list.length && nodeS + list[next].rowLimitS + P.rowMarginS <= P.horizonS) {
      const r = list[next++];
      keys.push(r.key);
      nodeS += Math.min(r.rowS, r.rowLimitS + P.rowMarginS);
    }
    assert.ok(keys.length > 0);
    inv.push({ nodeS, quietS: P.quietS, keys });
  }
  const nodeS = inv.reduce((s, i) => s + i.nodeS, 0), quietS = inv.length * P.quietS;
  return { rows: list.length, invocations: inv.length, nodeS, quietS, countedS: nodeS + quietS,
    guardS: P.guardFactor * (nodeS + quietS), ceilingS: list.length * P.ceilingPerUnitS, schedule: inv };
};
// Interleave paired arms by cell and rep; fixed component order and explicit stage boundary.
const componentOrder = ['smoke', 'require', 'non-table', 'shipped', 'baseline-control', 'shipped-master', 'baseline-master', 'n-mid-no-screen', 'conditional-twin'];
const sortRows = (a, b) => {
  const phaseOf = (r) => ['shipped', 'baseline-control', 'n-mid-no-screen'].includes(r.component) ? 3
    : ['shipped-master', 'baseline-master'].includes(r.component) ? 5 : componentOrder.indexOf(r.component);
  return phaseOf(a) - phaseOf(b) || a.cell.localeCompare(b.cell) || a.rep - b.rep
    || ((a.rep % 2 ? -1 : 1) * a.arm.localeCompare(b.arm));
};
const stageRows = Object.fromEntries(['A', 'B'].map((s) => [s, rows.filter((r) => r.stage === s).sort(sortRows)]));
const stages = Object.fromEntries(['A', 'B'].map((s) => [s, schedule(stageRows[s])]));
const replay = api.stepPrice({ type: 'items', groups: ['phase2-shipped', 'phase2-uncapped'].map((variant) => ({
  kind: 'v4-replay', variant, lanes: 2, reserveS: 120, durationsS: Array(4).fill(120),
})) });
const items = [
  { name: 'four proof bundles', stage: 'A', countedS: proofCountedS, guardS: P.guardFactor * proofCountedS,
    ceilingS: 48 * P.ceilingPerUnitS, proxy: 'four observed S4 parity invocations, including their 45-s quiet each; no completion guarantee' },
  { name: 'eight resource replays', stage: 'A', countedS: replay.countedS, guardS: replay.guardS, ceilingS: replay.ceilingS,
    proxy: 'two variant groups of four items; reserve-based while new replay timings do not exist' },
  { name: 'six browser functional checks', stage: 'A', countedS: 990, guardS: 990, ceilingS: 990,
    proxy: 'six <=60-s checks in individually <=120-s helper invocations, 45-s quiet each; enforced ceiling, not a row forecast' },
];
for (const s of ['A', 'B']) {
  const it = items.filter((i) => i.stage === s);
  stages[s].itemsCountedS = it.reduce((n, i) => n + i.countedS, 0);
  stages[s].itemsGuardS = it.reduce((n, i) => n + i.guardS, 0);
  stages[s].totalCountedS = stages[s].countedS + stages[s].itemsCountedS;
  stages[s].totalGuardS = stages[s].guardS + stages[s].itemsGuardS;
}
const totalCountedS = stages.A.totalCountedS + stages.B.totalCountedS;
const totalGuardS = stages.A.totalGuardS + stages.B.totalGuardS;
const stageGrantMinutes = Object.fromEntries(['A', 'B'].map((s) => [s, Math.ceil(stages[s].totalGuardS / 60)]));
const proposedGrantMinutes = stageGrantMinutes.A + stageGrantMinutes.B;
const nonTableAtLimits = rows.map((r) => r.component === 'non-table' ? { ...r, rowS: r.rowLimitS } : r);
const stressA = schedule(nonTableAtLimits.filter((r) => r.stage === 'A').sort(sortRows));
const stressGuardS = stressA.guardS + stages.A.itemsGuardS + stages.B.totalGuardS;
const components = componentOrder.map((component) => {
  const list = rows.filter((r) => r.component === component);
  return { component, rows: list.length, requestProxyS: list.reduce((s, r) => s + Math.min(r.rowS, r.rowLimitS + 10), 0) };
});
const primitives = read('tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js');
assert.ok(primitives.includes("igNoWindow: noWindow === 'below-to-one' ? 'below' : 'above'"));
for (const p of [
  'core/engine/levels.js', 'core/engine/policy.js', 'core/engine/qualification.js', 'core/browser/generation-client.js',
  'core/browser/worker-pool.js', 'generator/jobs.js', 'generator/state.js', 'tools/generate.mjs',
  'docs/improve-generating/plan.md', 'docs/improve-generating-stages-2-4/stage4-report.md',
  'tools/ig-proto/variants/live.json', 'tools/ig-proto/variants/v4-p5.json', 'tools/ig-proto/verdicts.mjs', `${HERE}/round1-cross-audit.mjs`,
]) read(p);
const result = {
  base: BASE, status: 'proposed enumerated reconciliation; awaiting SA-Opus agreement',
  engineInvocations: 0, newMeasuredSeconds: 0, pricing: P,
  initialQuotes: { astraGuardS: originalAstra.pricing.proposedGuardS, opusExpectedMinutes: 377,
    opusEnvelopeMinutes: 480, note: 'Different cohorts and price vocabularies; not two prices for the same study.' },
  coverage, calibration, proofRuns: proofRuns.map((r) => ({ step: r.step, nodeSeconds: r.nodeSeconds, quietS: r.quietS, countedSeconds: r.countedSeconds })),
  components, stages, items, historicalTriggers,
  conditional: {
    scopedMainEligibleRows: 18 * 20 + 4 * 20, budgetedSlots: 15, mandatoryHistoricalTriggers: 10,
    completionLogic: 'If bounded reaches quantity10, false-stop/lost-completion are zero by definition, not an observed uncapped pair or proof of no P5 action. Every shortfall gets a new production twin.',
    trigger: 'bounded or matching frozen row: <10, set no-window/bound, any budget stop, reserve/work/host clock cut; absent required telemetry is unknown, never zero',
    exhaustion: 'Never drop a required twin. More than15 is a finding/reprice within the approved predicate and remaining grant; if unfunded, stop and mark incomplete.',
  },
  totals: { plannedRows: rows.length, totalCountedS, totalGuardS, stageGrantMinutes, proposedGrantMinutes,
    oldAccountS: 52271.997, oldGrantMinutes: 1725, oldEquivalentCapMinutes: Math.ceil(52271.997 / 60 + proposedGrantMinutes),
    nonTableAtLimitsGuardS: stressGuardS, nonTableAtLimitsGrantMinutes: Math.ceil(stressGuardS / 60) },
  noTableProjectionWarning: 'Adjacent-cell proxies do not measure the missing-prior path. Their at-limit stress quote is given; a spend cap need not complete all observations.',
  rows, inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
const write = (p, value) => writeFileSync(relative(process.cwd(), abs(`${HERE}/${p}`)),
  `${value.replace(/\r\n/g, '\n').replace(/\n*$/, '')}\n`.replace(/\n/g, '\r\n'), 'utf8');
write('round1-cross-audit.json', JSON.stringify(result, null, 2));
const minutes = (s) => (s / 60).toFixed(3);
write('round1-cross-audit.md', [
  '# Phase-2 cross-review: independently enumerated price (SA-Astra)', '',
  'Proposal pending joint agreement. No engine, test runner or measurement was executed.', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-astra\\round1-cross-audit.mjs`.', '',
  '| Stage | Planned rows | Row invocations | Row counted min | Item counted min | Total counted min | Total guard min |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...['A', 'B'].map((s) => { const p = stages[s]; return `| ${s} | ${p.rows} | ${p.invocations} | ${minutes(p.countedS)} | ${minutes(p.itemsCountedS)} | ${minutes(p.totalCountedS)} | ${minutes(p.totalGuardS)} |`; }),
  '', `Planned total: ${rows.length} rows, ${minutes(totalCountedS)} counted minutes, ${minutes(totalGuardS)} guard minutes; independently rounded stages ${stageGrantMinutes.A} + ${stageGrantMinutes.B} = ${proposedGrantMinutes} minutes.`,
  `Equivalent old-account cap (only with explicit scope/funding extension): ${result.totals.oldEquivalentCapMinutes} minutes.`,
  `If every non-table row consumes its full row limit: guard ${minutes(stressGuardS)} minutes, rounded grant ${result.totals.nonTableAtLimitsGrantMinutes}. This is a stress case, not an observation.`,
  '', 'Prices use matching frozen means +2 s/request; unknown require and five extra trigger slots use their row limits.',
  'The non-table adjacent-cell proxies are assumptions. The schedule batches cells within each stage, sequential fresh processes,',
  'with 885-s horizon, 900-s kill, 45-s quiet and per-row checkpoint; the pure T11g guard is 1.25 x counted.',
  'The eight smoke rows are a separate correctness purpose and are never pooled as additional validation repetitions.',
  'The fifteen conditional slots are a planning allowance, not permission to omit a required twin.',
  '', '## Frozen calibration', '',
  '| Task | Actual row counted min | Residual per row s (proofs excluded) | Initial Astra proxy min | Mean+1 min | Mean+2 min |',
  '|---|---:|---:|---:|---:|---:|',
  ...calibration.map((c) => `| ${c.task} | ${minutes(c.rowCountedS)} | ${c.residualPerRowS.toFixed(3)} | ${minutes(c.initialAstraCountedS)} | ${minutes(c.meanPlusOneCountedS)} | ${minutes(c.meanPlusTwoCountedS)} |`),
  '', `Observed four-proof total: ${minutes(proofCountedS)} counted minutes.`,
  `Input index: ${inputs.size} paths; SHA-256 \`${result.inputIndexHash}\`; details, exact row schedule and assumptions in round1-cross-audit.json.`,
].join('\n'));
console.log(JSON.stringify({ totals: result.totals, stages: Object.fromEntries(['A', 'B'].map((s) => [s, {
  rows: stages[s].rows, invocations: stages[s].invocations, countedMinutes: stages[s].totalCountedS / 60, guardMinutes: stages[s].totalGuardS / 60,
}])), calibration, coverage, historicalTriggers, inputs: inputs.size, engineInvocations: 0 }, null, 2));
