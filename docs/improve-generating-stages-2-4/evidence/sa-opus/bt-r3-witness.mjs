// @ts-check
// SA-Opus, review 3 of the stages 2 to 4 pack: specification witnesses of the three findings, translated from the
// revised task texts (no future tool exists yet, none is run; no engine, tree, git or timed command):
// R3-01: T03c's `equalityEvidencePaths` and `equalityBinding` (steps 1 and 2) on every row of the case
//   `p7: bindings and go`; the old required list (the nine corpus paths only) lets a corpus-only report bind.
// R3-02: T02c's `rawIdentityProblems` (step 5) on the clean prefixes fixture and the scenarios (7) to (13); the old
//   step lets two absent identities compare equal.
// R3-03: T03b's timing fixture names its own task; T06b appends after T03d's memory case, the last `v4Cases` case
//   before it in the index.
// Every expected value is also looked up, verbatim, in the task text.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-r3-witness.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { ROOT } from './s2-lib.mjs';

const PACK = join(ROOT, 'tasks', 'improve-generating-stages-2-4');
const text = (/** @type {string} */ name) => readFileSync(join(PACK, name), 'utf8').replace(/\r\n/g, '\n');
const T03C = text('T03c-p7-probe-bindings-and-commands.md');
const T02C = text('T02c-fit-reader-commands.md');
const T03B = text('T03b-p7-probe-declaration-and-verdicts.md');
const T06B = text('T06b-budget-by-mode-and-per-set-levels.md');
const CHECKLIST = text('check-list.md');
let checks = 0;
/** @type {string[]} */
const failures = [];
/** @param {boolean} ok @param {string} what */
function check(ok, what) {
  checks += 1;
  if (!ok) {
    failures.push(what);
  }
}
/** @param {any} v */
const clone = (v) => structuredClone(v);
/** @template T @param {T} v @param {(v: T) => void} f @returns {T} */
function mod(v, f) {
  f(v);
  return v;
}

// ---- R3-01: T03c steps 1 and 2 ----
const P7_PM4_CELLS = ['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-hell-1',
  '26x26-master', '26x26-nightmare'];
/** @param {string} command */
const corpusInputPaths = (command) => (command === 'equal'
  ? [...P7_PM4_CELLS.map((c) => `tests/artifacts/ig-proto/frozen/IGP-02/main/${c}/calls.json`),
    'tools/ig-proto/data/p7-memory-fixtures.json', 'tools/ig-proto/data/boards-v1.json']
  : ['tools/ig-proto/data/boards-v1.json']);
/** @param {string} candidate @param {string} tier */
function equalityEvidencePaths(candidate, tier) {
  const dir = 'tests/artifacts/ig-proto/frozen/V4-P7E-' + candidate + '-' + tier + '/equal';
  return [dir + '/experiment.json', dir + '/state.json', dir + '/items.jsonl', ...corpusInputPaths('equal')];
}
/** @param {any} report @param {any} o */
function equalityBinding(report, { tier, candidate, reference, fileHash, requiredInputs }) {
  const no = (/** @type {string} */ reason) => ({ ok: false, reason });
  if (report === null) {
    return no(`no ${tier} equality report`);
  }
  if (report.equal.verdict !== 'equal') {
    return no(`${tier} equality is ${report.equal.verdict}`);
  }
  if (report.equal.declared.tier !== tier) {
    return no(`the ${tier} report is of tier ${report.equal.declared.tier}`);
  }
  if (!isDeepStrictEqual(report.equal.declared.candidate, candidate)) {
    return no(`the ${tier} report was made on another candidate tree`);
  }
  if (!isDeepStrictEqual(report.equal.declared.reference, reference)) {
    return no(`the ${tier} report was made on another reference tree`);
  }
  if (report.equal.declared.corpusVersion !== 'p7-corpus-v1') {
    return no(`the ${tier} report used corpus ${report.equal.declared.corpusVersion}`);
  }
  if (report.equal.coverage?.complete !== true) {
    return no(`the ${tier} report's memory coverage is incomplete`);
  }
  const inputs = report.meta?.inputs;
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return no(`the ${tier} report binds no input`);
  }
  for (const path of requiredInputs) {
    const n = inputs.filter((e) => e.path === path).length;
    if (n === 0) {
      return no(`the ${tier} report does not bind ${path}`);
    }
    if (n > 1) {
      return no(`the ${tier} report binds ${path} more than once`);
    }
  }
  for (const e of inputs) {
    const h = fileHash(e.path);
    if (h === null) {
      return no(`the ${tier} report's input ${e.path} is missing`);
    }
    if (h !== e.sha256) {
      return no(`the ${tier} report's input ${e.path} changed`);
    }
  }
  return { ok: true };
}

