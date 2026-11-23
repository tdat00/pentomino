// @ts-check
// The live-deadline receipt (N-V4-13; stages 2 to 4 pack T09a to T09c; plan 4.5): kind `live-deadline` with the fields
// LIVE_DEADLINE_FIELDS, binding the live verification of S04 and the ten rows of V4-LIVE, for both bounded twins.
// Unlocked: it reads records, copies the inputs it binds and writes the receipt once; it rates nothing.
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { abs, FROZEN_COMMIT, FROZEN_DIGEST, parseArgs } from './lib/paths.mjs';
import { LIVE_DEADLINE_FIELDS, proofEnvelope, readRepoFile } from './lib/proof.mjs';
import { harnessInfo, readTreeInfo, sha256, sha256File, writeJson } from './lib/records.mjs';
import { ensureTree } from './lib/tree.mjs';
import { ingestRow, parseLines, rowLedger } from './verdicts.mjs';

export const LIVE_ARMS = Object.freeze(['fr-frozen', 'fr-frozen-none']);
export const LIVE_TWINS = Object.freeze(['fr-frozen-live-test', 'fr-frozen-none-live-test']);
export const LIVE_VERIFY_TASK = 'V4-LIVE-verify';
export const FREEZE_PATH = 'docs/improve-generating/evidence/frozen/V4-S3/freeze.json';
export const LIVE_SET_MS = 48000;
export const LIVE_RESPONSE_MS = 120000;
/** The ten declared requests of V4-LIVE: `fr-frozen`, 14x14 Nightmare and 26x26 Hell 1, reps 0-4. */
export const LIVE_DECLARED = Object.freeze(['14x14-nightmare', '26x26-hell-1'].flatMap((caseId) => [0, 1, 2, 3, 4]
  .map((rep) => Object.freeze({ rowKey: `${caseId}~${rep}`, caseId, rep, seed: `landscape/${caseId}/${rep}` }))));
export const LIVE_ROWS = Object.freeze(LIVE_DECLARED.map((d) => d.rowKey));
const FACTORY_CASES = Object.freeze([
  'the set stage is cut by the reserve', 'one clock from the request start and the prefix at the stop',
  'the same puzzles at widths 1, 2, 4 and 8 without a cut', 'a cut leaves a prefix of the same fold at every width',
  'the deadline applies to the listed levels only', 'the host bound around a held assembly',
  "the host's hard response bound",
]);
/** The fifteen self-test cases of the live verification (T07b, T07c, T08c), on both bounded twins. */
export const LIVE_CASES = Object.freeze([
  ...LIVE_TWINS.flatMap((v) => FACTORY_CASES.map((n) => `live ${v}: ${n}`)),
  'fz: the live deadline on the frozen trees',
]);
export const LIVE_COVERAGE = Object.freeze([...LIVE_ROWS, ...LIVE_CASES.map((n) => `self-test:${n}`)]);
/** Each bounded twin's frozen parent (T08c): the twin extends its parent and `w8`, nothing else (R2-06). */
export const LIVE_TWIN_OF = Object.freeze({ 'fr-frozen-live-test': 'fr-frozen', 'fr-frozen-none-live-test': 'fr-frozen-none' });
/** The one parameter a twin may change: its test deadline, also on the fixture level 'hard' (T08c). */
export const LIVE_TEST_DEADLINE = Object.freeze({
  id: 'deadline-test', levels: Object.freeze(['hard', 'nightmare', 'hell-1']), reserve: 0.6, setStageCapMs: 46000,
  generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000,
});

/** @param {unknown} v @returns {v is Record<string, any>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * @typedef {{ lines: any[], links: any[] | null, problems: string[] }} RowJournals
 * @typedef {{ rowKey: string, status: string, responseMs: number | null, igSetMs: number | null, partialReason: string | null,
 *   acceptedCount: number | null, ledgerComplete: boolean }} LiveRowEntry
 */

/**
 * The checks of the ten published rows of V4-LIVE (SA-Astra's review R12): each declared request once, valid, answered
 * within the response bound, with the reserve held on both set paths and with closed journals.
 * @param {any[]} rows Every published row of the runs files (`{ rowKey, caseId, rep, seed, localRep, run }`), in file order.
 * @param {Record<string, RowJournals | undefined>} journals The parsed raw journals of each row.
 * @returns {{ observed: string[], failures: string[], incomplete: string[], table: LiveRowEntry[] }}
 */
