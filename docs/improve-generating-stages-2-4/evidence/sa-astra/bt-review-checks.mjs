// @ts-check
// SA-Astra: read-only/static and synthetic checks of the stages-2-4 task pack at 57ef5cf.
// No tree is built, no engine/search/rating/generation/replay function runs, and no git is called.
// Only this script's new evidence file is written, in this folder.
// node --experimental-vm-modules docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import * as vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const PACK = join(ROOT, 'tasks', 'improve-generating-stages-2-4');
const text = (/** @type {string} */ p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const task = (/** @type {string} */ p) => text(join(PACK, p));
const sha = (/** @type {string | Buffer} */ s) => createHash('sha256').update(s).digest('hex');
const pathOf = (/** @type {string} */ p) => relative(ROOT, p).replaceAll('\\', '/');
const load = (/** @type {string[]} */ ...p) => import(pathToFileURL(join(ROOT, ...p)).href);
const M = await load('tools', 'ig-proto', 'manifest.mjs');
const P = await load('tools', 'ig-proto', 'lib', 'paths.mjs');
const V = await load('tools', 'ig-proto', 'verdicts.mjs');
const B = await load('tools', 'ig-proto', 'lib', 'budget.mjs');
const TREE = await load('tools', 'ig-proto', 'lib', 'tree.mjs');
const PM4 = await load('tools', 'ig-proto', 'pm4.mjs');
const { createFakeClock } = await load('tools', 'ig-proto', 'lib', 'fake-pool.mjs');
/** @type {Record<string, any>} */
const out = {};
/** @param {boolean} condition @param {string} message */
function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
/** @param {string} source @param {string} language @returns {string[]} */
function blocks(source, language) {
  const re = new RegExp('^( *)```' + language + '\\n([\\s\\S]*?)\\n\\1```$', 'gm');
  return [...source.matchAll(re)].map((m) => m[2].split('\n')
    .map((l) => l.slice(Math.min(m[1].length, l.length - l.trimStart().length))).join('\n') + '\n');
}
/** @param {string} source @param {string} name @returns {string} */
function innerFunction(source, name) {
  const from = source.indexOf(`  function ${name}(`);
  check(from >= 0, `missing inner function ${name}`);
  const end = source.indexOf('\n  }\n', from);
  check(end > from, `missing closing brace ${name}`);
  return source.slice(from, end + 5);
}

// Parse the exact JSON blocks, not the author's draft generator.
/** @type {Record<string, any>} */
const manifests = {};
/** @type {any[]} */
const additions = [];
for (const name of readdirSync(PACK).filter((n) => /^[TS][0-9].*\.md$/.test(n)).sort()) {
  for (const body of blocks(task(name), 'json')) {
    const m = JSON.parse(body);
    if (m.id !== undefined && Array.isArray(m.extends)) {
      check(manifests[m.id] === undefined, `duplicate variant ${m.id}`);
      manifests[m.id] = m;
    } else if (m.addTo !== undefined) {
      additions.push(m);
    }
  }
}
for (const a of additions) {
  manifests[a.addTo].edits.push(...a.edits);
}

// Reconstruct the three prose-specified kernel manifests from their literal blocks and cited frozen functions.
const frozenDeduce = text(join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'deduce.js'));
const c1 = blocks(task('T03b-p7-c1-live-row-lists.md'), 'js');
check(c1.length === 11, `C1 has ${c1.length} blocks, expected 11`);
const edit = (/** @type {string} */ id, /** @type {string} */ find, /** @type {string} */ replace) =>
  ({ id, file: 'core/engine/deduce.js', find, replace });