const D = 'tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal';
const candidate = { variant: 'p7-x', treeId: 'T1', copyDigest: 'C1', root: 'r' };
const reference = { variant: 'base', treeId: 'T0', copyDigest: 'C0', root: 'r0' };
const required = equalityEvidencePaths('p7-x', 'quick');
check(isDeepStrictEqual(required.slice(0, 3), [`${D}/experiment.json`, `${D}/state.json`, `${D}/items.jsonl`])
  && isDeepStrictEqual(required.slice(3), corpusInputPaths('equal')) && required.length === 12, 'R3-01: the twelve paths');
for (const f of ['experiment.json', 'state.json', 'items.jsonl']) {
  check(T03C.includes(`\`${D}/${f}\``), `R3-01: the text names ${D}/${f}`);
}
const clean = () => ({
  meta: { inputs: required.map((path) => ({ path, sha256: 'h' })) },
  equal: { verdict: 'equal', declared: { candidate: clone(candidate), reference: clone(reference), tier: 'quick',
    corpusVersion: 'p7-corpus-v1' }, coverage: { complete: true } },
});
check(!clean().meta.inputs.some((e) => e.path === 'x/state.json'), 'R3-01: no x/state.json entry');
const opts = (/** @type {any} */ o = {}) => ({ tier: 'quick', candidate, reference, fileHash: () => 'h',
  requiredInputs: required, ...o });
/** @type {[string, any, any, string | null][]} */
const bindingCases = [
  ['clean', clean(), opts(), null],
  ['report null', null, opts(), 'no quick equality report'],
  ['incomplete', mod(clean(), (r) => { r.equal.verdict = 'incomplete'; }), opts(), 'quick equality is incomplete'],
  ['T9', mod(clean(), (r) => { r.equal.declared.candidate.treeId = 'T9'; }), opts(),
    'the quick report was made on another candidate tree'],
  ['no input', mod(clean(), (r) => { r.meta.inputs = []; }), opts(), 'the quick report binds no input'],
  ['catalogue removed', mod(clean(), (r) => {
    r.meta.inputs = r.meta.inputs.filter((e) => e.path !== 'tools/ig-proto/data/boards-v1.json');
  }), opts(), 'the quick report does not bind tools/ig-proto/data/boards-v1.json'],
  ['state missing', clean(), opts({ fileHash: (/** @type {string} */ p) => (p === `${D}/state.json` ? null : 'h') }),
    `the quick report's input ${D}/state.json is missing`],
  ['memory changed', clean(), opts({
    fileHash: (/** @type {string} */ p) => (p === 'tools/ig-proto/data/p7-memory-fixtures.json' ? 'h2' : 'h'),
  }), "the quick report's input tools/ig-proto/data/p7-memory-fixtures.json changed"],
  ...['experiment.json', 'state.json', 'items.jsonl'].map((f) => /** @type {[string, any, any, string]} */ ([
    `${f} removed`, mod(clean(), (r) => { r.meta.inputs = r.meta.inputs.filter((e) => e.path !== `${D}/${f}`); }),
    opts(), `the quick report does not bind ${D}/${f}`])),
  ['corpus only', mod(clean(), (r) => {
    r.meta.inputs = corpusInputPaths('equal').map((path) => ({ path, sha256: 'h' }));
  }), opts(), `the quick report does not bind ${D}/experiment.json`],
  ['state duplicated', mod(clean(), (r) => { r.meta.inputs.push({ path: `${D}/state.json`, sha256: 'h' }); }), opts(),
    `the quick report binds ${D}/state.json more than once`],
];
for (const [name, report, o, reason] of bindingCases) {
  const got = equalityBinding(report, o);
  check(isDeepStrictEqual(got, reason === null ? { ok: true } : { ok: false, reason }),
    `R3-01 ${name}: ${JSON.stringify(got)}`);
  if (reason !== null) {
    check(T03C.includes(`\`${reason}\``), `R3-01 ${name}: the text holds \`${reason}\``);
  }
}
const corpusOnly = mod(clean(), (r) => { r.meta.inputs = corpusInputPaths('equal').map((path) => ({ path, sha256: 'h' })); });
const oldRule = equalityBinding(corpusOnly, opts({ requiredInputs: corpusInputPaths('equal') }));
check(oldRule.ok === true, 'R3-01: the old required list lets the corpus-only report bind (the finding)');
check(!/requiredInputs: corpusInputPaths\('equal'\)/.test(T03C), 'R3-01: no call site keeps corpusInputPaths as the required list');
check(T03C.includes('requiredInputs: equalityEvidencePaths(candidate.variant, tier)')
  && T03C.includes('requiredInputs: equalityEvidencePaths(c, tier)'), 'R3-01: the two production call sites');

