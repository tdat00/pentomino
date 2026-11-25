// @ts-check
// SA-Astra: revision-two static/pure review checks. No git, engine, rating, generation or timed run.
// The only write is this new script's JSON in its own evidence folder.
// node --experimental-vm-modules docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review2-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import * as vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const PACK = join(ROOT, 'tasks', 'improve-generating-stages-2-4');
const pathOf = (/** @type {string} */ p) => relative(ROOT, p).replaceAll('\\', '/');
const sha = (/** @type {string | Buffer} */ s) => createHash('sha256').update(s).digest('hex');
const text = (/** @type {string} */ p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const task = (/** @type {string} */ n) => text(join(PACK, n));
const load = (/** @type {string[]} */ ...p) => import(pathToFileURL(join(ROOT, ...p)).href);
const TREE = await load('tools', 'ig-proto', 'lib', 'tree.mjs');
const P = await load('tools', 'ig-proto', 'lib', 'paths.mjs');
const V = await load('tools', 'ig-proto', 'verdicts.mjs');
const I = await load('tools', 'ig-proto', 'lib', 'items.mjs');
const { createFakeClock } = await load('tools', 'ig-proto', 'lib', 'fake-pool.mjs');
/** @type {Record<string, any>} */
const out = {};
/** @param {boolean} value @param {string} why */
function check(value, why) {
  if (!value) {
    throw new Error(why);
  }
}
/** @param {string} source @param {string} language @returns {string[]} */
function blocks(source, language) {
  return [...source.matchAll(new RegExp('^( *)```' + language + '\\n([\\s\\S]*?)\\n\\1```$', 'gm'))]
    .map((m) => m[2].split('\n').map((l) => l.slice(Math.min(m[1].length, l.length - l.trimStart().length))).join('\n') + '\n');
}
/** @param {string} source @param {string} name @param {string} indent */
function sourceFunction(source, name, indent = '') {
  const at = source.indexOf(`${indent}function ${name}(`);
  check(at >= 0, `missing function ${name}`);
  const end = source.indexOf(`\n${indent}}\n`, at);
  check(end > at, `missing function end ${name}`);
  return source.slice(at, end + indent.length + 3);
}
const taskFiles = readdirSync(PACK).filter((n) => /^[TS][0-9].*\.md$/.test(n)).sort();
const checklist = task('check-list.md');
const indexIds = [...checklist.matchAll(/^- \[ \] ([TS]\d+[a-z]?) /gm)].map((m) => m[1]);
const filenames = taskFiles.map((n) => n.split('-')[0]);
check(indexIds.length === 34 && new Set(indexIds).size === 34, 'the index is not 34 distinct tasks');
check(isDeepStrictEqual([...indexIds].sort(), [...filenames].sort()), 'index and filenames differ');
const hours = taskFiles.map((n) => ({ file: n, h: Number(/\| Estimate \| developer ([\d.]+) h/.exec(task(n))?.[1] ?? 0) }));
const totalHours = hours.reduce((a, r) => a + r.h, 0);
check(totalHours === 64.5 && hours.every((r) => r.h <= 3), 'hours differ');
const brokenLinks = [...checklist.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1])
  .filter((p) => !existsSync(join(PACK, ...p.split('/'))));
check(brokenLinks.length === 0, 'broken checklist links');
out.index = { tasks: indexIds.length, ids: indexIds, totalHours, maximumTaskHours: Math.max(...hours.map((r) => r.h)), brokenLinks };