const r4 = innerFunction(frozenDeduce, 'ruleR4');
manifests['p7-c1'] = {
  id: 'p7-c1', extends: ['base'], files: [], params: {},
  edits: [
    edit('c1-1', '  const ws = model.cover.ws;\n', '  const ws = model.cover.ws;\n' + c1[0]),
    edit('c1-2', c1[1], c1[2]), edit('c1-3', c1[3], c1[4]), edit('c1-4', c1[5], c1[6]),
    edit('c1-5', c1[7], c1[7] + c1[8]),
    edit('c1-6', r4, r4.replace('ruleR4(', 'ruleR4Ref(') + '\n' + c1[9]),
    { id: 'c1-7', file: 'core/engine/deduce.js', append: c1[10] },
  ],
};
const r5 = innerFunction(frozenDeduce, 'ruleR5');
const r5blocks = blocks(task('T04-p7-r5-on-lists.md'), 'js');
manifests['p7-c1r5'] = {
  id: 'p7-c1r5', extends: ['p7-c1'], files: [], params: {},
  edits: [edit('r5-1', r5, r5.replace('ruleR5(', 'ruleR5Ref(') + '\n' + r5blocks[0])],
};
const c5 = blocks(task('T05a-p7-c5-select-on-lists.md'), 'js');
check(c5.length === 4, `C5 has ${c5.length} blocks, expected 4`);
manifests['p7-c1r5c5'] = {
  id: 'p7-c1r5c5', extends: ['p7-c1r5'], files: [], params: {},
  edits: [
    edit('c5-1', c5[0], c5[1]),
    edit('c5-2', '  function liveRowOf(c) {\n    const to = colStart[c + 1];\n', c5[2]),
    edit('c5-3', '  function listRows(c, base) {\n    let end = base;\n    const to = colStart[c + 1];\n', c5[3]),
  ],
};
const sources = TREE.collectSources();
out.anchors = [];
for (const id of Object.keys(manifests).sort()) {
  /** @type {string[]} */
  const errors = [];
  const plan = TREE.planTree(id, { manifests, sources, errors });
  const pending = errors.filter((e) => e.includes('parameter file data/prior-s3-v1.json does not exist'));
  const failures = errors.filter((e) => !pending.includes(e));
  const touched = new Set(plan.edits.map((/** @type {any} */ e) => e.file));
  for (const file of touched) {
    new (/** @type {any} */ (vm).SourceTextModule)(String(plan.files.get(file)), { identifier: `${id}/${file}` });
  }
  out.anchors.push({ id, edits: plan.edits.length, pending, failures, parsed: touched.size });
  check(failures.length === 0, `anchor failures ${id}: ${failures.join('; ')}`);
}

// T01b's regex sees its own proposed test source, although it passes the old source.
const gitBlocks = blocks(task('T01b-git-guard.md'), 'js');
const regexLine = gitBlocks[0].split('\n')[0];
const gitCall = new Function(`${regexLine}\nreturn GIT_CALL;`)();
const gitFixtureSource = gitBlocks[2];
const selfTest = text(join(ROOT, 'tools', 'ig-proto', 'self-test.mjs'));
out.gitGuard = {
  baseSelfTestMatches: gitCall.test(selfTest),
  proposedFixtureSourceMatches: gitCall.test(gitFixtureSource),
  firstFixtureMatch: gitFixtureSource.match(gitCall)?.[0],
  quotedPathWithSpaceMatches: gitCall.test('$head = @(& git -C "Q:\\a b" rev-parse HEAD)'),
};
check(out.gitGuard.proposedFixtureSourceMatches, 'the proposed source no longer reproduces the self-match');

// T03a's full-tier arithmetic and the concrete Map return type of screenValues.
out.pm4 = [];
let quick = 0;
let full = 0;
let screenSettings = 0;
for (const cell of ['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-hell-1', '26x26-master', '26x26-nightmare']) {
  const file = P.artifactDir('frozen', 'IGP-02', 'main', cell, 'calls.json');
  const calls = JSON.parse(readFileSync(file, 'utf8'));
  const profiles = calls.sets.filter((/** @type {any} */ s) => s.pieces !== null).flatMap((/** @type {any} */ s) => PM4.profilesOf(s));
  const q = profiles.filter((/** @type {any} */ p) => p.order < 4).length;
  const first = profiles.filter((/** @type {any} */ p) => p.order === 0);
  const entries = first.flatMap((/** @type {any} */ p) => [...PM4.screenValues(p.record, calls.limits.work)]);
  quick += q;
  full += profiles.length;
  screenSettings += entries.length;
  out.pm4.push({ cell, profiles: profiles.length, quick: q, firstProfiles: first.length, screenSettings: entries.length, firstScreenValue: entries[0] });
}
out.pm4Totals = { quick, full, screenSettings, kernelItems: 30, quickItems: quick + 30, fullItems: full + 30 };

// Prices recomputed through the actual pure builders and their current read-only inputs.
const factor = M.factor();
const durations = M.durationsFromLogs();
const rowS = (/** @type {any} */ g) => M.projectedRowS({ refS: M.refS(g.cell), factor, rowLimitS: g.rowLimitS });
const rowSteps = (/** @type {string} */ taskId, /** @type {string} */ arm, /** @type {string[]} */ cells) =>
  cells.map((cell) => {
    const g = { task: taskId, arm, shard: `pilot-${cell}`, cell, from: 0, to: 4, rows: 5, rowLimitS: 260 };
    return M.rowStep(g, M.stepPrice, rowS(g));
  });
