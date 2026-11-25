// @ts-check
// SA-Astra: third task-pack revision. Static/pure checks only; no git, tree builds or engine execution.
// node --experimental-vm-modules docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review3-checks.mjs --label frozen
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import * as vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const PACK = join(ROOT, 'tasks', 'improve-generating-stages-2-4');
const rel = (/** @type {string} */ p) => relative(ROOT, p).replaceAll('\\', '/');
const sha = (/** @type {string | Buffer} */ s) => createHash('sha256').update(s).digest('hex');
const text = (/** @type {string} */ p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const task = (/** @type {string} */ p) => text(join(PACK, p));
const load = (/** @type {string[]} */ ...p) => import(pathToFileURL(join(ROOT, ...p)).href);
const TREE = await load('tools', 'ig-proto', 'lib', 'tree.mjs');
const P = await load('tools', 'ig-proto', 'lib', 'paths.mjs');
const { createFakeClock } = await load('tools', 'ig-proto', 'lib', 'fake-pool.mjs');
/** @type {Record<string, any>} */
const out = {};
/** @param {boolean} value @param {string} why */
function check(value, why) {
  if (!value) {
    throw new Error(why);
  }
}
/** @param {string} s @param {string} lang */
function blocks(s, lang) {
  return [...s.matchAll(new RegExp('^( *)```' + lang + '\\n([\\s\\S]*?)\\n\\1```$', 'gm'))]
    .map((m) => m[2].split('\n').map((l) => l.slice(Math.min(m[1].length, l.length - l.trimStart().length))).join('\n') + '\n');
}
/** @param {string} s @param {string} name */
function innerFunction(s, name) {
  const at = s.indexOf(`  function ${name}(`);
  const end = s.indexOf('\n  }\n', at);
  check(at >= 0 && end > at, `missing function ${name}`);
  return s.slice(at, end + 5);
}
const files = readdirSync(PACK).filter((n) => /^[TS][0-9].*\.md$/.test(n)).sort();
const checklist = task('check-list.md');
const ids = [...checklist.matchAll(/^- \[ \] ([TS]\d+[a-z]?) /gm)].map((m) => m[1]);
check(ids.length === 35 && new Set(ids).size === 35, 'not 35 distinct tasks');
check(isDeepStrictEqual([...ids].sort(), files.map((n) => n.split('-')[0]).sort()), 'index/file mismatch');
const hours = files.map((n) => ({ id: n.split('-')[0], hours: Number(/\| Estimate \| developer ([\d.]+) h/.exec(task(n))?.[1] ?? 0) }));
const totalHours = hours.reduce((a, r) => a + r.hours, 0);
check(totalHours === 68 && hours.every((r) => r.hours <= 3), 'hours differ');
const brokenLinks = [...checklist.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1])
  .filter((p) => !existsSync(join(PACK, ...p.split('/'))));
check(brokenLinks.length === 0, 'broken index links');
/** @type {any[]} */
const badDependencies = [];
for (const name of files) {
  const id = name.split('-')[0];
  const line = task(name).split('\n').find((l) => l.startsWith('| Depends on |')) ?? '';
  for (const dep of [...line.matchAll(/\b([TS]\d{2}[a-z]?)\b/g)].map((m) => m[1])) {
    if (!ids.includes(dep) || ids.indexOf(dep) >= ids.indexOf(id)) {
      badDependencies.push({ id, dep });
    }
  }
}
check(badDependencies.length === 0, 'forward/missing dependency');
out.index = { tasks: ids.length, totalHours, maximumHours: Math.max(...hours.map((r) => r.hours)), brokenLinks, badDependencies };
out.staleReferences = files.filter((n) => /T03b-p7-probe-commands\.md|T03c-p7-c1-live-row-lists\.md/.test(task(n)));
check(out.staleReferences.length === 0, 'stale renamed task file');