// Exact JSON manifests of the tasks, plus the prose-specified kernel edits, applied in memory only.
/** @type {Record<string, any>} */
const manifests = {};
/** @type {any[]} */
const additions = [];
for (const name of taskFiles) {
  for (const body of blocks(task(name), 'json')) {
    const obj = JSON.parse(body);
    if (obj.id !== undefined && Array.isArray(obj.extends)) {
      check(manifests[obj.id] === undefined, `duplicate variant ${obj.id}`);
      manifests[obj.id] = obj;
    } else if (obj.addTo !== undefined) {
      additions.push(obj);
    }
  }
}
for (const a of additions) {
  manifests[a.addTo].edits.push(...a.edits);
}
const deduceSource = text(join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'deduce.js'));
const c1 = blocks(task('T03c-p7-c1-live-row-lists.md'), 'js');
check(c1.length === 11, `C1 block count ${c1.length}`);
const edit = (/** @type {string} */ id, /** @type {string} */ find, /** @type {string} */ replace) =>
  ({ id, file: 'core/engine/deduce.js', find, replace });
const marker = '  // Reused slots hold unspecified data: everything read below is initialised first.\n';
const r4 = sourceFunction(deduceSource, 'ruleR4', '  ');
const r5 = sourceFunction(deduceSource, 'ruleR5', '  ');
manifests['p7-c1'] = {
  id: 'p7-c1', extends: ['base'], files: [], params: {},
  edits: [
    edit('c1-1', marker, marker + c1[0]), edit('c1-2', c1[1], c1[2]), edit('c1-3', c1[3], c1[4]),
    edit('c1-4', c1[5], c1[6]), edit('c1-5', c1[7], c1[7] + c1[8]),
    edit('c1-6', r4, r4.replace('ruleR4(', 'ruleR4Ref(') + '\n' + c1[9]),
    { id: 'c1-7', file: 'core/engine/deduce.js', append: c1[10] },
  ],
};
manifests['p7-c1r5'] = {
  id: 'p7-c1r5', extends: ['p7-c1'], files: [], params: {},
  edits: [edit('r5-1', r5, r5.replace('ruleR5(', 'ruleR5Ref(') + '\n' + blocks(task('T04-p7-r5-on-lists.md'), 'js')[0])],
};
const c5 = blocks(task('T05a-p7-c5-select-on-lists.md'), 'js');
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
  check(failures.length === 0, `bad anchors ${id}: ${failures.join('; ')}`);
}

// R02's eleven samples and the actual in-memory edited self-test source.
const g = blocks(task('T01b-git-guard.md'), 'js');
const regex = new Function(g[0].split('\n')[0] + '\nreturn GIT_CALL;')();
const selftestSource = text(join(ROOT, 'tools', 'ig-proto', 'self-test.mjs'));
check(selftestSource.includes(g[1]), 'git guard old loop no longer matches');
const revisedSelftest = selftestSource.replace(/^const GIT_CALL = .*$/m, g[0].trimEnd()).replace(g[1], g[2]);
const samples = JSON.parse(blocks(task('T01b-git-guard.md'), 'json')[0]);
out.gitGuard = {
  sourceMatches: regex.test(revisedSelftest),
  samples: samples.map((/** @type {any[]} */ [s, expected]) => ({ text: s, expected, actual: regex.test(s) })),
};
check(!out.gitGuard.sourceMatches && out.gitGuard.samples.every((/** @type {any} */ r) => r.actual === r.expected), 'git guard regression');