const price = (/** @type {string} */ id, /** @type {any[]} */ steps) => {
  const plan = M.planOf({ task: id, generatedBy: 'review', runnable: true, blockedBy: [], prerequisites: [], steps });
  return { allocationMinutes: plan.allocationMinutes, guardS: M.planGuardS(plan), guardMin: M.planGuardS(plan) / 60 };
};
const controls = ['3x29-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare', '24x24-nightmare'];
const arms = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
const hell = ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const s2b = rowSteps('V4-S2B', 'fr-none', controls);
const proofs = arms.flatMap((arm) => M.parityPass('V4-S3P', arm, M.stepPrice, durations));
const hellRows = rowSteps('V4-S3P', 'fr-frozen-none-uncapped', hell);
out.prices = { s2b: price('V4-S2B', s2b), proofs: price('proofs', proofs), hell: price('hell', hellRows), s3p: price('V4-S3P', [...proofs, ...hellRows]) };
const kernels = JSON.parse(readFileSync(P.evidenceDir('frozen', 'V4-S2K', 'kernel.json'), 'utf8'));
const timingDurations = Array.from({ length: 3 }, () => kernels.rows.map((/** @type {any} */ r) => r.itemMs * 1.25 / 1000)).flat();
out.prices.p7 = [1, 2, 3].map((n) => {
  const steps = Array.from({ length: n }, (_, i) => {
    const input = { type: 'items', groups: [{ kind: 'p7-time', variant: `c${i}`, lanes: 1, reserveS: 90, durationsS: timingDurations }] };
    const priced = M.stepPrice(input);
    check(priced.admissible, `P7 step ${i} not admissible`);
    return { id: `time-${i}`, locked: true, optional: false, projectS: priced.projectS, invocations: priced.invocations, price: input };
  });
  return { candidates: n, ...price('V4-P7', steps) };
});
const data = M.matrixData();
const expansion = M.expandMatrix(data, { controls: M.controlsFrom(P.mp12b1Report, data.cells.failingNightmare) });
const pilots = Object.fromEntries(data.cells.hell1Conditional.map((/** @type {string} */ c) => [c, []]));
for (const n of readdirSync(P.evidenceDir('frozen', 'V4-S2', 'fr-base')).filter((n) => n.endsWith('.runs.json'))) {
  const doc = JSON.parse(readFileSync(P.evidenceDir('frozen', 'V4-S2', 'fr-base', n), 'utf8'));
  for (const row of doc.rows) {
    if (Object.hasOwn(pilots, row.caseId) && row.rep >= 0 && row.rep <= 4) {
      pilots[row.caseId].push(row.run);
    }
  }
}
const ph = { path: 'review-only', sha256: '0'.repeat(64) };
out.activation = [];
for (const approvedOptional of [[], ['S4-6']]) {
  const record = M.activation(expansion, { pilots, approvedOptional, epoch: { data: ph, freeze: ph, universe: ph } });
  const { plan, template } = M.activationPlans(expansion, record, M.stepPrice, { activationSha256: ph.sha256, durations, rowSOf: rowS });
  out.activation.push({
    approvedOptional, groups: record.groups.length, rows: record.declaredRows.length, cells: template.cells.length,
    steps: plan.steps.length, locked: plan.steps.filter((/** @type {any} */ s) => s.locked).length,
    allocationMinutes: plan.allocationMinutes, guardS: M.planGuardS(plan), conditional: record.conditional,
  });
}
const loggedS = B.totals(B.readInvocations('frozen'), '').roundCountedS;
out.account = { loggedS, offLogS: 87.4, countedMinutes: (loggedS + 87.4) / 60, s2bFirstCap: Math.ceil((loggedS + 87.4 + out.prices.s2b.guardS) / 60) };

// P7's memory inequality is checked before the reference slots are allocated. A pure byte counterexample.
const before = 4000;
const referenceSlots = 1000;
const extra = 500;
const capacity = before + referenceSlots + extra - 1;
out.p7Memory = {
  before, referenceSlots, extra, capacity,
  specifiedUseLists: referenceSlots + extra <= 32 * 1024 * 1024 && before + extra <= capacity,
  referenceFits: before + referenceSlots <= capacity,
  combinedAfterSlots: before + referenceSlots + extra,
  combinedExceedsCapacity: before + referenceSlots + extra > capacity,
};