export function rowChecks(rows, journals) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const incomplete = [];
  /** @type {Map<string, any[]>} */
  const byKey = new Map();
  for (const row of rows) {
    if (!isObject(row)) {
      incomplete.push('a published row is not an object');
      continue;
    }
    const key = String(row.rowKey);
    byKey.set(key, [...(byKey.get(key) ?? []), row]);
  }
  for (const [key, list] of byKey) {
    if (!LIVE_ROWS.includes(key)) {
      incomplete.push(`unexpected row ${key}`);
    } else if (list.length > 1) {
      incomplete.push(`row ${key} is published ${list.length} times`);
    }
  }
  /** @type {Set<string>} */
  const observed = new Set();
  /** @type {LiveRowEntry[]} */
  const table = [];
  for (const declared of LIVE_DECLARED) {
    const key = declared.rowKey;
    const list = byKey.get(key);
    if (list === undefined) {
      continue;
    }
    const row = list[0];
    const g = ingestRow(row, { quantity: 10 });
    const run = isObject(row.run) ? row.run : {};
    /** @type {LiveRowEntry} */
    const entry = {
      rowKey: key, status: g.status, responseMs: isNum(run.responseMs) ? run.responseMs : null, igSetMs: isNum(run.igSetMs) ? run.igSetMs : null,
      partialReason: typeof run.partialReason === 'string' ? run.partialReason : null, acceptedCount: isNum(run.acceptedCount) ? run.acceptedCount : null,
      ledgerComplete: false,
    };
    table.push(entry);
    if (list.length > 1) {
      continue;
    }
    if (row.caseId !== declared.caseId || row.rep !== declared.rep || row.seed !== declared.seed) {
      incomplete.push(`row ${key} is not its declared request`);
      continue;
    }
    const before = incomplete.length;
    const text = `row ${key}: ${g.status}: ${g.problems.join('; ')}`;
    if (g.status === 'invalid' || g.status === 'censored') {
      incomplete.push(text);
    } else if (g.status === 'incorrect' || g.status === 'error') {
      failures.push(text);
    }
    if (Array.isArray(run.errors) && run.errors.some((e) => isObject(e) && e.code === 'child-timeout')) {
      failures.push(`row ${key}: killed at the row limit`);
    }
    if (isNum(run.responseMs) && (run.responseMs < 0 || run.responseMs > LIVE_RESPONSE_MS)) {
      failures.push(`row ${key}: response ${run.responseMs} ms outside [0, ${LIVE_RESPONSE_MS}]`);
    }
    if (typeof run.partialReason === 'string' && run.partialReason.startsWith('set:')) {
      if (isNum(run.responseMs) && run.responseMs > LIVE_SET_MS) {
        failures.push(`row ${key}: the set stage ended at ${run.responseMs} ms, over ${LIVE_SET_MS}`);
      }
    } else if (!isNum(run.igSetMs)) {
      incomplete.push(`row ${key}: no igSetMs for a completed set`);
    } else if (run.igSetMs < 0 || run.igSetMs > LIVE_SET_MS) {
      failures.push(`row ${key}: set stage ${run.igSetMs} ms outside [0, ${LIVE_SET_MS}]`);
    }
    const j = journals[key];
    if (j === undefined || j.problems.length > 0) {
      incomplete.push(`row ${key}: unreadable journals: ${j === undefined ? 'absent' : j.problems.join('; ')}`);
    } else {
      try {
        const ledger = rowLedger(j.lines, j.links);
        entry.ledgerComplete = ledger.complete;
        if (!ledger.complete) {
          incomplete.push(`row ${key}: journal not closed: ${ledger.problems.join('; ')}`);
        }
      } catch (e) {
        incomplete.push(`row ${key}: journal not closed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (g.status === 'valid' && incomplete.length === before) {
      observed.add(key);
    }
  }
  return { observed: LIVE_ROWS.filter((k) => observed.has(k)), failures, incomplete, table };
}

/**
 * The derivation of each bounded test twin from its frozen parent (SA-Astra's review R2-06): the parent's chain, then `w8`,
 * then the twin; no own edit but `w8-1`; no added file; no parameter but the test deadline.
 * @param {Record<string, any | undefined>} parents The captured `ig-tree.json` of the frozen arms, by id.
 * @param {Record<string, any | undefined>} twins The captured `ig-tree.json` of the test derivatives, by id.
 * @returns {string[]}
 */
export function twinDerivationProblems(parents, twins) {
  /** @type {string[]} */
  const problems = [];
  for (const twin of LIVE_TWINS) {
    const parent = LIVE_TWIN_OF[/** @type {'fr-frozen-live-test' | 'fr-frozen-none-live-test'} */ (twin)];
    const p = parents[parent];
    const d = twins[twin];
    if (p === undefined || p === null) {
      problems.push(`no captured tree metadata for ${parent}`);
    }
    if (d === undefined || d === null) {
      problems.push(`no captured tree metadata for ${twin}`);
    }
    if (p === undefined || p === null || d === undefined || d === null) {
      continue;
    }
    if (!isDeepStrictEqual(d.chain, [...p.chain, 'w8', twin])) {
      problems.push(`the test derivative ${twin} is not ${parent} with w8`);
    }
    const ids = (/** @type {any} */ info) => (Array.isArray(info.edits) ? info.edits.map((/** @type {any} */ e) => e?.id) : null);
    const parentIds = ids(p);
    if (parentIds === null || !isDeepStrictEqual(ids(d), [...parentIds.filter((/** @type {string} */ id) => id !== 'meta-2'), 'w8-1', 'meta-2'])) {
      problems.push(`the test derivative ${twin} has an edit other than w8-1`);
    }
    if (!isDeepStrictEqual(Object.keys(d.files ?? {}).sort(), Object.keys(p.files ?? {}).sort())) {
      problems.push(`the test derivative ${twin} adds a file`);
    }
    const bare = (/** @type {any} */ params) => {
      const { variant, liveDeadline, ...rest } = params ?? {};
      return rest;
    };
    if (!isDeepStrictEqual(bare(d.params), bare(p.params))) {
      problems.push(`the test derivative ${twin} changes a parameter other than liveDeadline`);
    }
    if (!isDeepStrictEqual(d.params?.liveDeadline, LIVE_TEST_DEADLINE)) {
      problems.push(`the test derivative ${twin} has another test deadline`);
    }
  }
  return problems;
}

/**
 * The checks of the live verification (SA-Astra's review R13): its identity record and state, bound to the producer, the
 * frozen source, the trees of the two frozen arms and the two test derivatives it loaded, and the fifteen cases.
 * @param {{ state: any, identity: any, freezeVariants: Record<string, any> | undefined, parents: Record<string, any | undefined>,
 *   twins: Record<string, any | undefined>, harnessHash: string }} input
 * @returns {{ observed: string[], failures: string[], incomplete: string[] }}
 */
export function verifyChecks({ state, identity, freezeVariants, parents, twins, harnessHash }) {
  /** @type {string[]} */
  const incomplete = [];
  /** @type {string[]} */
  const failures = [];
  if (!isObject(identity)) {
    incomplete.push('no verification identity');
  }
  if (!isObject(state)) {
    incomplete.push('no verification state');
  }
  if (!isObject(identity) || !isObject(state)) {
    return { observed: [], failures, incomplete };
  }
  if (identity.format !== 'ig-selftest-identity' || identity.version !== 1) {
    incomplete.push('the verification identity is not ig-selftest-identity version 1');
  }
  for (const [field, ok] of /** @type {[string, boolean][]} */ ([
    ['selected', Array.isArray(identity.selected)], ['harnessHash', typeof identity.harnessHash === 'string'],
    ['startedAt', typeof identity.startedAt === 'string'], ['endedAt', typeof identity.endedAt === 'string'], ['trees', isObject(identity.trees)],
  ])) {
    if (!ok) {
      incomplete.push(`the verification identity lacks ${field}`);
    }
  }
  if (!(identity.task === LIVE_VERIFY_TASK && identity.label === 'frozen' && identity.group === 'v4')) {
    incomplete.push(`the verification record is ${identity.task}/${identity.label}/${identity.group}, not ${LIVE_VERIFY_TASK}/frozen/v4`);
  }
  if (!(state.task === LIVE_VERIFY_TASK && state.label === 'frozen')) {
    incomplete.push(`the verification state is ${state.task}/${state.label}, not ${LIVE_VERIFY_TASK}/frozen`);
  }
  if (identity.harnessHash !== harnessHash) {
    incomplete.push('the verification ran another producer');
  }
  if (identity.frozenCommit !== FROZEN_COMMIT || identity.sourceDigest !== FROZEN_DIGEST) {
    incomplete.push('the verification ran another source');
  }
  const trees = isObject(identity.trees) ? identity.trees : {};
  for (const id of LIVE_ARMS) {
    const frozen = freezeVariants?.[id];
    if (trees[id] === undefined || frozen === undefined || trees[id].treeId !== frozen.treeId || trees[id].paramsHash !== frozen.paramsHash) {
      incomplete.push(`the verification tested another tree ${id}`);
    }
  }
  for (const id of LIVE_TWINS) {
    if (twins[id] === undefined || twins[id] === null || trees[id]?.treeId !== twins[id].treeId) {
      incomplete.push(`the verification tested another tree ${id}`);
    }
  }
  incomplete.push(...twinDerivationProblems(parents, twins));
  const selected = Array.isArray(identity.selected) ? identity.selected : [];
  const results = Array.isArray(state.results) ? state.results : [];
  /** @type {string[]} */
  const observed = [];
  for (const name of LIVE_CASES) {
    const times = selected.filter((/** @type {unknown} */ n) => n === name).length;
    if (times > 1) {
      incomplete.push(`the verification selected ${name} ${times} times`);
    }
    const mine = results.filter((/** @type {any} */ r) => isObject(r) && r.name === name);
    for (const r of mine) {
      if (r.pass === false) {
        failures.push(`self-test case ${name} failed: ${r.reason}`);
      }
    }
    if (times === 1 && mine.some((/** @type {any} */ r) => r.pass === true)) {
      observed.push(`self-test:${name}`);
    }
  }
  if (state.done !== true) {
    failures.unshift('the live verification is not done');
  }
  return { observed, failures, incomplete };
}

/** The task ids that earlier records of the frozen round own (check-list 3.1): a receipt is never written under them. */
const HISTORICAL_TASKS = Object.freeze(['IGP-02', 'V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i', 'V4-S2', 'V4-S2P', 'V4-S2K', 'V4-S2W']);

/**
 * The repository paths of a live-deadline receipt (T09b, T09c). `base` null gives the real layout; a test passes a
 * private folder under tests/artifacts/ig-proto/selftest/ (never V4-LIVE or a historical namespace).
 * @param {string} task
 * @param {string | null} [base]
 */
export function liveLayout(task, base = null) {
  const evidence = base === null ? `docs/improve-generating/evidence/frozen/${task}` : `${base}/evidence/${task}`;
  const raw = base === null ? `tests/artifacts/ig-proto/frozen/${task}` : `${base}/raw/${task}`;
  const verify = base === null ? `tests/artifacts/ig-proto/frozen/${LIVE_VERIFY_TASK}/self-test` : `${base}/raw/${LIVE_VERIFY_TASK}/self-test`;
  return {
    freeze: base === null ? FREEZE_PATH : `${base}/freeze.json`,
    runsDir: `${evidence}/fr-frozen`,
    rawDir: `${raw}/fr-frozen`,
    verifyState: `${verify}/state.json`,
    verifyIdentity: `${verify}/identity.json`,
    inputs: `${evidence}/inputs/live-deadline`,
    receipt: `${evidence}/live-deadline.json`,
    binding: `${evidence}/live-deadline.accepted.json`,
  };
}

/**
 * The files a receipt binds, in the order of its evidence index (T09b, T09c): the freeze record, the runs files, the raw
 * shard identities, the rows' journal files, then the captured copies of the trees, the harness and the verification.
 * @param {ReturnType<typeof liveLayout>} layout
 * @param {{ runs: { path: string, shard: string }[], journalFiles: string[] }} input
 * @returns {string[]}
 */
export function liveEvidencePaths(layout, { runs, journalFiles }) {
  return [
    layout.freeze,
    ...runs.map((r) => r.path),
    ...[...new Set(runs.map((r) => r.shard))].map((shard) => `${layout.rawDir}/${shard}/shard.json`),
    ...[...journalFiles].sort(),
    ...[...LIVE_ARMS, ...LIVE_TWINS].map((id) => `${layout.inputs}/${id}.ig-tree.json`),
    `${layout.inputs}/harness.json`,
    `${layout.inputs}/verify-state.json`,
    `${layout.inputs}/verify-identity.json`,
  ];
}

/**
 * The verdict of the live-deadline receipt (T09b): the identity of the observation (freeze, trees, source, raw shards,
 * producer) first, then the ten rows and the live verification with T09a's checks.
 * @param {{ freezeVariants: Record<string, any> | null, trees: Record<string, any>, twins: Record<string, any | undefined>,
 *   runs: { path: string, doc: any }[], rawShards: Record<string, any | null>, journals: Record<string, RowJournals | undefined>,
 *   state: any, identity: any, harnessNow: string, evidence: { path: string, sha256: string }[] }} input
 * @returns {Record<string, any>} A `live-deadline` envelope (`proofEnvelope`).
 */
export function liveReceipt({ freezeVariants, trees, twins, runs, rawShards, journals, state, identity, harnessNow, evidence }) {
  /** @type {string[]} */
  const incomplete = [];
  const freeze = isObject(freezeVariants) ? freezeVariants : null;
  if (freeze === null) {
    incomplete.push('no freeze record');
  } else {
    for (const id of LIVE_ARMS) {
      const today = trees[id];
      const frozen = freeze[id];
      if (!isObject(today) || !isObject(frozen) || today.treeId !== frozen.treeId || today.paramsHash !== frozen.paramsHash) {
        incomplete.push(`stale tree ${id}`);
      }
    }
  }
  if (runs.length === 0) {
    incomplete.push('no published rows');
  }
  for (const { path, doc } of runs) {
    if (doc?.meta?.source?.frozenCommit !== FROZEN_COMMIT || doc?.meta?.source?.sourceDigest !== FROZEN_DIGEST) {
      incomplete.push(`runs file ${path} is not of the frozen source`);
    }
  }
  for (const { path, doc } of runs) {
    const tree = doc?.meta?.trees?.['fr-frozen'];
    const frozen = freeze?.['fr-frozen'];
    if (freeze !== null && (!isObject(tree) || !isObject(frozen) || tree.treeId !== frozen.treeId || sha256(JSON.stringify(tree.params)) !== frozen.paramsHash)) {
      incomplete.push(`rows of another tree ${path}`);
    }
  }
  /** @type {Set<string>} */
  const missingShards = new Set();
  for (const { doc } of runs) {
    const shard = String(doc?.shard);
    if (!isObject(rawShards[shard]) && !missingShards.has(shard)) {
      missingShards.add(shard);
      incomplete.push(`no raw shard identity ${shard}`);
    }
  }
  for (const { path, doc } of runs) {
    const raw = rawShards[String(doc?.shard)];
    const tree = doc?.meta?.trees?.['fr-frozen'];
    if (isObject(raw) && (raw.treeId !== tree?.treeId || raw.copyDigest !== tree?.copyDigest || raw.harnessHash !== doc?.meta?.harness?.harnessHash)) {
      incomplete.push(`runs file ${path} differs from its raw shard`);
    }
  }
  const hashes = [...new Set(runs.map(({ doc }) => doc?.meta?.harness?.harnessHash ?? null))];
  if (hashes.length > 1) {
    incomplete.push('runs of different producers');
  }
  const harnessHash = hashes.length === 1 && typeof hashes[0] === 'string' ? hashes[0] : null;
  if (harnessHash !== null && harnessNow !== harnessHash) {
    incomplete.push('producer changed since the observation');
  }
  const rowCheck = rowChecks(runs.flatMap(({ doc }) => (Array.isArray(doc?.rows) ? doc.rows : [])), journals);
  const verifyCheck = verifyChecks({ state, identity, freezeVariants: freeze ?? undefined, parents: trees, twins, harnessHash: harnessHash ?? '' });
  incomplete.push(...rowCheck.incomplete, ...verifyCheck.incomplete);
  const failures = [...rowCheck.failures, ...verifyCheck.failures];
  const observed = [...rowCheck.observed, ...verifyCheck.observed];
  const missing = LIVE_COVERAGE.filter((id) => !observed.includes(id));
  const verdict = failures.length > 0 ? 'fail' : incomplete.length > 0 || missing.length > 0 ? 'incomplete' : 'pass';
  const first = runs[0]?.doc?.meta?.source;
  return proofEnvelope({
    kind: 'live-deadline',
    verdict,
    source: {
      frozenCommit: typeof first?.frozenCommit === 'string' ? first.frozenCommit : FROZEN_COMMIT,
      sourceDigest: typeof first?.sourceDigest === 'string' ? first.sourceDigest : null,
    },
    harnessHash,
    arms: LIVE_ARMS.map((id) => ({ id, treeId: trees[id]?.treeId ?? null, paramsHash: trees[id]?.paramsHash ?? null })),
    coverage: { expected: [...LIVE_COVERAGE], observed, missing, censored: [] },
    evidence,
    fields: {
      ...LIVE_DEADLINE_FIELDS,
      rows: rowCheck.table,
      verification: { task: LIVE_VERIFY_TASK, cases: LIVE_CASES.length },
      reasons: verdict === 'pass' ? [] : [...failures, ...incomplete, ...missing.map((id) => `missing ${id}`)],
    },
  });
}

/** @param {string} path Repository-relative. @returns {any} The parsed JSON file; null when it is absent or does not parse. */
function readJson(path) {
  const text = readRepoFile(path);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * `receipt --task <T> --label frozen [--require-pass]` (T09b): reads the freeze, the trees, the published runs files with
 * their raw shard identities and journals and the live verification; captures the trees, the producer and the
 * verification; writes the receipt once (a passing receipt is never rewritten).
 * @param {string[]} argv The arguments after `receipt`.
 * @param {{ layout?: ReturnType<typeof liveLayout>, stdout?: (text: string) => void, stderr?: (text: string) => void }} [io]
 * @returns {Promise<number>} 0; 1 for a refusal (nothing written); 2 with `--require-pass` and a receipt that does not pass.
 */
export async function receiptCommand(argv, io = {}) {
  const out = io.stdout ?? ((/** @type {string} */ text) => process.stdout.write(text));
  const err = io.stderr ?? ((/** @type {string} */ text) => process.stderr.write(text));
  /** @param {string} reason @returns {number} */
  const refuse = (reason) => {
    err(`live-deadline: ${reason}\n`);
    return 1;
  };
  /** @type {ReturnType<typeof parseArgs>} */
  let parsed;
  try {
    parsed = parseArgs(argv, { values: ['task', 'label', 'source-label'], switches: ['require-pass'] });
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
  const { args, on } = parsed;
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const task = args.task;
  if (task === undefined || task === '') {
    return refuse('receipt needs --task');
  }
  if (HISTORICAL_TASKS.includes(task)) {
    return refuse(`${task} is a historical namespace`);
  }
  const L = io.layout ?? liveLayout(task);
  if (existsSync(abs(L.receipt))) {
    const stored = readJson(L.receipt);
    if (!isObject(stored) || typeof stored.verdict !== 'string') {
      return refuse(`receipt ${L.receipt} is unreadable`);
    }
    if (stored.verdict === 'pass') {
      return refuse(`receipt ${L.receipt} exists (a passing receipt is never rewritten)`);
    }
  }
  // Captures of an earlier non-passing run must not be bound by this one.
  for (const id of [...LIVE_ARMS, ...LIVE_TWINS]) {
    rmSync(abs(`${L.inputs}/${id}.ig-tree.json`), { force: true });
  }
  for (const name of ['harness.json', 'verify-state.json', 'verify-identity.json']) {
    rmSync(abs(`${L.inputs}/${name}`), { force: true });
  }
  const freezeRecord = readJson(L.freeze);
  const freezeVariants = isObject(freezeRecord) && isObject(freezeRecord.variants) ? freezeRecord.variants : null;
  /** @type {Record<string, any>} */
  const trees = {};
  /** @type {Record<string, any>} */
  const treeInfos = {};
  for (const id of [...LIVE_ARMS, ...LIVE_TWINS]) {
    await ensureTree(id, { sourceLabel: args['source-label'] });
    treeInfos[id] = readTreeInfo(id);
  }
  for (const id of LIVE_ARMS) {
    trees[id] = { ...treeInfos[id], paramsHash: sha256(JSON.stringify(treeInfos[id].params)) };
  }
  const state = readJson(L.verifyState);
  const identity = readJson(L.verifyIdentity);
  const runNames = existsSync(abs(L.runsDir)) ? readdirSync(abs(L.runsDir)).filter((n) => n.endsWith('.runs.json')).sort() : [];
  const runs = runNames.map((name) => {
    const path = `${L.runsDir}/${name}`;
    const doc = readJson(path);
    return { path, doc: isObject(doc) ? doc : {} };
  });
  /** @type {Record<string, any | null>} */
  const rawShards = {};
  /** @type {Record<string, RowJournals | undefined>} */
  const journals = {};
  /** @type {string[]} */
  const journalFiles = [];
  for (const { doc } of runs) {
    const shard = String(doc.shard);
    if (!/^[A-Za-z0-9._~-]+$/.test(shard) || Object.hasOwn(rawShards, shard)) {
      continue;
    }
    rawShards[shard] = readJson(`${L.rawDir}/${shard}/shard.json`);
  }
  for (const declared of LIVE_DECLARED) {
    const owner = runs.find(({ doc }) => Array.isArray(doc.rows) && doc.rows.some((/** @type {any} */ r) => isObject(r) && r.rowKey === declared.rowKey));
    const shard = owner === undefined ? '' : String(owner.doc.shard);
    const logs = `${L.rawDir}/${shard}/logs`;
    if (!/^[A-Za-z0-9._~-]+$/.test(shard) || !existsSync(abs(logs))) {
      continue;
    }
    const names = readdirSync(abs(logs)).sort().filter((n) => n.startsWith(`${declared.rowKey}.`) && n.endsWith('.jsonl') && !n.endsWith('.row.jsonl'));
    const link = `${declared.rowKey}.link.jsonl`;
    const workers = names.filter((n) => n !== link);
    if (workers.length === 0 && !names.includes(link)) {
      continue;
    }
    /** @type {RowJournals} */
    const journal = { lines: [], links: null, problems: [] };
    for (const name of names) {
      const path = `${logs}/${name}`;
      journalFiles.push(path);
      const got = parseLines(readRepoFile(path) ?? '', path);
      journal.problems.push(...got.problems);
      if (name === link) {
        journal.links = got.lines;
      } else {
        journal.lines.push(...got.lines);
      }
    }
    journals[declared.rowKey] = journal;
  }
  const harnessNow = harnessInfo();
  const hashes = [...new Set(runs.map(({ doc }) => doc.meta?.harness?.harnessHash ?? null))];
  for (const id of LIVE_ARMS) {
    writeJson(abs(`${L.inputs}/${id}.ig-tree.json`), treeInfos[id]);
  }
  /** @type {Record<string, any>} */
  const twins = {};
  for (const id of LIVE_TWINS) {
    if (isObject(identity?.trees?.[id]) && treeInfos[id].treeId === identity.trees[id].treeId) {
      twins[id] = treeInfos[id];
      writeJson(abs(`${L.inputs}/${id}.ig-tree.json`), treeInfos[id]);
    }
  }
  if (hashes.length === 1 && hashes[0] === harnessNow.harnessHash) {
    writeJson(abs(`${L.inputs}/harness.json`), harnessNow);
  }
  if (state !== null) {
    writeJson(abs(`${L.inputs}/verify-state.json`), state);
  }
  if (identity !== null) {
    writeJson(abs(`${L.inputs}/verify-identity.json`), identity);
  }
  const evidence = liveEvidencePaths(L, {
    runs: runs.map(({ path, doc }) => ({ path, shard: String(doc.shard) })),
    journalFiles,
  }).filter((path) => existsSync(abs(path))).map((path) => ({ path, sha256: sha256File(abs(path)) }));
  const receipt = liveReceipt({
    freezeVariants, trees, twins, runs, rawShards, journals, state, identity, harnessNow: harnessNow.harnessHash, evidence,
  });
  writeJson(abs(L.receipt), receipt);
  out(`receipt: live-deadline ${receipt.verdict} -> ${L.receipt}\n`);
  if (receipt.verdict !== 'pass') {
    err(`live-deadline: the receipt is ${receipt.verdict} (${receipt.reasons.join('; ')})\n`);
  }
  return on.has('require-pass') && receipt.verdict !== 'pass' ? 2 : 0;
}

/**
 * @param {string[]} argv
 * @param {Parameters<typeof receiptCommand>[1]} [io]
 * @returns {Promise<number>}
 */
export async function main(argv, io = {}) {
  const [command, ...rest] = argv;
  if (command === 'receipt') {
    return receiptCommand(rest, io);
  }
  process.stderr.write('usage: node tools\\ig-proto\\live-deadline.mjs receipt --task V4-LIVE [--require-pass] --label frozen --source-label <SL>\n');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
