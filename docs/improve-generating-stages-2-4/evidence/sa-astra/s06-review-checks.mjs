// @ts-check
// SA-Astra: V4-S4 failure reading, at 96f231e. Read records and compute statistics only; no engine or measured run.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\s06-review-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {Buffer | string} */ v) => createHash('sha256').update(v).digest('hex');
const V = await import(pathToFileURL(abs('tools/ig-proto/verdicts.mjs')).href);
const { price } = await import(pathToFileURL(abs('tools/ig-proto/manifest.mjs')).href);
const { checkAccepted } = await import(pathToFileURL(abs('tools/ig-proto/lib/proof.mjs')).href);
/** @type {Map<string, any>} */
const inputs = new Map();
const read = (/** @type {string} */ p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, sha256Lf: sha(b.toString('utf8').replace(/\r\n/g, '\n')), sha256Raw: sha(b) });
  return b.toString('utf8');
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
const jsonl = (/** @type {string} */ p) => read(p).split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
/** @param {boolean} ok @param {string} message */
function check(ok, message) {
  if (!ok) {
    throw new Error(message);
  }
}
/** @param {number} a @param {number} b @param {string} message @param {number} [epsilon] */
const near = (a, b, message, epsilon = 1e-10) => check(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= epsilon, `${message}: ${a} != ${b}`);
const D = 'docs/improve-generating-stages-2-4';
const S4 = 'docs/improve-generating/evidence/frozen/V4-S4';
const manifest = json('tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json');
const verdicts = json(`${S4}/verdicts.json`);
const selection = json(`${S4}/class-selection.json`);
const plan = json('tools/ig-proto/plans/V4-S4.json');
check(manifest.purpose === 'selection' && manifest.quantity === 10 && manifest.capMs === 120000 && manifest.resamples === 10000
  && manifest.resampleSeed === 20261116 && isDeepStrictEqual(manifest.validationReps, Array.from({ length: 20 }, (_, i) => i + 20)),
  'Unexpected frozen statistical recipe');
const reps = manifest.validationReps;
/** @type {Map<string, any>} */
const declared = new Map();
for (const step of plan.steps) {
  const node = step.node;
  if (!node?.[0]?.endsWith('arm.mjs') || node[1] !== 'run') {
    continue;
  }
  const flag = (/** @type {string} */ f) => node[node.indexOf(f) + 1];
  for (const cell of flag('--cases').split(',')) {
    const m = /^(.+):(\d+)-(\d+)$/.exec(cell);
    check(m !== null, `Bad case declaration ${cell}`);
    for (let rep = Number(m[2]); rep <= Number(m[3]); rep += 1) {
      const key = `${flag('--arm')}|${m[1]}|${rep}`;
      check(!declared.has(key), `Duplicate declaration ${key}`);
      declared.set(key, { arm: flag('--arm'), caseId: m[1], rep, seed: `landscape/${m[1]}/${rep}` });
    }
  }
}
check(declared.size === 1120, 'Not 1120 declared rows');
/** @type {Map<string, any>} */
const rows = new Map();
let publicationCount = 0;
for (const arm of manifest.arms) {
  for (const file of arm.files) {
    const doc = json(file.path);
    check(inputs.get(file.path).sha256Lf === file.sha256, `Changed publication ${file.path}`);
    check(doc.meta.trees[arm.variant].treeId === arm.treeId, `${file.path}: wrong tree`);
    publicationCount += 1;
    for (const row of doc.rows) {
      const key = `${arm.id}|${row.caseId}|${row.rep}`;
      const d = declared.get(key);
      check(d !== undefined && !rows.has(key) && row.rowKey === `${row.caseId}~${row.rep}` && row.seed === d.seed,
        `Missing, duplicate or wrong declared row ${key}`);
      check(V.ingestRow(row, { quantity: 10 }).status === 'valid', `Invalid/censored/error row ${key}`);
      rows.set(key, row);
    }
  }
}
check(rows.size === 1120 && [...declared.keys()].every((k) => rows.has(k)), 'Incomplete published grid');
const runOf = (/** @type {string} */ arm, /** @type {string} */ cell, /** @type {number} */ rep) => rows.get(`${arm}|${cell}|${rep}`).run;
const ingested = (/** @type {string} */ arm, /** @type {string} */ cell, /** @type {number[]} */ requested) =>
  requested.map((rep) => V.ingestRow(rows.get(`${arm}|${cell}|${rep}`), { quantity: 10 }));