// Execute only the proposed pure host wrapper against a never-settling Promise and a fake clock.
const boundSource = manifests.live.edits.find((/** @type {any} */ e) => e.id === 'lv-13').append.replace(/^import .*\n/gm, '');
const deadline = { levels: ['hard'], responseBoundMs: 120000, hostMarginMs: 1000 };
const bounded = new Function('IG_HOST', `${boundSource}\nreturn igBounded;`)({ liveDeadline: deadline });
const clock = createFakeClock();
const s = { t0: clock.now(), accepted: [{ id: 'synthetic-only' }], acceptedAt: [clock.now()] };
let cancelled = false;
const pending = bounded(s, { levelId: 'hard' }, clock, { cancel() { cancelled = true; } }, new Promise(() => {}));
clock.advance(119000);
const result = await pending;
out.hostBound = {
  atMs: clock.now() - s.t0, cancelled, resultKeys: Object.keys(result),
  accepted: result.accepted.length, made: result.made, hasPack: Object.hasOwn(result, 'pack'),
};

// Pure dispatch-order calculation, not a client request: all slot-0 outcomes are distinct accepted candidates
// as promised by T07c's fixture. A task costs 30 s; expiry at 115 s precedes the next 5-s polling turn.
const frozenGenerate = text(join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'generate.js'));
const dispatchFrom = frozenGenerate.indexOf('export function dispatchOrder(');
const dispatchTo = frozenGenerate.indexOf('\n}\n', dispatchFrom) + 3;
const dispatchOrder = new Function('BUDGETS', frozenGenerate.slice(dispatchFrom, dispatchTo)
  .replace('export function ', 'function ') + '\nreturn dispatchOrder;')({ slotAttempts: 12 });
out.widthTrace = [];
for (const width of [1, 2, 4, 8]) {
  const state = { status: 'running', slot: 1, attempt: 0, quantity: 10 };
  /** @type {Map<string, { slot: number, attempt: number, sent: number, done: boolean }>} */
  const cache = new Map();
  const key = (/** @type {number} */ slot, /** @type {number} */ attempt) => `${slot}/${attempt}`;
  let now = 0;
  const settleDispatch = () => {
    while (state.status === 'running') {
      const active = [...cache.values()].filter((e) => !e.done).length;
      for (const entry of dispatchOrder(state, (/** @type {number} */ slot, /** @type {number} */ attempt) =>
        cache.has(key(slot, attempt)), width - active)) {
        cache.set(key(entry.slot, entry.attempt), { ...entry, sent: now, done: false });
      }
      const awaited = cache.get(key(state.slot, 0));
      if (awaited?.done !== true) {
        return;
      }
      state.slot += 1;
      if (state.slot === 11) {
        state.status = 'complete';
      }
    }
  };
  settleDispatch();
  while (state.status !== 'complete' && now < 115000) {
    now += 5000;
    if (now >= 115000) {
      break;
    }
    for (const entry of cache.values()) {
      if (!entry.done && entry.sent + 30000 <= now) {
        entry.done = true;
      }
    }
    settleDispatch();
  }
  out.widthTrace.push({ width, accepted: state.slot - 1, atMs: now, status: state.status === 'complete' ? 'complete' : 'partial' });
}
check(isDeepStrictEqual(out.widthTrace.map((/** @type {any} */ r) => r.accepted), [3, 6, 10, 10]), 'unexpected scripted prefix arithmetic');