// Memory fixtures: geometry and the actual source's slot-table/model-arena formulas only; no model is built.
const memory = JSON.parse(blocks(task('T03a-p7-probe-items.md'), 'json')[0]);
const slotTable = new Function(sourceFunction(deduceSource, 'slotTable') + '\nreturn slotTable;')();
const workspaceSource = text(join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'workspace.js'));
const modelFormula = [
  workspaceSource.match(/^const DLX_NAMES = .*$/m)?.[0],
  workspaceSource.match(/^const STACK_NAMES = .*$/m)?.[0],
  sourceFunction(workspaceSource, 'dlxSlotList'),
  sourceFunction(workspaceSource, 'modelSlots'),
  sourceFunction(workspaceSource, 'modelBytes'),
  'return modelBytes;',
].join('\n');
const modelBytes = new Function(modelFormula)();
out.memory = memory.fixtures.map((/** @type {any} */ f) => {
  const NP = f.pieces;
  const NC = f.width * f.height;
  const cells = f.a * f.b;
  const placements = (/** @type {number} */ a, /** @type {number} */ b) =>
    Math.max(0, f.width - a + 1) * Math.max(0, f.height - b + 1);
  const R = NP * (placements(f.a, f.b) + (f.a === f.b ? 0 : placements(f.b, f.a)));
  const NZ = R * (cells + 1);
  const C = NC + NP;
  const ref = slotTable(R, C, NZ, NP, NC, NC).reduce((/** @type {number} */ sum, /** @type {any[]} */ [, kind, len]) =>
    sum + len * (kind === 'int32' ? 4 : 1), 0);
  const arena = modelBytes({ columns: C, width: f.width, height: f.height, freePieceCount: NP }, R, NZ);
  const lists = 4 * (3 * NZ + 2 * C);
  check([R, NZ, C, ref, arena, lists].every((v, i) => v === [f.rows, f.nonzeros, f.columns, f.refBytes, f.arenaBytes, f.listBytes][i]), `fixture formula differs ${f.id}`);
  return { id: f.id, rows: R, nonzeros: NZ, columns: C, refBytes: ref, arenaBytes: arena, listBytes: lists, belowLimit: memory.limit - ref };
});

// The corrected list allocator can be tested independently with 500-byte synthetic allocations.
const arraysOf = new Function(c1[10].replace(/^export /gm, '') + '\nreturn igListArrays;')();
const fake = (/** @type {number} */ b, /** @type {number} */ cap) => ({ bytes: () => b, capacityBytes: cap });
out.listStorage = {
  capacity5499FallsBack: arraysOf(1000, Infinity, fake(5000, 5499), 35, 10) === null,
  capacity5500UsesLists: arraysOf(1000, Infinity, fake(5000, 5500), 35, 10) !== null,
  hasWeakMapCache: c1[10].includes('WeakMap'),
};
check(out.listStorage.capacity5499FallsBack && out.listStorage.capacity5500UsesLists && !out.listStorage.hasWeakMapCache, 'storage fix does not hold');

// The exact proposed host wrapper, on promises and a fake clock only (not the generation client).
const boundSource = manifests.live.edits.find((/** @type {any} */ e) => e.id === 'lv-14').append.replace(/^import .*\n/gm, '').replace(/^export /gm, '');
const igBoundStart = new Function('IG_HOST', boundSource + '\nreturn igBoundStart;')({
  liveDeadline: { levels: ['hard'], responseBoundMs: 120000, hostMarginMs: 1000 },
});
const clock = createFakeClock();
const origin = clock.now();
let cancels = 0;
const bound = igBoundStart({ t0: origin }, { levelId: 'hard' }, clock, { cancel() { cancels += 1; } });
/** @type {(v: any) => void} */
let complete = () => {};
const batch = new Promise((resolve) => { complete = resolve; });
let state = 'pending';
let response = null;
bound.batch(batch).then((value) => { state = 'resolved'; response = { at: clock.now() - origin, value }; });
clock.advance(120000);
await Promise.resolve();
await Promise.resolve();
out.batchBound = { at120000: state, cancels };
clock.advance(5000);
complete({ status: 'partial', reason: 'time-limit', accepted: [{ id: 'p' }], made: { p: { kind: 'candidate' } }, pack: { synthetic: true } });
await Promise.resolve();
await Promise.resolve();
out.batchBound.response = response;
bound.clear();
check(out.batchBound.at120000 === 'pending' && response?.at === 125000, 'bound counterexample changed');