// ---- R3-02: T02c step 5 ----
const isRecord = (/** @type {any} */ v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonempty = (/** @type {any} */ v) => typeof v === 'string' && v.trim().length > 0;
/** @param {any} o @returns {string[]} */
function rawIdentityProblems({ task, arm, declared, shard, rowLines, meta }) {
  if (shard === null) {
    return ['no shard declaration'];
  }
  if (!isRecord(shard) || shard.format !== 'ig-proto-shard' || shard.version !== 1 || !Array.isArray(shard.rows)
    || !shard.rows.every(isRecord)) {
    return ['the shard declaration is malformed'];
  }
  const p = [];
  if (shard.task !== task || shard.arm !== arm || shard.shard !== declared.shard) {
    p.push(`the shard declaration is of ${shard.task}/${shard.arm}/${shard.shard}`);
  }
  for (const f of ['variant', 'treeId', 'copyDigest', 'harnessHash']) {
    if (!nonempty(shard[f])) {
      p.push(`the shard's ${f} is missing or malformed`);
    }
  }
  const rows = shard.rows.filter((/** @type {any} */ r) => r.key === declared.rowKey);
  if (rows.length === 0) {
    p.push(`the shard does not declare ${declared.rowKey}`);
  } else if (rows.length > 1) {
    p.push(`the shard declares ${declared.rowKey} more than once`);
  } else if (rows[0].caseId !== declared.caseId || rows[0].rep !== declared.rep || rows[0].seed !== declared.seed) {
    p.push(`the shard declares ${declared.rowKey} as ${rows[0].caseId}/${rows[0].rep}/${rows[0].seed}`);
  }
  if (rowLines === null) {
    p.push('no row identity');
  } else if (!Array.isArray(rowLines) || !rowLines.every(isRecord)) {
    p.push('the row identity is malformed');
  } else {
    const ls = rowLines.filter((l) => l.t === 'row');
    if (ls.length === 0) {
      p.push('no row identity');
    } else if (ls.length > 1) {
      p.push('the row identity appears more than once');
    } else if (ls[0].row !== declared.rowKey || ls[0].caseId !== declared.caseId || ls[0].seed !== declared.seed) {
      p.push(`the row identity names ${ls[0].row}/${ls[0].caseId}/${ls[0].seed}`);
    }
  }
  if (meta === null) {
    p.push('no publication metadata');
    return p;
  }
  if (!isRecord(meta)) {
    p.push('the publication metadata is malformed');
    return p;
  }
  const tree = isRecord(meta.trees) && nonempty(shard.variant) ? meta.trees[shard.variant] : undefined;
  const t = isRecord(tree) ? tree : null;
  if (!(t !== null && nonempty(t.treeId))) {
    p.push("the publication's tree identity is missing or malformed");
  }
  if (t !== null && nonempty(t.treeId) && nonempty(shard.treeId) && t.treeId !== shard.treeId) {
    p.push(`the publication's tree ${t.treeId} is not the shard's ${shard.treeId}`);
  }
  if (!(t !== null && nonempty(t.copyDigest))) {
    p.push("the publication's copy identity is missing or malformed");
  }
  if (t !== null && nonempty(t.copyDigest) && nonempty(shard.copyDigest) && t.copyDigest !== shard.copyDigest) {
    p.push(`the publication's copy ${t.copyDigest} is not the shard's ${shard.copyDigest}`);
  }
  const h = isRecord(meta.harness) ? meta.harness : null;
  if (!(h !== null && nonempty(h.harnessHash))) {
    p.push("the publication's producer identity is missing or malformed");
  }
  if (h !== null && nonempty(h.harnessHash) && nonempty(shard.harnessHash) && h.harnessHash !== shard.harnessHash) {
    p.push(`the publication's producer ${h.harnessHash} is not the shard's ${shard.harnessHash}`);
  }
  return p;
}
/** The previous step 5, for the finding's witness. @param {any} o @returns {string[]} */
function oldRawIdentityProblems({ shard, meta }) {
  const p = [];
  const tree = meta.trees?.[shard.variant];
  if (tree?.treeId !== shard.treeId) {
    p.push('tree');
  }
  if (tree?.copyDigest !== shard.copyDigest) {
    p.push('copy');
  }
  if (meta.harness?.harnessHash !== shard.harnessHash) {
    p.push('producer');
  }
  return p;
}

const REPS = [0, 1, 2, 3, 4];
const fixture = () => ({
  shard: { format: 'ig-proto-shard', version: 1, task: 'V4-XX', arm: 'a', shard: 'pilot-x', variant: 'v',
    rows: REPS.map((r) => ({ key: `x~${r}`, caseId: 'x', rep: r, seed: `landscape/x/${r}` })), treeId: 'T',
    copyDigest: 'C', harnessHash: 'H' },
  /** @type {Record<string, any[] | null>} */
  rowLines: Object.fromEntries(REPS.map((r) => [`x~${r}`,
    [{ t: 'row', row: `x~${r}`, seed: `landscape/x/${r}`, caseId: 'x', localRep: 0, pid: 1 }]])),
  meta: { trees: { v: { treeId: 'T', copyDigest: 'C' } }, harness: { harnessHash: 'H' } },
});
/** @param {any} fx */
const identities = (fx) => REPS.map((r) => rawIdentityProblems({ task: 'V4-XX', arm: 'a',
  declared: { rowKey: `x~${r}`, caseId: 'x', rep: r, seed: `landscape/x/${r}`, shard: 'pilot-x' },
  shard: fx.shard, rowLines: fx.rowLines[`x~${r}`] ?? null, meta: fx.meta }));
/** @param {string[]} list The list as the Tests table writes it with double quotes. */
const dq = (list) => `\`[${list.map((s) => JSON.stringify(s)).join(', ')}]\``;
/** @param {string[]} list The list as the Tests table writes it with single quotes. */
const sq = (list) => `\`[${list.map((s) => `'${s}'`).join(', ')}]\``;
const SIX = ["the shard's treeId is missing or malformed", "the shard's copyDigest is missing or malformed",
  "the shard's harnessHash is missing or malformed", "the publication's tree identity is missing or malformed",
  "the publication's copy identity is missing or malformed", "the publication's producer identity is missing or malformed"];
const TWO = ["the shard's harnessHash is missing or malformed", "the publication's producer identity is missing or malformed"];
/** @type {[string, any, (string[])[], string | null][]} */
const identityCases = [
  ['clean', fixture(), REPS.map(() => []), null],
  ['(7) row file removed', mod(fixture(), (f) => { f.rowLines['x~3'] = null; }),
    REPS.map((r) => (r === 3 ? ['no row identity'] : [])), sq(['no row identity'])],
  ['(8) shard producer H2', mod(fixture(), (f) => { f.shard.harnessHash = 'H2'; }),
    REPS.map(() => ["the publication's producer H is not the shard's H2"]), dq(["the publication's producer H is not the shard's H2"])],
  ['(9) shard removed', mod(fixture(), (f) => { f.shard = null; }), REPS.map(() => ['no shard declaration']),
    sq(['no shard declaration'])],
  ['(10) identities absent on both sides', mod(fixture(), (f) => {
    delete f.shard.treeId;
    delete f.shard.copyDigest;
    delete f.shard.harnessHash;
    delete f.meta.trees.v.treeId;
    delete f.meta.trees.v.copyDigest;
    delete f.meta.harness.harnessHash;
  }), REPS.map(() => SIX), dq(SIX)],
  ['(11) both producers empty', mod(fixture(), (f) => { f.shard.harnessHash = ''; f.meta.harness.harnessHash = ''; }),
    REPS.map(() => TWO), dq(TWO)],
  ['(12) duplicate shard entry', mod(fixture(), (f) => { f.shard.rows.push(clone(f.shard.rows[0])); }),
    REPS.map((r) => (r === 0 ? ['the shard declares x~0 more than once'] : [])), sq(['the shard declares x~0 more than once'])],
  ['(13) duplicate row header', mod(fixture(), (f) => { f.rowLines['x~0'].push(clone(f.rowLines['x~0'][0])); }),
    REPS.map((r) => (r === 0 ? ['the row identity appears more than once'] : [])), sq(['the row identity appears more than once'])],
];
for (const [name, fx, want, written] of identityCases) {
  const got = identities(fx);
  check(isDeepStrictEqual(got, want), `R3-02 ${name}: ${JSON.stringify(got)}`);
  check(got.filter((l) => l.length > 0).length === want.filter((l) => l.length > 0).length,
    `R3-02 ${name}: identityRows`);
  if (written !== null) {
    check(T02C.includes(written), `R3-02 ${name}: the text holds ${written}`);
  }
}
const absent = mod(fixture(), (f) => {
  delete f.shard.treeId;
  delete f.shard.copyDigest;
  delete f.shard.harnessHash;
  delete f.meta.trees.v.treeId;
  delete f.meta.trees.v.copyDigest;
  delete f.meta.harness.harnessHash;
});
check(oldRawIdentityProblems({ shard: absent.shard, meta: absent.meta }).length === 0,
  'R3-02: the old step compares two absent identities as equal (the finding)');
check(T02C.includes('in (5) to (13) the ledger fields and `problems` as in the clean run'), 'R3-02: (5) to (13) keep the ledger');

// ---- R3-03 ----
check(T03B.includes("`kind: 'p7-time'`, `variant: 'p7-x'`, `payload: { otherTree: 't', inputTree: 'ti' }`, the declaration as `p7Run`'s with `task: 'V4-P7'`, `command: 'time'`, `step: 'time-p7-x'`"),
  'R3-03: the timing fixture names its task');
check(T03B.includes("It does not retain the equality\ndeclaration's task or item hash."), 'R3-03: the timing fixture paragraph');
const timeDeclaration = { format: 'ig-p7-experiment', version: 1, task: 'V4-P7', step: 'time-p7-x', command: 'time',
  candidate, tier: null };
/** @param {any} d */
const declaredAs = (d) => d.format === 'ig-p7-experiment' && d.version === 1 && d.task === 'V4-P7'
  && d.step === 'time-p7-x' && d.command === 'time' && d.candidate.variant === 'p7-x' && d.tier === null;
check(declaredAs(timeDeclaration) && !declaredAs({ ...timeDeclaration, task: 'V4-P7E-p7-x-quick' }),
  'R3-03: runProblems\' first check passes only with the time task');
check(T06B.includes("(at the end, after T03d's memory case)"), 'R3-03: T06b step 4');
const order = [...CHECKLIST.matchAll(/^- \[ \] ([TS]\d+[a-z]?) /gm)].map((m) => m[1]);
const files = Object.fromEntries(order.map((id) => [id, text(
  /** @type {string} */ (readFileSync(join(PACK, 'check-list.md'), 'utf8').match(new RegExp(`\\[${id}\\]\\((${id}-[^)]+\\.md)\\)`))?.[1]))]));
const v4Appenders = order.filter((id) => /to `v4Cases`/.test(files[id].split('## Steps')[0]));
check(v4Appenders[v4Appenders.indexOf('T06b') - 1] === 'T03d', `R3-03: the v4Cases appenders in order ${v4Appenders.join(', ')}`);

process.stdout.write(`bt-r3-witness: ${checks} checks, ${failures.length} failed; v4Cases appenders ${v4Appenders.join(', ')}\n`
  + failures.map((f) => `FAIL ${f}\n`).join(''));
process.exitCode = failures.length === 0 ? 0 : 1;
