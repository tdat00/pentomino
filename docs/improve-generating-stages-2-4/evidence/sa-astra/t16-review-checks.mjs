// @ts-check
// SA-Astra: T16 whole-report review at 02ade1e. Read existing records only; no engine or measured run.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\t16-review-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {Buffer | string} */ v) => createHash('sha256').update(v).digest('hex');
const load = (/** @type {string} */ p) => import(pathToFileURL(abs(p)).href);
const V = await load('tools/ig-proto/verdicts.mjs');
const { checkAccepted } = await load('tools/ig-proto/lib/proof.mjs');
const D = 'docs/improve-generating-stages-2-4';
const O = `${D}/evidence/sa-opus`;
const E = 'docs/improve-generating/evidence/frozen';
const R = 'tests/artifacts/ig-proto/frozen';
/** @type {Map<string, any>} */
const inputs = new Map();
const read = (/** @type {string} */ p) => {
  const b = readFileSync(abs(p));
  const s = b.toString('utf8');
  inputs.set(p, { path: p, sha256Lf: sha(s.replace(/\r\n/g, '\n')), sha256Raw: sha(b) });
  return s;
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
/** @param {boolean} value @param {string} why */
function check(value, why) {
  if (!value) {
    throw new Error(why);
  }
}
/** @param {number} a @param {number} b @param {string} why @param {number} [epsilon] */
const near = (a, b, why, epsilon = 1e-9) => check(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= epsilon, `${why}: ${a} != ${b}`);
const jsonl = (/** @type {string} */ p) => read(p).split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
const r4 = (/** @type {number} */ n) => Math.round(n * 10000) / 10000;
const g2 = (/** @type {number} */ n) => Math.round(n / 1e7) / 100;
const fz = json(`${E}/V4-S3/freeze.json`);
const manifest = json('tools/ig-proto/plans/verdicts/V4-S4F.verdict-manifest.json');
const final = json(`${E}/V4-S4F/verdicts.json`);
const selection = json(`${E}/V4-S4/verdicts.json`);
for (const key of ['classes', 'failingCells', 'controls', 'masters', 'hell1']) {
  check(isDeepStrictEqual(final[key], selection[key]), `Final ${key} changed from the selection record`);
}
const reach = json(`${D}/evidence/sa-astra/t16-reach.json`);
check(sha(JSON.stringify(reach.inputs)) === reach.inputIndexHash && reach.findings.length === 0, 'Reach index/findings');
/** @type {Map<string, any[]>} */
const rowsByArm = new Map();
/** @type {Map<string, any>} */
const rowByKey = new Map();
for (const arm of manifest.arms) {
  const rows = [];
  for (const f of arm.files) {
    const doc = json(f.path);
    check(inputs.get(f.path).sha256Lf === f.sha256, `Changed publication ${f.path}`);
    for (const row of doc.rows) {
      check(V.ingestRow(row, { quantity: 10 }).status === 'valid'
        && row.rowKey === `${row.caseId}~${row.rep}` && row.seed === `landscape/${row.caseId}/${row.rep}`, `Invalid row ${arm.id}/${row.rowKey}`);
      const key = `${arm.id}/${row.rowKey}`;
      check(!rowByKey.has(key), `Duplicate ${key}`);
      rowByKey.set(key, row);
      rows.push(row);
    }
  }
  rowsByArm.set(arm.id, rows);
}
check(rowByKey.size === 1500, 'Expected 1500 unique published rows');
const rowsOf = (/** @type {string} */ arm, /** @type {string} */ cell, /** @type {number[]} */ reps = manifest.validationReps) =>
  reps.map((rep) => {
    const row = rowByKey.get(`${arm}/${cell}~${rep}`);
    check(row !== undefined, `Missing ${arm}/${cell}~${rep}`);
    return row;
  });
const ingest = (/** @type {any[]} */ rows) => rows.map((r) => V.ingestRow(r, { quantity: 10 }));
const t10 = (/** @type {any} */ r) => r.acceptedCount < 10 ? 120000 : Math.min(r.tenthReadyMs, 120000);
const gm = (/** @type {number[]} */ xs) => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
const stat = { resamples: manifest.resamples, resampleSeed: manifest.resampleSeed };
const p5 = manifest.p5.map((p) => {
  const computed = V.p5Stops(ingest(rowsOf(p.bounded, p.cell, p.reps)), ingest(rowsOf(p.uncapped, p.cell, p.reps)),
    { quantity: 10, cell: p.cell, reps: p.reps });
  check(isDeepStrictEqual(computed, final.p5.find((x) => x.cell === p.cell)), `${p.cell}: P5 differs`);
  return computed;
});
check(p5.length === 19 && p5.reduce((n, p) => n + p.pairs, 0) === 380
  && p5.every((p) => p.falseStops === 0 && p.unknown === 0 && p.unexpected.length === 0), 'P5 pairing completeness');

/** Raw call checks, independently of the author's end-only budget maxima. */
const armScan = new Map();
const requests = new Map();
const max = (/** @type {any} */ old, /** @type {any} */ now) => old === null || now.spent > old.spent ? now : old;
let workerFiles = 0;
const reachChanged = [];
for (const input of reach.inputs) {
  const text = read(input.path);
  if (inputs.get(input.path).sha256Raw !== input.sha256Raw) reachChanged.push(input.path);
  const m = /^tests\/artifacts\/ig-proto\/frozen\/(V4-S4C?)\/(fr-frozen(?:-none)?(?:-uncapped)?)\/([^/]+)\/logs\/([^/]+)\.(\d+)\.(\d+)\.jsonl$/.exec(input.path);
  if (m === null) continue;
  workerFiles += 1;
  const [, task, arm, shard, rowKey] = m;
  const armKey = `${task}/${arm}`;
  if (!armScan.has(armKey)) armScan.set(armKey, { task, arm, calls: 0, setCalls: 0, inBandSet: 0, setNoWindow: 0,
    setNoEnd: 0, budgetStops: 0, boundCondition: 0, boundFired: 0, glue: 0, otherNoWindow: [], maxByLevel: {} });
  const summary = armScan.get(armKey);
  const reqKey = `${arm}/${rowKey}`;
  const req = requests.get(reqKey) ?? { task, arm, rowKey, sets: new Map(), budgetStops: 0, calls: 0 };
  requests.set(reqKey, req);
  const calls = new Map();
  for (const line of text.split(/\r?\n/).filter((l) => l.trim() !== '')) {
    const l = JSON.parse(line);
    if (l.t === 'start') {
      check(!calls.has(l.call), `Duplicate raw start ${l.call}`);
      calls.set(l.call, { start: l, spent: 0, beginAboveBudget: 0, end: null });
    } else if (['p', 'count', 'begin', 'end'].includes(l.t)) {
      const c = calls.get(l.call);
      check(c !== undefined, `Unowned raw record ${l.call}`);
      const limit = fz.values.callBudget.any[c.start.level];
      if (l.t === 'p' || l.t === 'count') {
        const units = l.t === 'p' ? l.tuple[4] + l.tuple[5] : l.units;
        check(Number.isFinite(units) && units >= 0, `Invalid units ${l.call}`);
        c.spent += units;
      } else if (l.t === 'begin' && Number.isFinite(limit) && c.spent >= limit) {
        c.beginAboveBudget += 1;
      } else if (l.t === 'end') {
        check(c.end === null, `Duplicate end ${l.call}`);
        c.end = l;
      }
    }
  }
  for (const [id, c] of calls) {
    summary.calls += 1;
    req.calls += 1;
    const detail = { call: id, task, arm, shard, rowKey, stage: c.start.stage, attempt: c.start.attempt, ended: c.end !== null, spent: c.spent };
    const level = c.start.level;
    if (!summary.maxByLevel[level]) summary.maxByLevel[level] = { knownPrefix: null, ended: null, terminated: null,
      endedMeter: null, beginAboveBudget: 0, terminatedPrefixAtBudget: 0 };
    const limits = summary.maxByLevel[level];
    limits.knownPrefix = max(limits.knownPrefix, detail);
    limits[c.end === null ? 'terminated' : 'ended'] = max(limits[c.end === null ? 'terminated' : 'ended'], detail);
    limits.beginAboveBudget += c.beginAboveBudget;
    if (c.end === null && c.spent >= fz.values.callBudget.any[level]) limits.terminatedPrefixAtBudget += 1;
    if (typeof c.end?.locate?.spent === 'number') {
      check(c.end.locate.spent === c.spent, `Meter/primitive sum differs ${id}`);
      limits.endedMeter = max(limits.endedMeter, detail);
    }
    if (c.end?.locate?.budgetStop) {
      summary.budgetStops += 1;
      req.budgetStops += 1;
    }
    if (c.start.stage === 'set') {
      check(!req.sets.has(c.start.attempt), `Duplicate set attempt ${reqKey}/${c.start.attempt}`);
      req.sets.set(c.start.attempt, c);
      summary.setCalls += 1;
      if (c.end === null) summary.setNoEnd += 1;
      else if (c.end.result === 'ok') summary.inBandSet += 1;
      else if (['below-to-one', 'above-to-max'].includes(c.end.locate?.result)) summary.setNoWindow += 1;
    } else if (c.end?.result === 'no-window') {
      summary.otherNoWindow.push({ ...detail, result: c.end.locate?.result });
    }
  }
}
check(reachChanged.length === 0, `N-V4-17 inputs changed: ${reachChanged.join(', ')}`);
for (const req of requests.values()) {
  const summary = armScan.get(`${req.task}/${req.arm}`);
  const first = [0, 1, 2, 3].map((n) => req.sets.get(n));
  const side = (c) => c?.end?.locate?.budgetStop ? null : c?.end?.locate?.result === 'below-to-one' ? 'below'
    : c?.end?.locate?.result === 'above-to-max' ? 'above' : null;
  const sides = first.map(side);
  const condition = sides[0] !== null && sides.every((s) => s === sides[0]) ? sides[0] : null;
  const reason = rowByKey.get(`${req.arm}/${req.rowKey}`).run.partialReason ?? '';
  const fired = reason.startsWith('set:no-window-');
  summary.boundCondition += condition !== null ? 1 : 0;
  summary.boundFired += fired ? 1 : 0;
  summary.glue += !req.arm.endsWith('-uncapped') && ((condition !== null) !== fired || (condition !== null && reason !== `set:no-window-${condition}`)) ? 1 : 0;
}
const authorP5 = json(`${O}/t16-p5.json`);
for (const a of armScan.values()) {
  const other = authorP5.summary.find((s) => s.arm === a.arm && s.task === a.task);
  check(other !== undefined && other.setCalls === a.setCalls && other.setByEnd['in-band'] === a.inBandSet
    && other.setByEnd['no end'] === a.setNoEnd && a.setNoWindow === 0 && a.boundCondition === 0
    && a.boundFired === 0 && a.glue === 0 && a.budgetStops === 0, `${a.arm}: bound/budget counts differ`);
}

const deadline = ['fr-frozen', 'fr-frozen-none'].map((arm) => {
  const rows = rowsByArm.get(arm);
  const reasons = {};
  for (const r of rows) reasons[r.run.partialReason ?? 'complete'] = (reasons[r.run.partialReason ?? 'complete'] ?? 0) + 1;
  return { arm, rows: rows.length, prototypeRows: rows.filter((r) => !r.caseId.endsWith('-master')).length,
    violations: rows.filter((r) => V.deadlineViolation(r.run, { responseBoundMs: 120000 })).length,
    reasons, maximum: rows.reduce((a, r) => r.run.responseMs > a.responseMs ? { rowKey: r.rowKey, responseMs: r.run.responseMs } : a,
      { rowKey: '', responseMs: -1 }) };
});
check(deadline.every((d) => d.violations === 0 && d.reasons['time-limit'] === 9 && d.reasons['set:reserve-cut'] === 1), 'Deadline summary');
const losses = p5.flatMap((p) => p.lostReps.map((rep) => {
  const pair = manifest.p5.find((x) => x.cell === p.cell);
  const b = rowByKey.get(`${pair.bounded}/${p.cell}~${rep}`).run;
  const u = rowByKey.get(`${pair.uncapped}/${p.cell}~${rep}`).run;
  const raw = requests.get(`${pair.bounded}/${p.cell}~${rep}`);
  check(b.partialReason === 'time-limit' && b.responseMs >= 115000 && b.responseMs <= 120000
    && u.acceptedCount >= 10 && u.tenthReadyMs > 115000 && raw.budgetStops === 0, `Lost-pair terminal reason ${p.cell}/${rep}`);
  return { cell: p.cell, rep, boundedCount: b.acceptedCount, boundedResponseMs: b.responseMs, uncappedT10Ms: u.tenthReadyMs,
    uncappedResponseMs: u.responseMs, boundedLastAcceptMs: b.igAcceptedMs.at(-1), observedBudgetStops: raw.budgetStops };
}));
check(isDeepStrictEqual(losses.map((l) => l.rep), [26, 38]), 'Lost completion identities');
const reserve = ['fr-frozen', 'fr-frozen-none'].map((arm) => {
  const b = rowByKey.get(`${arm}/14x14-hell-1~33`).run;
  const u = rowByKey.get('fr-frozen-none-uncapped/14x14-hell-1~33').run;
  check(b.partialReason === 'set:reserve-cut' && b.acceptedCount === 0 && u.acceptedCount === 5 && u.igSetMs > 46000,
    'Reserve-cut pair');
  return { arm, boundedResponseMs: b.responseMs, uncappedSetMs: u.igSetMs, uncappedResponseMs: u.responseMs, uncappedCount: u.acceptedCount };
});
const live = json(`${E}/V4-LIVE/live-deadline.json`);
const liveBinding = json(`${E}/V4-LIVE/live-deadline.accepted.json`);
const liveCurrent = ['fr-frozen', 'fr-frozen-none'].map((id) => {
  const t = json(`tests/artifacts/ig-proto/tree-frozen/${id}/ig-tree.json`);
  return { id, treeId: t.treeId, paramsHash: sha(JSON.stringify(t.params)) };
});
const liveCheck = checkAccepted(liveBinding, { current: liveCurrent, readFile: (p) => existsSync(abs(p)) ? read(p) : null });
check(liveCheck.status === 'pass' && live.kind === 'live-deadline' && live.rows.length === 10
  && live.coverage.expected.length === 25 && live.coverage.observed.length === 25, 'Live deadline binding/coverage');
const liveMetrics = {
  responseMinMs: Math.min(...live.rows.map((r) => r.responseMs)),
  responseMaxMs: Math.max(...live.rows.map((r) => r.responseMs)),
  setMaxMs: Math.max(...live.rows.map((r) => r.igSetMs)),
  live: live.live, postHoc: live.postHoc, workCutoffMs: live.workCutoffMs,
  responseBoundMs: live.responseBoundMs, reserveChecked: live.reserveChecked,
};
check(liveMetrics.live && !liveMetrics.postHoc && liveMetrics.reserveChecked
  && liveMetrics.workCutoffMs === 115000 && liveMetrics.responseBoundMs === 120000, 'Live proof policy');

const controls = final.controls.map((c) => {
  const today = rowsOf(c.today, c.cell);
  const after = rowsOf(c.shipped, c.cell);
  const computed = V.noRegression(today.map((r, i) => t10(r.run) / t10(after[i].run)), manifest.validationReps, stat);
  near(computed.geoMean, c.gate.noRegression.geoMean, `${c.cell}: control mean`);
  near(computed.lower, c.gate.noRegression.lower, `${c.cell}: control lower`);
  check(after.every((r) => r.run.acceptedCount === 10 && r.run.responseMs <= 120000), `${c.cell}: completion/deadline`);
  return { cell: c.cell, ...computed };
});
const median = (xs) => [...xs].sort((a, b) => a - b)[(xs.length - 1) >> 1];
const authorVerdicts = json(`${O}/t16-verdicts.json`);
const masterTiming = final.masters.map((m) => {
  const today = rowsOf(m.today, m.cell, manifest.masterReps);
  const after = rowsOf(m.after, m.cell, manifest.masterReps);
  const t = today.map((r) => t10(r.run));
  const a = after.map((r) => t10(r.run));
  const computed = { cell: m.cell, ratioGeoMean: gm(t.map((x, i) => x / a[i])),
    medianTodayMs: median(t), medianAfterMs: median(a) };
  const other = authorVerdicts.masters.find((x) => x.cell === m.cell);
  near(r4(computed.ratioGeoMean), other.ratioGeoMean, `${m.cell}: timing mean`);
  near(Math.round(computed.medianTodayMs / 100) / 10, other.medianTodayS, `${m.cell}: today's median`);
  near(Math.round(computed.medianAfterMs / 100) / 10, other.medianAfterS, `${m.cell}: after median`);
  return computed;
});

const populations = Object.fromEntries([...rowsByArm].map(([arm, rows]) => [arm, V.population(ingest(rows), { quantity: 10 })]));
check(isDeepStrictEqual(populations, final.population), 'Population differs from final record');
const populationDiffs = final.controls.map((c) => {
  const a = populations[c.shipped][c.cell];
  const b = populations[c.today][c.cell];
  return { cell: c.cell, clueDelta: a.clueShare.median - b.clueShare.median,
    scoreDelta: a.scorePosition.median - b.scorePosition.median, censusDelta: a.censusEstimateShare - b.censusEstimateShare,
    afterTen: a.completion.reachedTen, todayTen: b.completion.reachedTen,
    clueAfter: a.clueShare, clueToday: b.clueShare };
});
const signs = (xs) => ({ up: xs.filter((x) => x > 1e-12).length, equal: xs.filter((x) => Math.abs(x) <= 1e-12).length, down: xs.filter((x) => x < -1e-12).length });
const populationDirections = { clue: signs(populationDiffs.map((c) => c.clueDelta)), score: signs(populationDiffs.map((c) => c.scoreDelta)),
  census: signs(populationDiffs.map((c) => c.censusDelta)) };
check(isDeepStrictEqual(populationDirections, { clue: { up: 9, equal: 1, down: 0 }, score: { up: 2, equal: 5, down: 3 },
  census: { up: 1, equal: 0, down: 9 } }), 'Population direction counts');
const cell26 = {};
for (const [label, arm] of Object.entries({ bounded: 'fr-frozen-none', uncapped: 'fr-frozen-none-uncapped', screen: 'fr-frozen' })) {
  const today = rowsOf('log-link', '26x26-nightmare');
  const after = rowsOf(arm, '26x26-nightmare');
  const ratios = today.map((r, i) => t10(r.run) / t10(after[i].run));
  cell26[label] = V.noRegression(ratios, manifest.validationReps, stat);
}
const bounded26 = rowsOf('fr-frozen-none', '26x26-nightmare');
const uncapped26 = rowsOf('fr-frozen-none-uncapped', '26x26-nightmare');
const uOverB = bounded26.map((b, i) => t10(uncapped26[i].run) / t10(b.run));
cell26.twinOverBounded = { geometricMean: gm(uOverB), min: Math.min(...uOverB), max: Math.max(...uOverB),
  reciprocalPercent: (1 / gm(uOverB) - 1) * 100 };
check(bounded26.every((b) => b.run.partialReason === null && b.run.igSetMs < 46000 && b.run.responseMs < 115000), 'A stop occurred on bounded 26x26');
near(cell26.bounded.geoMean, final.controls.find((c) => c.cell === '26x26-nightmare').gate.noRegression.geoMean, '26x26 official mean');
near(cell26.bounded.lower, final.controls.find((c) => c.cell === '26x26-nightmare').gate.noRegression.lower, '26x26 official lower');
const author26 = json(`${O}/t16-cell26.json`);
near(r4(cell26.uncapped.lower), author26.informationOnly.todayOverUncapped.lower, 'Uncapped diagnostic lower');
near(r4(gm(uOverB)), author26.informationOnly.uncappedOverShipped.geoMean, 'Twin/bounded diagnostic mean');
cell26.rep21SetCall = [];
for (const [task, arm] of [['V4-S4', 'log-link'], ['V4-S4', 'fr-frozen-none'], ['V4-S4C', 'fr-frozen-none-uncapped']]) {
  const prefix = `${R}/${task}/${arm}/val-26x26-nightmare/logs/26x26-nightmare~21.`;
  const found = [];
  for (const input of reach.inputs.filter((x) => x.path.startsWith(prefix) && /\.\d+\.\d+\.jsonl$/.test(x.path))) {
    const lines = jsonl(input.path);
    for (const start of lines.filter((l) => l.t === 'start' && l.stage === 'set' && l.attempt === 0)) {
      const end = lines.find((l) => l.t === 'end' && l.call === start.call);
      check(end !== undefined, `${arm}: rep 21 set attempt 0 has no end`);
      const profiles = lines.filter((l) => l.t === 'p' && l.call === start.call)
        .map((l) => ({ phase: l.tuple[0], count: l.tuple[1], outcome: l.tuple[2], main: l.tuple[4], census: l.tuple[5] }));
      const work = profiles.reduce((n, p) => n + p.main + p.census, 0);
      check(work === end.work && profiles.length === end.profiles, `${arm}: rep 21 profile totals`);
      found.push({ task, arm, path: input.path, call: start.call, K: start.K, initial: start.startCount,
        prior: start.priorCount, W: start.W, ms: end.ms, work, profiles });
    }
  }
  check(found.length === 1, `${arm}: rep 21 set attempt 0 not unique`);
  cell26.rep21SetCall.push(found[0]);
}
check(isDeepStrictEqual(cell26.rep21SetCall[1].profiles, cell26.rep21SetCall[2].profiles),
  'Rep 21 bounded/twin profile work differs');
cell26.rep21SetCallWorkRatio = cell26.rep21SetCall[1].work / cell26.rep21SetCall[0].work;

const tasks = readdirSync(abs(R)).filter((t) => existsSync(abs(`${R}/${t}/invocations.jsonl`)));
const account = [];
for (const task of tasks) {
  const inv = jsonl(`${R}/${task}/invocations.jsonl`);
  const sum = inv.reduce((n, r) => n + r.countedSeconds, 0);
  check(inv.every((r) => r.exit === 0 && !r.killed && r.budget.decision === 'go'
    && r.budget.taskCountedS + r.countedSeconds <= r.budget.taskCapS + 0.001
    && r.budget.roundCountedS + r.countedSeconds <= r.budget.roundCapS + 0.001), `${task}: invocation cap/status`);
  const perStep = {};
  inv.forEach((r) => { perStep[r.step] = (perStep[r.step] ?? 0) + 1; });
  account.push({ task, invocations: inv.length, steps: Object.keys(perStep).length, countedS: sum,
    multi: Object.entries(perStep).filter(([, n]) => n > 1), start: inv[0].start, end: inv.at(-1).end });
}
account.sort((a, b) => a.start.localeCompare(b.start));
const loggedS = account.reduce((n, a) => n + a.countedS, 0);
const loggedInvocations = account.reduce((n, a) => n + a.invocations, 0);
near(loggedS, 52184.597, 'Logged account', 1e-7);
check(loggedInvocations === 207, 'Logged invocation count');
const round = { loggedS, loggedInvocations, offLogS: 87.4, totalS: loggedS + 87.4, minutes: (loggedS + 87.4) / 60,
  grant: 1725, qualification: '207 logged invocations; the earlier externally killed 87.4-s invocation is accounted separately off-log.' };
const s4inv = jsonl(`${R}/V4-S4/invocations.jsonl`);
const twentyRowCosts = ['fr-frozen-none', 'log-link'].map((arm) => ({
  arm, countedS: s4inv.filter((r) => r.step === `rows-${arm}-val-26x26-nightmare`).reduce((n, r) => n + r.countedSeconds, 0),
}));
const rowProxy40FreshPairsMinutes = 2 * twentyRowCosts.reduce((n, r) => n + r.countedS, 0) / 60;
for (const p of [`${D}/stage4-report.md`, `${D}/s06-reading.md`,
  'tasks/improve-generating-stages-2-4/T16-stage4-report-and-phase0.md', 'tasks/improve-generating-stages-2-4/S06-run-v4-s4.md',
  'tasks/improve-generating-stages-2-4/check-list.md', 'tools/ig-proto/verdicts.mjs', 'tools/ig-proto/lib/proof.mjs',
  'tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js',
  'tools/ig-proto/variants/fr-frozen-nowindow-test.json',
  `${D}/evidence/sa-astra/t16-review-checks.mjs`,
  ...['t16-verdicts', 't16-deadline', 't16-p5', 't16-account', 't16-cell26'].map((n) => `${O}/${n}.mjs`)]) read(p);
check(read(`${D}/stage4-report.md`).includes(reach.inputIndexHash), 'Report cites a different N-V4-17 index');
const result = {
  base: '02ade1e', phase0: final.phase0, rows: rowByKey.size, comparatorCells: p5.length, requestPairs: p5.reduce((n, p) => n + p.pairs, 0),
  p5, rawArms: [...armScan.values()], workerFiles, losses, reserve, deadline, liveCheck, liveMetrics, controls, masterTiming,
  populationDiffs, populationDirections, cell26, round, account, rowStudyProxy: { twentyRowCosts, fortyFreshPairsMinutes: rowProxy40FreshPairsMinutes,
    note: 'Linear timing proxy for rows only, not a fully priced or approved study.' },
  reach: { inputIndexHash: reach.inputIndexHash, inputsRechecked: reach.inputs.length, observations: reach.observations },
  scope: 'Existing records and pure computation only; no new benchmark, generation, rating, replay, tree build or git command.',
  inputIndexHash: sha(JSON.stringify([...inputs.values()])),
  inputs: [...inputs.values()],
};
writeFileSync(relative(process.cwd(), join(HERE, 't16-review-checks.json')), JSON.stringify(result, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({
  rows: result.rows, comparatorCells: result.comparatorCells, requestPairs: result.requestPairs, phase0: final.phase0,
  raw: result.rawArms.map((a) => ({ arm: a.arm, calls: a.calls, setCalls: a.setCalls, inBandSet: a.inBandSet, setNoEnd: a.setNoEnd,
    setNoWindow: a.setNoWindow, budgetStops: a.budgetStops, boundCondition: a.boundCondition, glue: a.glue,
    maxByLevel: Object.fromEntries(Object.entries(a.maxByLevel).map(([level, m]) => [level, {
      endedG: g2(m.ended?.spent ?? 0), terminatedG: g2(m.terminated?.spent ?? 0), allKnownPrefixG: g2(m.knownPrefix.spent),
      beginAboveBudget: m.beginAboveBudget, terminatedPrefixAtBudget: m.terminatedPrefixAtBudget,
    }])) })),
  losses, reserve, deadline, liveMetrics, populationDirections, cell26: { ...cell26,
    rep21SetCall: cell26.rep21SetCall.map(({ profiles, ...c }) => ({ ...c, profiles: profiles.length })) },
  round, rowStudyProxy: result.rowStudyProxy, inputCount: inputs.size,
}, null, 2));