const setClock = createFakeClock();
const setOrigin = setClock.now();
const setBound = igBoundStart({ t0: setOrigin }, { levelId: 'hard' }, setClock, { cancel() {} });
const setPromise = new Promise((resolve) => setClock.setTimeout(() => resolve({ status: 'failed', reason: 'reserve-cut', failures: {} }), 46000));
let setState = 'pending';
let setResult = null;
setBound.set(setPromise).then((value) => { setState = 'resolved'; setResult = value; });
setClock.advance(118999);
await Promise.resolve();
await Promise.resolve();
out.reserveBeforeHostBound = { at: 118999, state: setState, result: setResult };
setBound.clear();

// Existing ingestion accepts a self-consistent wrong seed; T02c still must compare it with fitScope.
const example = JSON.parse(readFileSync(P.evidenceDir('frozen', 'V4-S2', 'fr-base', 'pilot-14x14-nightmare.runs.json'), 'utf8')).rows[0];
const wrong = structuredClone(example);
wrong.seed = 'landscape/14x14-nightmare/20';
wrong.run.seed = wrong.seed;
const judged = V.ingestRow(wrong, { quantity: 10 });
out.prefixWrongSeed = { rowKey: wrong.rowKey, expected: 'landscape/14x14-nightmare/0', actual: wrong.seed, ingestStatus: judged.status };
check(judged.status === 'valid', 'wrong-seed counterexample changed');

// Compare the revised report's enumerated identity checks with the actual protocol's pure log checker.
const items = [{ id: 'n0', kind: 'p7-equal', variant: 'p7-x', payload: {} }];
const stored = { frozenCommit: 'f', sourceDigest: 's', treeIds: { 'p7-x': 'T1' }, harnessHash: 'old', manifestHash: I.manifestHash(items) };
const endsOnly = [{ type: 'item-end', item: 'n0', identityHash: I.identityHash(stored), status: 'completed', result: { outcome: 'ok', same: true } }];
out.p7Log = {
  oldIdentityMatchesAllLogHashes: endsOnly.every((l) => l.identityHash === I.identityHash(stored)),
  producerInDeclaration: 'new',
  producerInState: stored.harnessHash,
  resumePlan: I.resumePlan(items, endsOnly, stored, stored),
};

// Scope/default wiring, inspected without invoking future modules.
const freezeCreate = task('T08b-freeze-checks.md');
const fitTask = task('T12a-fit-index.md');
out.splitImports = {
  freezeCreationImportsReadRepoFile: /Imports:[\s\S]*readRepoFile/.test(freezeCreate.slice(0, freezeCreate.indexOf('2. Export'))),
  fitTaskAddsReadRepoFileImport: /import.*readRepoFile|readRepoFile.*from/.test(fitTask),
  fitTaskAddsSha256TextImport: /import.*sha256Text|sha256Text.*from/.test(fitTask),
};
const levels = text(join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'levels.js'));
const areas = levels.slice(levels.indexOf('const AREAS = ['), levels.indexOf('const HELL_ID'));
check(areas.includes('[Infinity, Infinity]'), 'source offer table changed');
out.kernelInput = {
  candidateParents: manifests['p7-c1'].extends,
  sourceGuard: text(join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'policy.js')).includes('if (area < lv.areas[0] || area > lv.areas[1]) return null;'),
  existingBaseTestRejectsHell: selftestSource.includes("same(carve(base, '26x26-hell-1'), { ok: false, reason: 'not-offered' }"),
  corpusIncludesHell: task('T03a-p7-probe-items.md').includes("'26x26-hell-1'"),
  expectedNoSetKernelItems: 6,
  basis: 'Source trace only: base offer guard -> carveSet not-offered -> firstCarvedSet no-carve; no engine executed.',
};