// T09a's proposed row rules do not reject these rows; the existing ingestion rule does.
const exampleRun = JSON.parse(readFileSync(P.evidenceDir('frozen', 'V4-S2', 'fr-base', 'pilot-14x14-nightmare.runs.json'), 'utf8')).rows[0].run;
const baseRun = {
  ...exampleRun,
  caseId: '14x14-nightmare', seed: 'landscape/14x14-nightmare/0', probeKind: 'generation', rep: 0,
  responseMs: 100000, igSetMs: 30000, igAcceptedMs: [], acceptedCount: 0, tenthReadyMs: null, partialReason: 'time-limit',
  errors: [], measurementValid: true, interrupted: false,
};
check(V.runStatus(baseRun, { quantity: 10 }).status === 'valid', 'synthetic baseline is not a valid row');
const proposedFailures = (/** @type {any} */ r) => [
  ...(r.errors.some((/** @type {any} */ e) => e.code === 'child-timeout') ? ['killed'] : []),
  ...(typeof r.responseMs !== 'number' || r.responseMs > 120000 ? ['response'] : []),
  ...(r.partialReason?.startsWith('error:') ? ['partialReason'] : []),
  ...(typeof r.igSetMs === 'number' && r.igSetMs > 48000 ? ['set'] : []),
];
out.liveRows = Object.entries({
  negativeResponse: { ...baseRun, responseMs: -1 },
  censored: { ...baseRun, measurementValid: false },
  cancelled: { ...baseRun, interrupted: true, partialReason: 'cancelled' },
  wrongSeed: { ...baseRun, seed: 'wrong' },
  nullSetOnComplete: { ...baseRun, acceptedCount: 10, tenthReadyMs: 90000, partialReason: null, igSetMs: null },
  veryLateReserveCut: { ...baseRun, responseMs: 110000, partialReason: 'set:reserve-cut', igSetMs: null },
}).map(([name, run]) => {
  const { status, problems } = V.ingestRow({ rowKey: '14x14-nightmare~0', caseId: '14x14-nightmare', rep: 0, seed: baseRun.seed, run }, { quantity: 10 });
  return { name, proposedFailures: proposedFailures(run), ingested: { status, problems } };
});

const fitBlock = blocks(task('T12-freeze-record.md'), 'js')[0].replace(/^export /gm, '');
const fitInputs = new Function(fitBlock + '\nreturn FIT_INPUTS;')();
out.fitIndex = {
  count: fitInputs.length,
  includesStage2ScreenRuns: fitInputs.some((/** @type {string} */ p) => p.includes('/V4-S2/fr-screen/')),
  includesStage2NoScreenRuns: fitInputs.some((/** @type {string} */ p) => p.includes('/V4-S2/fr-none/')),
  fittingScriptsListed: fitInputs.filter((/** @type {string} */ p) => p.endsWith('.mjs')),
  includesSaEvidenceIndex: fitInputs.some((/** @type {string} */ p) => p.includes('/evidence/sa-')),
};

// A shorter fixture of the timing rule: one differing pair still meets its present go predicate.
out.p7Go = { quick: 'equal', full: 'equal', timingVerdict: 'measured', items: 90, notSame: ['time:c:0'], ratio: 1.04 };
out.p7Go.specifiedGo = out.p7Go.quick === 'equal' && out.p7Go.full === 'equal' && out.p7Go.ratio >= 1.04;

const taskFiles = readdirSync(PACK).filter((n) => n.endsWith('.md') && n !== 'review-1.md').sort();
out.inputs = taskFiles.map((name) => ({ path: pathOf(join(PACK, name)), sha256: sha(readFileSync(join(PACK, name))) }));
out.codeChecks = [
  'tools/ig-proto/lib/items.mjs', 'tools/ig-proto/lib/tree.mjs', 'tools/ig-proto/lib/proof.mjs',
  'tools/ig-proto/lib/records.mjs', 'tools/ig-proto/manifest.mjs', 'tools/ig-proto/verdicts.mjs',
  'tools/ig-proto/pm4.mjs', 'tools/ig-proto/self-test.mjs', 'tools/ig-proto/arm.mjs',
].map((p) => ({ path: p, sha256: sha(readFileSync(P.abs(p))) }));
out.noEngineExecution = true;
check(isDeepStrictEqual(out.prices.s2b.allocationMinutes, 23), 'unexpected S2B price');
check(out.pm4Totals.full === 676 && out.pm4Totals.quick === 112, 'unexpected PM4 profile coverage');
writeFileSync(relative(process.cwd(), join(HERE, 'bt-review-checks.json')), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({
  variantsParsed: out.anchors.length, anchors: out.anchors.map((/** @type {any} */ r) => [r.id, r.edits]),
  gitGuard: out.gitGuard, pm4: out.pm4Totals, prices: out.prices, account: out.account,
  p7Memory: out.p7Memory, hostBound: out.hostBound, liveRows: out.liveRows.map((/** @type {any} */ r) =>
    ({ name: r.name, proposedFailures: r.proposedFailures, status: r.ingested.status })), p7Go: out.p7Go, widthTrace: out.widthTrace,
}, null, 2));