const capped = (/** @type {any} */ r) => r.acceptedCount < 10 ? 120000 : Math.min(r.tenthReadyMs, 120000);
const mean = (/** @type {number[]} */ xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (/** @type {number[]} */ xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  return (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2;
};
const p95 = (/** @type {number[]} */ xs) => xs.slice().sort((a, b) => a - b)[Math.ceil(0.95 * xs.length) - 1];
/** Independent implementation: shared seed resamples for every series of a class. @param {number[][]} series */
function bootstrap(series) {
  let state = 20261116;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const n = series[0].length;
  const samples = [];
  for (let b = 0; b < 10000; b += 1) {
    const picked = Array.from({ length: n }, () => Math.floor(random() * n));
    const log = series.flatMap((s) => picked.map((i) => Math.log(s[i])));
    samples.push(Math.exp(mean(log)));
  }
  samples.sort((a, b) => a - b);
  return { geoMean: Math.exp(mean(series.flatMap((s) => s.map(Math.log)))), lower: samples[999] };
}
/** Standard normal CDF by the erf power series, independent of the author's approximation. @param {number} z */
function phi(z) {
  const x = z / Math.SQRT2;
  let term = x;
  let sum = x;
  for (let n = 1; n < 60; n += 1) {
    term *= -x * x / n;
    sum += term / (2 * n + 1);
  }
  return 0.5 + sum / Math.sqrt(Math.PI);
}
const needed = (/** @type {number} */ sd, /** @type {number} */ n) => 0.9 * Math.exp(1.2816 * sd / Math.sqrt(n));
const parityChance = (/** @type {number} */ sd, /** @type {number} */ n) => phi(-Math.log(needed(sd, n)) / (sd / Math.sqrt(n)));
const controls = manifest.controls.map((/** @type {any} */ c) => {
  const stored = verdicts.controls.find((/** @type {any} */ v) => v.cell === c.cell);
  const selected = selection.selection.cells[c.cell].shipped;
  check(selected === stored.shipped, `${c.cell}: changed selected arm`);
  const pairs = reps.map((/** @type {number} */ rep) => {
    const t = runOf(c.today, c.cell, rep);
    const a = runOf(selected, c.cell, rep);
    const s = runOf('fr-frozen', c.cell, rep);
    return { rep, todayMs: capped(t), shippedMs: capped(a), screenMs: capped(s), ratio: capped(t) / capped(a),
      screenRatio: capped(t) / capped(s), todaySetMs: t.igSetMs, shippedSetMs: a.igSetMs,
      todayAccepted: t.acceptedCount, shippedAccepted: a.acceptedCount };
  });
  const ratios = pairs.map((p) => p.ratio);
  const calculated = bootstrap([ratios]);
  const normative = V.noRegression(ratios, reps, { resamples: 10000, resampleSeed: 20261116 });
  near(calculated.geoMean, normative.geoMean, `${c.cell}: geometric mean`);
  near(calculated.lower, normative.lower, `${c.cell}: independent bootstrap`);
  near(calculated.geoMean, stored.gate.noRegression.geoMean, `${c.cell}: recorded mean`);
  near(calculated.lower, stored.gate.noRegression.lower, `${c.cell}: recorded lower`);
  const gate = V.cellGate('control', ingested(selected, c.cell, reps), { reps, quantity: 10, capMs: 120000,
    responseBoundMs: 120000, todayRows: ingested(c.today, c.cell, reps), resamples: 10000, resampleSeed: 20261116 });
  check(isDeepStrictEqual(gate, stored.gate), `${c.cell}: complete control gate`);
  const logs = ratios.map(Math.log);
  const logMean = mean(logs);
  const sd = Math.sqrt(logs.reduce((sum, x) => sum + (x - logMean) ** 2, 0) / (logs.length - 1));
  return { cell: c.cell, shipped: selected, ...calculated, pass: normative.pass, logSd: sd, logMean,
    approximateNeeded20: needed(sd, 20), approximateFresh20PowerAtTrueParity: parityChance(sd, 20),
    approximateNeeded40: needed(sd, 40), approximateFresh40PowerAtTrueParity: parityChance(sd, 40),
    medianTodayS: median(pairs.map((p) => p.todayMs)) / 1000, medianShippedS: median(pairs.map((p) => p.shippedMs)) / 1000,
    p95TodayS: p95(pairs.map((p) => p.todayMs)) / 1000, p95ShippedS: p95(pairs.map((p) => p.shippedMs)) / 1000,
    screen: { ...bootstrap([pairs.map((p) => p.screenRatio)]), medianS: median(pairs.map((p) => p.screenMs)) / 1000 },
    pairs };
});
check(controls.filter((c) => !c.pass).length === 1 && !controls.find((c) => c.cell === '26x26-nightmare').pass, 'Control failure set differs');
const classes = manifest.classes.map((/** @type {any} */ c) => {
  const ratios = c.cells.map((cell) => reps.map((rep) => capped(runOf(c.noScreen, cell, rep)) / capped(runOf(c.screen, cell, rep))));
  const calculated = bootstrap(ratios);
  const stored = verdicts.classes.find((v) => v.id === c.id);
  near(calculated.geoMean, stored.faster.geoMean, `${c.id}: faster mean`);
  near(calculated.lower, stored.faster.lower, `${c.id}: faster lower`);
  const { screen, noScreen } = stored.work;
  let work = 'unknown';
  if (screen.complete && noScreen.complete && screen.accepted > 0 && noScreen.accepted > 0) {
    if (screen.hiRatio <= noScreen.loRatio) work = 'pass';
    else if (screen.loRatio > noScreen.hiRatio) work = 'worse';
  }
  check(work === stored.work.verdict, `${c.id}: recorded interval decision`);
  check(selection.selection.classes.find((v) => v.id === c.id).shipped === stored.shipped, `${c.id}: selection differs`);
  return { id: c.id, cells: c.cells, ...calculated, verdict: stored.verdict, decidedBy: stored.decidedBy,
    workVerdictFromRecordedBounds: work, shipped: stored.shipped };
});
const masters = manifest.masters.map((/** @type {any} */ m) => {
  const result = V.masterIdentity(ingested(m.today, m.cell, manifest.masterReps), ingested(m.after, m.cell, manifest.masterReps), manifest.masterReps);
  check(isDeepStrictEqual(result, verdicts.masters.find((r) => r.cell === m.cell).result) && result.verdict === 'pass', `${m.cell}: Master identity`);
  return { cell: m.cell, verdict: result.verdict };
});
const failing = verdicts.failingCells.map((/** @type {any} */ c) => {
  const count = reps.filter((rep) => runOf(c.shipped, c.cell, rep).acceptedCount >= 10).length;
  check(count === 20 && c.gate.reachedTen === count && c.gate.deadEnds === 0 && c.gate.verdict === 'pass', `${c.cell}: failing-board completion`);
  return { cell: c.cell, reachedTen: count, recordedDeadEnds: c.gate.deadEnds, p95Ms: c.gate.p95Ms };
});
const hell1 = verdicts.hell1.map((/** @type {any} */ c) => {
  const report = V.hell1Report(ingested(c.arm, c.cell, reps), { reps, quantity: 10 });
  check(isDeepStrictEqual(report, c.report), `${c.cell}: Hell 1 report`);
  return { cell: c.cell, ...report };
});
const proofs = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'].map((id) => {
  const tree = json(`tests/artifacts/ig-proto/tree-frozen/${id}/ig-tree.json`);
  const binding = json(`docs/improve-generating/evidence/frozen/V4-S4P/parity-${id}.accepted.json`);
  const checked = checkAccepted(binding, {
    current: [{ id, treeId: tree.treeId, paramsHash: sha(JSON.stringify(tree.params)) }],
    readFile: (p) => existsSync(abs(p)) ? read(p) : null,
  });
  check(checked.status === 'pass', `${id}: S4 proof binding`);
  return { id, ...checked };
});
const phase0 = V.phase0Verdict({ purpose: 'selection', classes, cells: verdicts.failingCells.map((c) => ({ cell: c.cell, verdict: c.gate.verdict })),
  controls: verdicts.controls.map((c) => ({ cell: c.cell, verdict: c.gate.verdict })), masters, p5: [], prerequisites: verdicts.prerequisites });
