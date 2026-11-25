// @ts-check
// SA-Astra, S02 step 7: verify existing declarations, observations, bindings, counters and CPU profiles.
// No engine, tree construction, git or measured run. Do not call expectedCorpus/treeRef: they may build trees.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\s02-review-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {string | Buffer} */ data) => createHash('sha256').update(data).digest('hex');
const load = (/** @type {string} */ p) => import(pathToFileURL(abs(p)).href);
const P = await load('tools/ig-proto/p7-probe.mjs');
const PM4 = await load('tools/ig-proto/pm4.mjs');
const { price } = await load('tools/ig-proto/manifest.mjs');
/** @type {Map<string, { path: string, sha256: string, sha256Raw: string }>} */
const inputs = new Map();
/** @type {Map<string, string>} */
const texts = new Map();
const read = (/** @type {string} */ p) => {
  if (!texts.has(p)) {
    const b = readFileSync(abs(p));
    const s = b.toString('utf8');
    inputs.set(p, { path: p, sha256: sha(s.replace(/\r\n/g, '\n')), sha256Raw: sha(b) });
    texts.set(p, s);
  }
  return /** @type {string} */ (texts.get(p));
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
const lines = (/** @type {string} */ p) => read(p).split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
const fileHash = (/** @type {string} */ p) => {
  if (!existsSync(abs(p))) {
    return null;
  }
  read(p);
  return /** @type {any} */ (inputs.get(p)).sha256;
};
/** @param {boolean} ok @param {string} message */
function check(ok, message) {
  if (!ok) {
    throw new Error(message);
  }
}
/** @param {number} a @param {number} b @param {string} message */
const near = (a, b, message) => check(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-7, `${message}: ${a} != ${b}`);
const r3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
const r4 = (/** @type {number} */ x) => Math.round(x * 10000) / 10000;
const E = 'docs/improve-generating/evidence/frozen';
const RAW = 'tests/artifacts/ig-proto/frozen';
const CANDIDATES = ['p7-c1', 'p7-c1r5', 'p7-c1r5c5'];
const KERNEL = ['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '26x26-nightmare', '26x26-hell-1'];
const PM_CELLS = ['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-hell-1', '26x26-master', '26x26-nightmare'];
const CATALOGUE = 'tools/ig-proto/data/boards-v1.json';
const MEMORY = 'tools/ig-proto/data/p7-memory-fixtures.json';
const catalogue = json(CATALOGUE);
const memory = json(MEMORY);
/** Read the already-produced tree identity record, without looking up/building a tree. @param {string} variant */
const recordedTree = (variant) => {
  const root = `tests/artifacts/ig-proto/tree-frozen/${variant}`;
  const t = json(`${root}/ig-tree.json`);
  check(/^[0-9a-f]{64}$/.test(t.treeId) && /^[0-9a-f]{64}$/.test(t.copyDigest), `${variant}: invalid tree record`);
  return { variant, treeId: t.treeId, copyDigest: t.copyDigest, root };
};
const reference = recordedTree('base');
const inputConstructor = { ...recordedTree('instr'), rule: 'kernel-window-v1' };
/** @param {string} command @param {string} candidate @param {string | null} tier */
function corpusOf(command, candidate, tier) {
  const items = [];
  const otherTree = reference.root;
  const inputTree = inputConstructor.root;
  const settings = tier === 'quick' ? ['canonical', 'tie1', 'undo', 'work-half', 'mem-ref', 'mem-fast']
    : ['canonical', 'tie1', 'undo', 'work-half', 'work-minus1', 'work-ref', 'census-half', 'mem-below', 'mem-ref', 'mem-fast'];
  for (let round = 0; round < (command === 'time' ? 3 : 1); round += 1) {
    for (const caseId of KERNEL) {
      const { boardRows, levelId } = catalogue.cases[caseId];
      for (let subsetIndex = 0; subsetIndex < 6; subsetIndex += 1) {
        items.push(command === 'time'
          ? { id: `time:${candidate}:${caseId}:${subsetIndex}:${round}`, kind: 'p7-time', variant: candidate,
            payload: { boardRows, levelId, seedText: `ig-v4/kernel/${caseId}`, subsetIndex, round, otherTree, inputTree } }
          : { id: `equal:${candidate}:kernel:${caseId}:${subsetIndex}`, kind: 'p7-equal', variant: candidate,
            payload: { source: 'kernel', boardRows, levelId, seedText: `ig-v4/kernel/${caseId}`, subsetIndex, settings, otherTree, inputTree } });
      }
    }
  }
  const paths = command === 'time' ? [CATALOGUE]
    : [...PM_CELLS.map((c) => `${RAW}/IGP-02/main/${c}/calls.json`), MEMORY, CATALOGUE];
  if (command === 'equal') {
    for (const cell of PM_CELLS) {
      const calls = json(`${RAW}/IGP-02/main/${cell}/calls.json`);
      for (const set of calls.sets) {
        if (set.pieces === null) {
          continue;
        }
        for (const { order, record } of PM4.profilesOf(set)) {
          if (tier === 'quick' && order >= 4) {
            continue;
          }
          const settings = tier === 'quick' || order !== 0 ? ['canonical']
            : ['canonical', ...[...PM4.screenValues(record, calls.limits.work).keys()].map((w) => `screen:${w}`)];
          items.push({ id: `equal:${candidate}:pm4:${cell}:${set.i}:${order}`, kind: 'p7-equal', variant: candidate,
            payload: { source: 'pm4', boardRows: set.boardRows, pieces: set.pieces,
              clues: record.idx.map((/** @type {number} */ i) => set.witness[i]), levelId: calls.levelId, settings, otherTree } });
        }
      }
    }
    for (const f of memory.fixtures) {
      items.push({ id: `equal:${candidate}:memory:${f.id}`, kind: 'p7-equal', variant: candidate,
        payload: { source: 'memory', fixture: f.id, settings: ['fixture', 'mem-below', 'mem-ref', 'mem-fast'], otherTree } });
    }
    items.push({ id: `equal:${candidate}:memory:sequence`, kind: 'p7-equal', variant: candidate, payload: { source: 'memory-sequence', otherTree } },
      { id: `equal:${candidate}:memory:capacity`, kind: 'p7-equal', variant: candidate, payload: { source: 'memory-capacity', otherTree } });
  }
  const counts = command === 'time' ? { kernel: 0, pm4: 0, memory: 0, time: 90 }
    : { kernel: 30, pm4: tier === 'quick' ? 112 : 676, memory: 7, time: 0 };
  check(isDeepStrictEqual(P.corpusCounts(items), counts), `${candidate}/${tier}: independent corpus counts`);
  return { items, counts, inputs: paths.map((path) => ({ path, sha256: fileHash(path) })), inputConstructor };
}
/** @param {string} task @param {string} step */
function runOf(task, step) {
  const dir = `${RAW}/${task}/${step}`;
  const declaration = json(`${dir}/experiment.json`);
  const state = json(`${dir}/state.json`);
  const log = lines(`${dir}/items.jsonl`);
  check(state.done === true && state.items.done === declaration.items.length && state.items.total === declaration.items.length, `${task}/${step}: incomplete state`);
  check(isDeepStrictEqual(declaration.candidate, recordedTree(declaration.candidate.variant))
    && isDeepStrictEqual(declaration.reference, reference) && isDeepStrictEqual(declaration.inputConstructor, inputConstructor), `${task}/${step}: tree refs`);
  return { declaration, state, lines: log };
}
/** @param {any} report */
function checkReportInputs(report) {
  check(report.meta.format === 'ig-p7-report' && report.meta.version === 1 && Array.isArray(report.meta.inputs), 'Bad report metadata');
  for (const i of report.meta.inputs) {
    check(fileHash(i.path) === i.sha256, `Changed/missing input ${i.path}`);
  }
}
/** @param {any[]} items */
function summarize(items) {
  const refMs = items.reduce((s, i) => s + i.refMs, 0);
  const candMs = items.reduce((s, i) => s + i.candMs, 0);
  return {
    n: items.length, capped: items.filter((i) => i.capped === 'both').length, refMs, candMs, ratio: refMs / candMs,
    geo: Math.exp(items.reduce((s, i) => s + Math.log(i.refMs / i.candMs), 0) / items.length),
    minRatio: Math.min(...items.map((i) => i.refMs / i.candMs)), maxRatio: Math.max(...items.map((i) => i.refMs / i.candMs)),
  };
}
const timing = json(`${E}/V4-P7/p7.json`);
checkReportInputs(timing);
const composites = [];
for (const candidate of CANDIDATES) {
  const timeRun = runOf('V4-P7', `time-${candidate}`);
  const t = P.timeVerdict({ ...timeRun, expected: { task: 'V4-P7', candidate }, corpus: corpusOf('time', candidate, null) });
  check(isDeepStrictEqual(t, timing.time[candidate]) && t.verdict === 'measured', `${candidate}: time verdict differs`);
  /** @type {Record<string, any>} */
  const tiers = {};
  /** @type {Record<string, any>} */
  const bindings = {};
  for (const tier of ['quick', 'full']) {
    const task = `V4-P7E-${candidate}-${tier}`;
    const report = json(`${E}/${task}/p7.json`);
    checkReportInputs(report);
    check(report.meta.inputs.length === 12 && new Set(report.meta.inputs.map((/** @type {any} */ i) => i.path)).size === 12,
      `${task}: required input index`);
    const run = runOf(task, 'equal');
    const e = P.equalVerdict({ ...run, expected: { task, candidate, tier }, manifest: memory, corpus: corpusOf('equal', candidate, tier) });
    check(isDeepStrictEqual(e, report.equal) && e.verdict === 'equal', `${task}: equality verdict differs`);
    check(isDeepStrictEqual(e.coverage.memory.slice(0, 5).map((/** @type {any} */ m) => [m.fixture, m.refBytes, m.listBytes, m.representation]), [
      ['mem-small', 41543, 48960, 'lists'], ['mem-mid', 857735, 1218816, 'lists'],
      ['mem-near-lists', 33072156, 80940, 'lists'], ['mem-near-reference', 33107689, 0, 'reference'],
      ['mem-above', 33630537, null, null],
    ]), `${task}: reported memory table`);
    check(isDeepStrictEqual(e.coverage.memory.slice(5).map((/** @type {any} */ m) => m.representation),
      ['lists', 'lists', 'lists', 'reference', 'lists', 'reference', 'lists', null, 'lists', 'lists', 'reference']),
    `${task}: reported sequence/capacity representations`);
    const binding = P.equalityBinding(report, { tier, candidate: timeRun.declaration.candidate,
      reference: timeRun.declaration.reference, fileHash, requiredInputs: P.equalityEvidencePaths(candidate, tier) });
    check(binding.ok, `${task}: failed binding ${JSON.stringify(binding)}`);
    bindings[tier] = binding;
    const ends = run.lines.filter((l) => l.type === 'item-end');
    const kernel = ends.filter((l) => l.item.startsWith(`equal:${candidate}:kernel:`));
    const canonicalLists = kernel.filter((l) => l.result.steps.some((/** @type {any} */ s) => s.setting === 'canonical' && s.representation === 'lists')).length;
    const memRef = ends.flatMap((l) => l.result.steps).filter((/** @type {any} */ s) => s.setting === 'mem-ref' && s.representation === 'reference').length;
    check(canonicalLists === 30 && memRef === 35, `${task}: lists/reference usage differs`);
    tiers[tier] = { items: e.items, equal: e.equal, lists: e.coverage.lists, reference: e.coverage.reference,
      memory: e.coverage.memory, memoryEntries: e.coverage.memory.length, budgetBreaks: e.coverage.budget.length,
      complete: e.coverage.complete, canonicalLists, memRef, binding };
  }
  const decision = P.goDecision({ quick: bindings.quick, full: bindings.full, timing: t });
  check(decision.go === false && isDeepStrictEqual(decision, timing.go[candidate]), `${candidate}: go differs`);
  const ended = timeRun.lines.filter((l) => l.type === 'item-end');
  const pairs = ended.map((l) => {
    const declaration = timeRun.declaration.items.find((/** @type {any} */ i) => i.id === l.item);
    check(l.status === 'completed' && l.result.outcome === 'ok' && l.result.same === true && ['both', 'none'].includes(l.result.capped), `${l.item}: bad timed outcome`);
    return { ...l.result, caseId: declaration.payload.seedText.slice('ig-v4/kernel/'.length), round: declaration.payload.round, id: l.item };
  });
  const all = summarize(pairs);
  near(all.refMs, t.refMs, `${candidate}: reference sum`);
  near(all.candMs, t.candMs, `${candidate}: candidate sum`);
  near(all.ratio, t.ratio, `${candidate}: ratio`);
  near(all.geo, t.geoRatio, `${candidate}: geo`);
  const byCase = Object.fromEntries(KERNEL.map((c) => [c, summarize(pairs.filter((p) => p.caseId === c))]));
  const byRound = Object.fromEntries([0, 1, 2].map((r) => [r, summarize(pairs.filter((p) => p.round === r))]));
  composites.push({ candidate, tiers, all, byCase, byRound, rated: summarize(pairs.filter((p) => p.capped === 'none')),
    capped: summarize(pairs.filter((p) => p.capped === 'both')), decision });
}

const k = json(`${E}/V4-S2K/kernel.json`);
const counters = KERNEL.map((caseId) => {
  const rows = k.rows.filter((/** @type {any} */ r) => r.caseId === caseId);
  check(rows.length === 6 && new Set(rows.map((/** @type {any} */ r) => r.subsetIndex)).size === 6
    && rows.every((/** @type {any} */ r) => r.status === 'completed' && r.outcome === 'ok' && r.same), `${caseId}: kernel counter rows`);
  const stored = k.perCase.find((/** @type {any} */ c) => c.caseId === caseId).sums;
  for (const field of Object.keys(stored)) {
    near(rows.reduce((/** @type {number} */ s, /** @type {any} */ r) => s + r.r4[field], 0), stored[field], `${caseId}: ${field}`);
  }
  const firstScanDead = stored.staticRows - stored.liveRows;
  const sixTimesTrailProxy = 6 * (stored.kills + stored.undoEntries);
  return { caseId, ...stored, firstScanDead, sixTimesTrailProxy, proxyRatio: sixTimesTrailProxy / firstScanDead };
});
const profiles = k.profile.records.map((/** @type {any} */ r) => {
  const profile = json(r.file);
  check(inputs.get(r.file)?.sha256Raw === r.sha256, `Profile hash changed: ${r.file}`);
  const nodes = new Map(profile.nodes.map((/** @type {any} */ n) => [n.id, n.callFrame]));
  /** @type {Record<string, number>} */
  const selfMs = {};
  let totalMs = 0;
  let deduceMs = 0;
  for (let i = 0; i < profile.samples.length; i += 1) {
    const frame = /** @type {any} */ (nodes.get(profile.samples[i]));
    const ms = profile.timeDeltas[i] / 1000;
    totalMs += ms;
    if (frame.url.endsWith('core/engine/deduce.js')) {
      deduceMs += ms;
      selfMs[frame.functionName] = (selfMs[frame.functionName] ?? 0) + ms;
    }
  }
  near(totalMs, r.totalMs, `${r.caseId}: profile total`);
  near(deduceMs, r.deduceMs, `${r.caseId}: profile deduction time`);
  const r4Share = selfMs.ruleR4 / deduceMs;
  const mutationMs = (selfMs.select ?? 0) + (selfMs.undo ?? 0) + (selfMs.kill ?? 0);
  return { caseId: r.caseId, totalMs, deduceMs, r4Ms: selfMs.ruleR4, r4Share,
    r4TotalShare: selfMs.ruleR4 / totalMs, selectUndoKillShare: mutationMs / deduceMs,
    selectUndoKillTotalShare: mutationMs / totalMs, diagnosticTotalAmdahlOnly: 1 / (1 - selfMs.ruleR4 / totalMs),
    diagnosticAmdahlOnly: 1 / (1 - r4Share) };
});
const plan = json('tools/ig-proto/plans/V4-P7.json');
const priced = price(plan.steps.filter((/** @type {any} */ s) => s.locked).map((/** @type {any} */ s) => s.price));
check(priced.admissible && priced.guardS <= 1200, 'P7 price exceeds approval');
const invocations = lines(`${RAW}/V4-P7/invocations.jsonl`);
check(invocations.length === 3 && invocations.every((r) => r.done && !r.killed && r.exit === 0 && r.quietS === 15 && r.horizonS <= 885), 'Invocation status');
const countedS = invocations.reduce((s, r) => s + r.countedSeconds, 0);
const beforeS = invocations[0].budget.roundCountedS;
const account = { countedS, countedMinutes: countedS / 60, beforeLoggedS: beforeS, afterLoggedS: beforeS + countedS,
  offLogS: 87.4, afterMinutes: (beforeS + countedS + 87.4) / 60, guardS: priced.guardS,
  cumulativeCap: Math.ceil((beforeS + 87.4 + priced.guardS) / 60) };
near(countedS, 801.167, 'Counted seconds');
check(account.cumulativeCap === 206, 'Wrong approval cap');
const runLog = read(`${RAW}/V4-P7/run-1.log`);
check(runLog.includes('firewall: OK, 289 production files unchanged') && runLog.includes('Plan V4-P7 finished:'), 'Run did not finish cleanly');
const opus = json('docs/improve-generating-stages-2-4/evidence/sa-opus/s02-numbers.json');
for (const c of composites) {
  const o = opus.composites.find((/** @type {any} */ row) => row.composite === c.candidate);
  near(r4(c.all.ratio), o.timing.ratio, `${c.candidate}: reported ratio`);
  near(r4(c.all.geo), o.timing.geoRatio, `${c.candidate}: reported geometric mean`);
  near(r3(c.all.refMs / 1000), o.timing.refS, `${c.candidate}: reported reference seconds`);
  near(r3(c.all.candMs / 1000), o.timing.candS, `${c.candidate}: reported candidate seconds`);
  check(c.all.n === 90 && c.all.capped === 33 && c.rated.n === 57, `${c.candidate}: timing counts`);
  for (const [caseId, group] of Object.entries(c.byCase)) {
    near(r4(group.ratio), o.byCase[caseId].ratio, `${c.candidate}/${caseId}: reported case ratio`);
    check(group.n === 18 && group.ratio < 1, `${c.candidate}/${caseId}: aggregate case`);
    const capped = { '10x10-nightmare': 0, '12x12-nightmare': 3, '14x14-nightmare': 12, '26x26-nightmare': 0, '26x26-hell-1': 18 };
    check(group.capped === capped[caseId], `${c.candidate}/${caseId}: capped pairs`);
  }
  for (const [round, group] of Object.entries(c.byRound)) {
    near(r4(group.ratio), o.byRound[round].ratio, `${c.candidate}/${round}: reported round ratio`);
    check(group.n === 30 && group.ratio < 1, `${c.candidate}/${round}: aggregate round`);
  }
  const roundRatios = Object.values(c.byRound).map((g) => g.ratio);
  check(Math.max(...roundRatios) - Math.min(...roundRatios) < 0.025, `${c.candidate}: order diagnostic`);
}
const referenceSums = composites.map((c) => c.all.refMs);
const referenceSpread = (Math.max(...referenceSums) - Math.min(...referenceSums)) / Math.min(...referenceSums);
for (const p of ['docs/improve-generating-stages-2-4/s02-spike-report.md',
  'tasks/improve-generating-stages-2-4/S02-run-v4-p7-and-spike-report.md', 'tasks/improve-generating-stages-2-4/check-list.md',
  'tools/ig-proto/p7-probe.mjs', 'tools/ig-proto/lib/lane-worker.mjs', 'tools/ig-proto/lib/p7-core.mjs',
  'tools/ig-proto/variants/r4c.json', 'tools/ig-proto/variants/p7-c1.json',
  'tests/artifacts/ig-proto/frozen-source/core/engine/deduce.js']) {
  read(p);
}
const out = {
  scope: 'Existing records and pure arithmetic/validators only. No engine, tree construction, git or measured run.',
  composites, counters, profiles, referenceSpread, account,
  counterLimits: [
    'r4c undoEntries counts every popped trail entry, including negative column-uncover markers; only row restorations relink lists.',
    'r4c staticRows/liveRows instrument the first R4 piece-column pass, not its later cleanup or cell-column scans.',
    '6*(kills+undoEntries)/(staticRows-liveRows) is an explanatory proxy, not the measured number of list updates per skipped R4 row.',
  ],
  inputs: [...inputs.values()],
};
writeFileSync(relative(process.cwd(), join(HERE, 's02-review-checks.json')), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({
  composites: composites.map((c) => ({ candidate: c.candidate,
    equality: Object.fromEntries(Object.entries(c.tiers).map(([tier, e]) => [tier, { items: e.items, equal: e.equal, lists: e.lists,
      reference: e.reference, memory: e.memoryEntries, budgetBreaks: e.budgetBreaks, bound: e.binding.ok }])),
    ratio: c.all.ratio, geo: c.all.geo, refS: c.all.refMs / 1000, candS: c.all.candMs / 1000,
    capped: c.all.capped, ratedOnlyRatio: c.rated.ratio, rounds: Object.values(c.byRound).map((g) => g.ratio), go: c.decision.go })),
  counters, profiles, referenceSpread, account, indexedInputs: inputs.size,
}, null, 2));