/** @type {Record<string, any>} */
const manifests = {};
/** @type {any[]} */
const additions = [];
for (const file of files) {
  for (const b of blocks(task(file), 'json')) {
    const obj = JSON.parse(b);
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
const source = text(join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'deduce.js'));
const c1 = blocks(task('T03d-p7-c1-live-row-lists.md'), 'js');
const r4 = innerFunction(source, 'ruleR4');
const r5 = innerFunction(source, 'ruleR5');
const edit = (/** @type {string} */ id, /** @type {string} */ find, /** @type {string} */ replace) =>
  ({ id, file: 'core/engine/deduce.js', find, replace });
const marker = '  // Reused slots hold unspecified data: everything read below is initialised first.\n';
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

// Evaluate the actual task's controller, not an earlier draft. No generation/client engine is invoked.
const controllerSource = manifests.live.edits.find((/** @type {any} */ e) => e.id === 'lv-14').append
  .replace(/^import .*\n/gm, '').replace(/^export /gm, '');
const igBoundStart = new Function('IG_HOST', controllerSource + '\nreturn igBoundStart;')({
  liveDeadline: { levels: ['hard'], responseBoundMs: 120000, hostMarginMs: 1000 },
});
const clock = createFakeClock();
const origin = clock.now();
let cancels = 0;
const snapshot = { status: 'partial', reason: 'response-bound', accepted: [{ id: 'p' }], made: { p: {} }, seenLayouts: ['l'], seenClues: ['c'], pack: { synthetic: true } };
const bound = igBoundStart({ t0: origin }, { levelId: 'hard' }, clock, { cancel() { cancels += 1; }, igPrefix: () => snapshot });
/** @type {(v: any) => void} */
let release = () => {};
const original = new Promise((resolve) => { release = resolve; });
let state = 'pending';
let at = null;
let returned = null;
bound.batch(original).then((value) => { state = 'resolved'; at = clock.now() - origin; returned = value; });
clock.advance(119000);
await Promise.resolve();
await Promise.resolve();
out.bound = { state, at, cancels, sameSnapshot: returned === snapshot };
clock.advance(6000);
release({ status: 'complete' });
await Promise.resolve();
await Promise.resolve();
out.bound.unchangedAfter125000 = returned === snapshot;
bound.clear();
check(out.bound.state === 'resolved' && out.bound.at === 119000 && out.bound.sameSnapshot && out.bound.unchangedAfter125000, 'bound fix failed');

// Witnesses to the remaining text specification, not execution of an unimplemented future tool.
const corpusPaths = [
  ...['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-hell-1', '26x26-master', '26x26-nightmare']
    .map((c) => `tests/artifacts/ig-proto/frozen/IGP-02/main/${c}/calls.json`),
  'tools/ig-proto/data/p7-memory-fixtures.json', 'tools/ig-proto/data/boards-v1.json',
];
const listed = corpusPaths.map((path) => ({ path, sha256: 'h' }));
const neededRun = ['experiment.json', 'state.json', 'items.jsonl']
  .map((name) => `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/${name}`);
out.bindingSpecification = {
  listed: listed.map((r) => r.path),
  passesSpecifiedNonemptyRequiredPathAndHashChecks: listed.length > 0
    && corpusPaths.every((p) => listed.some((r) => r.path === p)) && listed.every((r) => r.sha256 === 'h'),
  absentCanonicalRunFiles: neededRun.filter((p) => !listed.some((r) => r.path === p)),
};

/** The explicitly enumerated T02c rawIdentityProblems predicates; no unpublished code is invoked. @param {any} o */
function rawIdentitySpecification({ task: t, arm, declared, shard, rowLines, meta }) {
  const problems = [];
  if (shard === null) {
    return ['no shard declaration'];
  }
  if (shard.format !== 'ig-proto-shard' || shard.version !== 1 || !Array.isArray(shard.rows)) {
    problems.push('the shard declaration is malformed');
  }
  if (shard.task !== t || shard.arm !== arm || shard.shard !== declared.shard) {
    problems.push('the shard declaration is of another task/arm/shard');
  }
  const row = shard.rows.find((/** @type {any} */ r) => r.key === declared.rowKey);
  if (row === undefined || row.caseId !== declared.caseId || row.rep !== declared.rep || row.seed !== declared.seed) {
    problems.push('the shard row differs');
  }
  const line = rowLines?.find((/** @type {any} */ r) => r.t === 'row');
  if (line === undefined || line.row !== declared.rowKey || line.caseId !== declared.caseId || line.seed !== declared.seed) {
    problems.push('the row identity differs');
  }
  if (meta === null) {
    problems.push('no publication metadata');
  } else {
    const tree = meta.trees?.[shard.variant];
    if (tree?.treeId !== shard.treeId) problems.push('tree differs');
    if (tree?.copyDigest !== shard.copyDigest) problems.push('copy differs');
    if (meta.harness?.harnessHash !== shard.harnessHash) problems.push('producer differs');
  }
  return problems;
}
const declared = { rowKey: 'x~0', caseId: 'x', rep: 0, seed: 'landscape/x/0', shard: 'pilot-x' };
const shard = {
  format: 'ig-proto-shard', version: 1, task: 'V4-XX', arm: 'a', shard: 'pilot-x', variant: 'v',
  rows: [{ key: declared.rowKey, caseId: declared.caseId, rep: declared.rep, seed: declared.seed }],
};
const rowLines = [{ t: 'row', row: 'x~0', caseId: 'x', seed: 'landscape/x/0' }];
out.rawIdentitySpecification = {
  missingBothProducerIdentities: rawIdentitySpecification({ task: 'V4-XX', arm: 'a', declared, shard, rowLines, meta: { trees: { v: {} }, harness: {} } }),
  duplicateShardDeclaration: rawIdentitySpecification({
    task: 'V4-XX', arm: 'a', declared,
    shard: { ...shard, rows: [...shard.rows, { ...shard.rows[0] }], treeId: 'T', copyDigest: 'C', harnessHash: 'H' },
    rowLines, meta: { trees: { v: { treeId: 'T', copyDigest: 'C' } }, harness: { harnessHash: 'H' } },
  }),
  duplicateRowIdentity: rawIdentitySpecification({
    task: 'V4-XX', arm: 'a', declared,
    shard: { ...shard, treeId: 'T', copyDigest: 'C', harnessHash: 'H' },
    rowLines: [...rowLines, { ...rowLines[0], seed: 'landscape/x/20' }],
    meta: { trees: { v: { treeId: 'T', copyDigest: 'C' } }, harness: { harnessHash: 'H' } },
  }),
};
out.specificationWitnessesOnly = true;

out.inputConstructor = {
  instrDeclared: task('T03a-p7-probe-items.md').includes("P7_INPUT_CONSTRUCTOR = 'instr'"),
  usesMaker: task('T03a-p7-probe-items.md').includes('firstCarvedSet(maker,'),
  hellVerification: task('T03a-p7-probe-items.md').includes('equal:base:kernel:26x26-hell-1:0'),
};
check(out.inputConstructor.instrDeclared && out.inputConstructor.usesMaker && out.inputConstructor.hellVerification, 'input constructor fix missing');
out.format = [...files, 'check-list.md', 'review-2-response.md'].map((name) => {
  const b = readFileSync(join(PACK, name));
  const s = new TextDecoder('utf-8', { fatal: true }).decode(b);
  const ok = !(b[0] === 239 && b[1] === 187 && b[2] === 191) && !/(?<!\r)\n|\r(?!\n)/.test(s)
    && s.endsWith('\r\n') && !/[ \t]+\r?$/m.test(s) && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);
  check(ok, `format ${name}`);
  return { path: rel(join(PACK, name)), sha256: sha(b), ok };
});
out.codeInputs = [
  join(ROOT, 'tools', 'ig-proto', 'arm.mjs'),
  join(ROOT, 'tools', 'ig-proto', 'manifest.mjs'),
  join(ROOT, 'tools', 'ig-proto', 'v4-check.mjs'),
  join(ROOT, 'tools', 'ig-proto', 'verdicts.mjs'),
  ...['tree', 'paths', 'records', 'items', 'sets', 'fake-pool', 'lane-worker']
    .map((n) => join(ROOT, 'tools', 'ig-proto', 'lib', `${n}.mjs`)),
  join(ROOT, 'tools', 'ig-proto', 'variants', 'log.json'),
  join(P.FROZEN_SOURCE_DIR, 'core', 'browser', 'generation-client.js'),
  join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'deduce.js'),
  join(P.FROZEN_SOURCE_DIR, 'core', 'engine', 'pack.js'),
  join(HERE, '..', 'sa-opus', 'bt-bound.mjs'),
  join(HERE, '..', 'sa-opus', 'bt-live.mjs'),
].map((path) => ({ path: rel(path), sha256: sha(readFileSync(path)) }));
out.noEngineExecution = true;
writeFileSync(relative(process.cwd(), join(HERE, 'bt-review3-checks.json')), JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(JSON.stringify({
  index: out.index, staleReferences: out.staleReferences, variants: out.anchors.map((/** @type {any} */ r) => [r.id, r.edits]),
  bound: out.bound, inputConstructor: out.inputConstructor, bindingSpecification: out.bindingSpecification,
  rawIdentitySpecification: out.rawIdentitySpecification, formattedFiles: out.format.length,
}, null, 2));