check(phase0.verdict === 'fail' && isDeepStrictEqual(phase0.deciding, ['control 26x26-nightmare: fail'])
  && verdicts.p5.length === 0, 'Phase 0 failure / pending comparators differs');
const c26 = controls.find((c) => c.cell === '26x26-nightmare');
const conditionalThreshold40 = Math.log(needed(c26.logSd, 40));
const modelIllustration = {
  assumptions: 'Hypothetical independent normal log-ratios, fixed population SD set to the observed sample SD; these are not calibrated powers of the frozen bootstrap rule.',
  observedMean: c26.geoMean, observedLower: c26.lower, sd: c26.logSd,
  needed20: c26.approximateNeeded20, fresh20PowerAtTrueParity: c26.approximateFresh20PowerAtTrueParity,
  needed40: c26.approximateNeeded40, fresh40PowerAtTrueParity: c26.approximateFresh40PowerAtTrueParity,
  conditionalExisting20PlusFresh20AtTrueParity: phi((c26.logMean / 2 - conditionalThreshold40) / (c26.logSd / (2 * Math.sqrt(20)))),
  belowOne: c26.pairs.filter((p) => p.ratio < 1).length, below08: c26.pairs.filter((p) => p.ratio < 0.8).length,
  above12: c26.pairs.filter((p) => p.ratio > 1.2).length,
};
const author = json(`${D}/evidence/sa-opus/s06-numbers.json`);
for (const c of controls) {
  const a = author.controls.find((r) => r.cell === c.cell);
  near(c.geoMean, a.reproduced.geoMean, `${c.cell}: author mean`);
  near(c.lower, a.reproduced.lower, `${c.cell}: author lower`);
  near(c.logSd, a.logSd, `${c.cell}: author SD`);
  near(c.approximateNeeded20, a.gmNeededFor09, `${c.cell}: normal approximation threshold`);
  near(c.approximateFresh20PowerAtTrueParity, a.passChanceAtParity, `${c.cell}: independent normal CDF`, 1e-6);
  near(c.p95TodayS, a.p95TodayS, `${c.cell}: baseline p95`);
  near(c.p95ShippedS, a.p95ShippedS, `${c.cell}: shipped p95`);
}
const invocations = jsonl('tests/artifacts/ig-proto/frozen/V4-S4/invocations.jsonl');
check(invocations.length === 94 && invocations.every((r) => r.exit === 0 && !r.killed && r.horizonS <= 885 && r.quietS === 45),
  'Invocation integrity');