// Prices use the existing pure builders. Added bind steps are unlocked and do not change these prices.
const M = await load('tools', 'ig-proto', 'manifest.mjs');
const factor = M.factor();
const durations = M.durationsFromLogs();
const rowsOf = (/** @type {string} */ name, /** @type {string} */ arm, /** @type {string[]} */ cells) => cells.map((cell) => {
  const g = { task: name, arm, cell, shard: `pilot-${cell}`, from: 0, to: 4, rows: 5, rowLimitS: 260 };
  return M.rowStep(g, M.stepPrice, M.projectedRowS({ refS: M.refS(cell), factor, rowLimitS: 260 }));
});
const priceOf = (/** @type {any[]} */ steps) => {
  const p = M.planOf({ task: 'review', generatedBy: 'review', runnable: true, blockedBy: [], prerequisites: [], steps });
  return { allocationMinutes: p.allocationMinutes, guardMinutes: M.planGuardS(p) / 60 };
};
const s2bRows = rowsOf('V4-S2B', 'fr-none', ['3x29-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare', '24x24-nightmare']);
const proofSteps = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'].flatMap((a) => M.parityPass('V4-S3P', a, M.stepPrice, durations));
const hellRows = rowsOf('V4-S3P', 'fr-frozen-none-uncapped', ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']);
const k = JSON.parse(readFileSync(P.evidenceDir('frozen', 'V4-S2K', 'kernel.json'), 'utf8'));
const ds = Array.from({ length: 3 }, () => k.rows.map((/** @type {any} */ r) => r.itemMs * 1.25 / 1000)).flat();
const timeSteps = Array.from({ length: 3 }, (_, n) => {
  const input = { type: 'items', groups: [{ kind: 'p7-time', variant: `c${n}`, lanes: 1, reserveS: 90, durationsS: ds }] };
  const priced = M.stepPrice(input);
  return { locked: true, optional: false, projectS: priced.projectS, invocations: priced.invocations, price: input };
});
out.prices = { s2b: priceOf(s2bRows), s3p: priceOf([...proofSteps, ...hellRows]), p7: priceOf(timeSteps) };
const producerExample = [{ name: 'a', published: 'h', raw: 'h' }, { name: 'b', published: 'g', raw: 'h' }];
out.liveProducerFixture = {
  firstProblem: producerExample.find((r) => r.published !== r.raw)?.name,
  prescribedFirstReason: 'runs file b differs from its raw shard',
  tableExpects: 'the runs files name 2 producers',
};

// Repaired files: full read, legal encoding/line ends and stable source hashes for this review.
out.repaired = ['check-list.md', 'S03-run-v4-s3p.md', 'T06a-prior-s3-v1.md', 'T09c-accept-live-deadline.md'].map((name) => {
  const b = readFileSync(join(PACK, name));
  const s = new TextDecoder('utf-8', { fatal: true }).decode(b);
  const validFormat = !(b[0] === 239 && b[1] === 187 && b[2] === 191) && !/(?<!\r)\n|\r(?!\n)/.test(s)
    && s.endsWith('\r\n') && !/[ \t]+\r?$/m.test(s) && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);
  check(validFormat, `format of repaired file ${name}`);
  return { path: pathOf(join(PACK, name)), sha256: sha(b), validFormat, lines: s.split('\r\n').length - 1 };
});
out.inputs = [...taskFiles, 'check-list.md', 'review-1-response.md'].map((name) => ({
  path: pathOf(join(PACK, name)), sha256: sha(readFileSync(join(PACK, name))),
}));
out.noEngineExecution = true;
writeFileSync(relative(process.cwd(), join(HERE, 'bt-review2-checks.json')), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({
  index: out.index, variants: out.anchors.map((/** @type {any} */ r) => [r.id, r.edits]), gitGuardPass: !out.gitGuard.sourceMatches,
  memory: out.memory, listStorage: out.listStorage, batchBound: out.batchBound, reserveBeforeHostBound: out.reserveBeforeHostBound,
  prefixWrongSeed: out.prefixWrongSeed, p7Log: out.p7Log, splitImports: out.splitImports, kernelInput: out.kernelInput,
  prices: out.prices, liveProducerFixture: out.liveProducerFixture, repaired: out.repaired,
}, null, 2));
