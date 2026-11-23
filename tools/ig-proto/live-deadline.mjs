// @ts-check
// The live-deadline receipt (N-V4-13; stages 2 to 4 pack T09a to T09c; plan 4.5): kind `live-deadline` with the fields
// LIVE_DEADLINE_FIELDS, binding the live verification of S04 and the ten rows of V4-LIVE, for both bounded twins.
// Unlocked: it reads records, copies the inputs it binds and writes the receipt once; it rates nothing.
import { isDeepStrictEqual } from 'node:util';

import { FROZEN_COMMIT, FROZEN_DIGEST } from './lib/paths.mjs';
import { ingestRow, rowLedger } from './verdicts.mjs';

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