const countedS = invocations.reduce((s, r) => s + r.countedSeconds, 0);
const afterLoggedS = invocations[0].budget.roundCountedS + countedS;
near(countedS, 28043.391, 'Run account', 1e-7);
near(afterLoggedS, 42514.439, 'Round account', 1e-7);
const comparatorPlan = json('tools/ig-proto/plans/V4-S4C.json');
const rowSteps = comparatorPlan.steps.filter((s) => s.node[0].endsWith('arm.mjs') && s.node[1] === 'run');
const comparatorCells = rowSteps.map((s) => s.node[s.node.indexOf('--cases') + 1].split(':')[0]);
check(rowSteps.length === 19 && new Set(comparatorCells).size === 19
  && isDeepStrictEqual(comparatorCells.slice().sort(), Object.keys(selection.selection.cells).sort()), 'Comparator scope differs');
const comparatorPrice = price(comparatorPlan.steps.filter((s) => s.locked).map((s) => s.price));
check(comparatorPrice.admissible && comparatorPlan.allocationMinutes === 586, 'Comparator price');
const account = { countedS, afterLoggedS, offLogS: 87.4, afterMinutes: (afterLoggedS + 87.4) / 60,
  comparatorGuardMinutes: comparatorPrice.guardS / 60, comparatorScope: comparatorCells.length, comparatorRows: 380,
  comparatorMinimumCap: Math.ceil((afterLoggedS + 87.4 + comparatorPrice.guardS) / 60), currentGrant: 1725 };
check(account.comparatorMinimumCap === 1443 && account.comparatorMinimumCap <= account.currentGrant, 'Comparator cap');
for (const p of [`${D}/s06-reading.md`, `${D}/plan.md`, 'docs/improve-generating/plan.md',
  'tasks/improve-generating-stages-2-4/S07-run-v4-s4c.md', 'tasks/improve-generating-stages-2-4/T16-stage4-report-and-phase0.md',
  'tools/ig-proto/verdicts.mjs', 'tools/ig-proto/manifest.mjs', 'tools/ig-proto/lib/proof.mjs', `${D}/evidence/sa-opus/s06-numbers.mjs`]) {
  read(p);
}
const out = { base: '96f231e', publicationCount, declared: declared.size, validPublished: rows.size, controls, classes,
  masters, failing, hell1, proofs, phase0, modelIllustration, account,
  limitations: 'Class work decisions checked from recorded interval bounds, not recomputed from all raw journals. No new measurement or fitted configuration.',
  inputs: [...inputs.values()] };
writeFileSync(relative(process.cwd(), join(HERE, 's06-review-checks.json')), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({ publicationCount, declared: out.declared, validPublished: out.validPublished,
  controls: controls.map(({ pairs, ...c }) => c), classes, phase0, modelIllustration,
  c26Slow: c26.pairs.slice().sort((a, b) => a.ratio - b.ratio).slice(0, 3), account, inputCount: inputs.size }, null, 2));
