// @ts-check
// The comparator and the stage gates of phase 2 (P2-13b): equality with the frozen oracles first, then the gates of each
// report stage, computed with the frozen statistics of `tools/ig-proto/verdicts.mjs` (never copied or changed). A gate of
// a later stage is `not-due`; a gate missing an expected input is `incomplete`, never `pass`. No engine runs here.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  cellGate, classVerdict, completion, hell1Report, ingestRow, masterIdentity, population, reachedTen,
} from '../verdicts.mjs';
import { browserGate, resourceGate, sha256Hex, verifyProof } from './binding.mjs';
import { coverage, ELIGIBLE, isEligible } from './p5.mjs';
import { workLedger } from './trace-reader.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const S4 = 'docs/improve-generating/evidence/frozen/V4-S4';
const S4C = 'docs/improve-generating/evidence/frozen/V4-S4C';

/** The frozen options of every statistic (plan §6, D-V4-16). */
export const OPTIONS = Object.freeze({ quantity: 10, capMs: 120000, responseBoundMs: 120000, resamples: 10000, resampleSeed: 20261116 });
export const REPS = Object.freeze(Array.from({ length: 20 }, (_, i) => 20 + i));
export const MASTER_REPS = Object.freeze([20, 21, 22, 23, 24]);
/** The five wall-clock causes (R4): a run cut by one of them is compared on a prefix only. */
export const WALL_CLOCK_CAUSES = Object.freeze(['time-limit', 'set:time-limit', 'set:reserve-cut', 'response-bound', 'set:response-bound']);
/** The cohorts that carry the statistics; `smoke`, `require` and `conditional-twin` never mix with them (R4). */
export const MAIN_COMPONENTS = Object.freeze(['shipped', 'shipped-master', 'baseline-control', 'baseline-master', 'n-mid-no-screen', 'non-table']);
export const PROOF_BUNDLES = Object.freeze(['observer', 'certificate', 'prior-replay', 'legacy']);
export const STAGES = Object.freeze(['smoke', 'A', 'B']);
export const PROCESS_LIMIT_MIB = 1536;
export const ACCOUNTED_LIMIT_MIB = 1196;
const MIB = 1024 * 1024;

const nightmare = (/** @type {string[]} */ cells) => cells.map((c) => `${c}-nightmare`);
const A1_CELLS = nightmare(['3x29', '22x22', '32x15']);
const A2_CELLS = nightmare(['11x11', '18x19', '21x21']);
const A2_COMPLETION_CELL = '15x15-nightmare';
/** The failing cells of B1; the report reads the journals of their rows. */
export const B1_CELLS = Object.freeze(nightmare(['12x12', '14x14', '15x15b10', '16x16', '15x20']));
const B2_CELLS = nightmare(['10x10', '18x20', '20x20', '20x21', '24x24']);
const B2_COMPLETION_CELL = '18x18-nightmare';
const B2_IDENTITY_CELL = '26x26-nightmare';
const B4_CELLS = nightmare(['14x14', '15x15b10', '16x16']);
const HELL_CELLS = ['14x14', '20x20', '24x24', '26x26'].map((c) => `${c}-hell-1`);
const MASTER_CELLS = ['6x10', '3x29', '10x10', '12x12', '14x14', '15x15b10', '16x16', '15x20', '18x18', '18x20', '20x20', '20x21', '32x15', '22x22', '24x24', '26x26']
  .map((c) => `${c}-master`);
/** The arm pairs of the plan: component and arm of each side (B5 reads them two-sided). */
const PAIRS = Object.freeze([
  ['shipped', 'gen-v4', 'baseline-control', 'today'],
  ['shipped-master', 'gen-v4', 'baseline-master', 'today'],
  ['shipped', 'gen-v4', 'n-mid-no-screen', 'no-screen'],
  ['non-table', 'gen-v4', 'non-table', 'today'],
]);
/** The cells whose frozen oracle is the `fr-frozen` arm (the capped, screened arm). */
const FR_FROZEN_CELLS = Object.freeze(['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare']);

const isObject = (/** @type {unknown} */ v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const byText = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0);

/** @param {string} file @returns {any | null} The parsed JSON file, or null when it is absent or unreadable. */
export function readJsonOrNull(file) {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  } catch {
    return null;
  }
}

/**
 * The frozen oracle file of a row (R4), or null: `{ path, arm }`, where `path` is repository-relative and `arm` the
 * oracle's own folder name.
 * @param {{ component: string, arm: string, cell: string }} row
 * @param {string} [root] The repository root, or the self-test root with the same layout.
 * @returns {{ path: string, arm: string } | null}
 */
export function oracleOf(row, root = ROOT) {
  const { component, arm, cell } = row;
  if (component === 'non-table' || component === 'require') {
    return null;
  }
  /** @type {string | null} */
  let folder = null;
  let file = `val-${cell}.runs.json`;
  if (component === 'conditional-twin') {
    folder = FR_FROZEN_CELLS.includes(cell) ? `${S4C}/fr-frozen-uncapped` : `${S4C}/fr-frozen-none-uncapped`;
  } else if (cell.endsWith('-master')) {
    folder = `${S4}/log-link`;
    file = `master-${cell}.runs.json`;
  } else if (arm === 'gen-v4') {
    folder = FR_FROZEN_CELLS.includes(cell) ? `${S4}/fr-frozen` : cell === '26x26-nightmare' ? `${S4}/log-link` : `${S4}/fr-frozen-none`;
  } else if (arm === 'today' && cell.endsWith('-nightmare')) {
    folder = `${S4}/log-link`;
  } else if (arm === 'no-screen') {
    folder = `${S4}/fr-frozen-none`;
  }
  if (folder === null) {
    return null;
  }
  const path = `${folder}/${file}`;
  return existsSync(join(root, ...path.split('/'))) ? { path, arm: /** @type {string} */ (folder.split('/').pop()) } : null;
}

/**
 * @param {string} path From `oracleOf`.
 * @param {string} [root]
 * @returns {Map<number, any>} The rows of an oracle file (`{ meta, shard, rows }`), by `rep`; the first row of a rep wins.
 */
export function loadOracle(path, root = ROOT) {
  const file = JSON.parse(readFileSync(join(root, ...path.split('/')), 'utf8'));
  /** @type {Map<number, any>} */
  const byRep = new Map();
  for (const row of Array.isArray(file.rows) ? file.rows : []) {
    if (!byRep.has(row.rep)) {
      byRep.set(row.rep, row);
    }
  }
  return byRep;
}

/**
 * Equality of a run with its oracle run (R4). Both runs exact: equal accepted counts, set keys, ordered puzzle keys and
 * result digests. A wall-clock cause on either side: equal set keys and equal puzzle keys on the common prefix. An empty
 * prefix, a missing key list or a missing run is no evidence, never equality.
 * @param {any} run
 * @param {any} oracleRun
 * @returns {{ verdict: 'equal' } | { verdict: 'prefix-equal', n: number } | { verdict: 'differ', path: string } | { verdict: 'no-evidence', why: string }}
 */
export function equality(run, oracleRun) {
  /** @param {string} why */
  const none = (why) => /** @type {const} */ ({ verdict: 'no-evidence', why });
  /** @param {string} path */
  const differ = (path) => /** @type {const} */ ({ verdict: 'differ', path });
  if (!isObject(run)) {
    return none('no run');
  }
  if (!isObject(oracleRun)) {
    return none('no oracle row');
  }
  const wallClock = WALL_CLOCK_CAUSES.includes(run.partialReason) || WALL_CLOCK_CAUSES.includes(oracleRun.partialReason);
  const setKey = run.details?.igSetKey;
  const oracleSetKey = oracleRun.details?.igSetKey;
  const keys = run.details?.igPuzzleKeys;
  const oracleKeys = oracleRun.details?.igPuzzleKeys;
  if (!wallClock) {
    if (!Number.isInteger(run.acceptedCount) || !Number.isInteger(oracleRun.acceptedCount)) {
      return none('acceptedCount missing');
    }
    if (run.acceptedCount !== oracleRun.acceptedCount) {
      return differ('acceptedCount');
    }
    if (setKey !== oracleSetKey) {
      return differ('details.igSetKey');
    }
    if (!Array.isArray(keys) || !Array.isArray(oracleKeys)) {
      return none('missing igPuzzleKeys');
    }
    for (let i = 0; i < Math.max(keys.length, oracleKeys.length); i += 1) {
      if (keys[i] !== oracleKeys[i]) {
        return differ(`details.igPuzzleKeys.${i}`);
      }
    }
    return run.details?.resultDigest === oracleRun.details?.resultDigest ? { verdict: 'equal' } : differ('details.resultDigest');
  }
  if (typeof setKey !== 'string' || typeof oracleSetKey !== 'string') {
    return none('missing igSetKey');
  }
  if (setKey !== oracleSetKey) {
    return differ('details.igSetKey');
  }
  if (!Array.isArray(keys) || !Array.isArray(oracleKeys)) {
    return none('missing igPuzzleKeys');
  }
  const n = Math.min(keys.length, oracleKeys.length);
  if (n === 0) {
    return none('empty prefix');
  }
  for (let i = 0; i < n; i += 1) {
    if (keys[i] !== oracleKeys[i]) {
      return differ(`details.igPuzzleKeys.${i}`);
    }
  }
  return { verdict: 'prefix-equal', n };
}

/**
 * The equality of every row that has an oracle, against the oracle row of the same rep.
 * @param {Record<string, any>[]} rows Published row lines.
 * @param {string} [root] The repository root, or the self-test root.
 * @returns {({ key: string, oracle: string } & ReturnType<typeof equality>)[]}
 */
export function equalityOf(rows, root = ROOT) {
  /** @type {Map<string, Map<number, any>>} */
  const loaded = new Map();
  return rows.flatMap((row) => {
    const oracle = oracleOf(row, root);
    if (oracle === null) {
      return [];
    }
    if (!loaded.has(oracle.path)) {
      loaded.set(oracle.path, loadOracle(oracle.path, root));
    }
    const oracleRow = /** @type {Map<number, any>} */ (loaded.get(oracle.path)).get(row.rep);
    return [{ key: row.key, oracle: oracle.path, ...equality(row.run, oracleRow?.run ?? null) }];
  });
}

/**
 * @param {Record<string, any>[]} rows
 * @returns {Record<string, Record<string, Record<string, any[]>>>} The rows by `component`, then `arm`, then `cell`.
 */
export function cohorts(rows) {
  /** @type {Record<string, Record<string, Record<string, any[]>>>} */
  const out = {};
  for (const row of rows) {
    const arms = (out[row.component] ??= {});
    const cells = (arms[row.arm] ??= {});
    (cells[row.cell] ??= []).push(row);
  }
  return out;
}

/** @typedef {'pass' | 'fail' | 'incomplete' | 'not-due'} GateStatus */
/** @typedef {{ id: string, stage: string, status: GateStatus, rows: string[], detail: Record<string, any> }} Gate */

/**
 * What the gates read. The caller reads every file; only `smokeGate` and `oracleRoot` make this module touch the disk.
 * @typedef {object} GateInput
 * @property {Record<string, any>[]} rows The rows whose binding passed, every component (a refused row is missing evidence).
 * @property {{ key: string, stage?: string, problems?: string[] }[]} [refused] The rows `verifyRow` refused.
 * @property {Record<string, any>} [seal] The active seal (C13).
 * @property {{ rows: Record<string, any>[] } | null} [plan] The sealed plan: the 50 `require` keys and the eight smoke keys.
 * @property {Record<string, any[] | null>} [journals] A row's `fileKey` to the lines of its worker journals, or null.
 * @property {Record<string, any> | null} [replay] `E/replay-probes/receipt.json` (C15), or null.
 * @property {Record<string, Record<string, any> | null>} [browser] The parsed `E/browser/<check>/receipt.json` of each check.
 * @property {Record<string, Record<string, any> | null>} [proofs] The parsed `E/proofs/<bundle>/result.json` of each bundle.
 * @property {({ key: string, verdict: string } & Record<string, any>)[]} [equality] `equalityOf` of the rows.
 * @property {string} [oracleRoot] Where the frozen oracles are read from (B5's historical populations, B8's counterparts and readings).
 * @property {string[]} [interrupted] The keys whose terminal status line is `interrupted` (B8: censored, never zero).
 */

/** @param {string} id @param {string} stage @param {GateStatus} status @param {string[]} rows @param {Record<string, any>} detail @returns {Gate} */
const record = (id, stage, status, rows, detail) => ({ id, stage, status, rows, detail });
/** @param {string[]} verdicts @returns {'pass' | 'fail' | 'incomplete'} A failed part fails the gate, then an incomplete part. */
const worst = (verdicts) => (verdicts.includes('fail') ? 'fail' : verdicts.includes('incomplete') ? 'incomplete' : 'pass');
const keysOf = (/** @type {Record<string, any>[]} */ rows) => [...new Set(rows.map((r) => r.key))];

/** @param {Record<string, any>} row The published row line. @returns {ReturnType<typeof ingestRow>} */
const ingest = (row) => ingestRow({ rowKey: row.fileKey, caseId: row.cell, rep: row.rep, seed: row.seed, localRep: row.rep, run: row.run }, { quantity: OPTIONS.quantity });

/** @typedef {Record<string, Record<string, Record<string, any[]>>>} Cohorts */
const rowsOf = (/** @type {Cohorts} */ coh, /** @type {string} */ component, /** @type {string} */ arm, /** @type {string} */ cell) => coh[component]?.[arm]?.[cell] ?? [];

/**
 * A control cell: the shipped arm against today's (`cellGate('control', ...)`).
 * @param {Cohorts} coh @param {string} cell @param {string} component The component of the shipped arm's rows.
 * @param {[string, string]} arms The shipped arm and today's arm.
 * @param {string} [todayComponent] The component of today's rows, when it is not `component`.
 */
function controlEntry(coh, cell, component, arms, todayComponent = component) {
  const shipped = rowsOf(coh, component, arms[0], cell);
  const today = rowsOf(coh, todayComponent, arms[1], cell);
  const gate = cellGate('control', shipped.map(ingest), { reps: [...REPS], ...OPTIONS, todayRows: today.map(ingest) });
  return {
    entry: {
      cell, verdict: gate.verdict, reasons: gate.reasons, reachedTen: gate.reachedTen, deadlineViolations: gate.deadlineViolations,
      p95Ms: gate.p95Ms, noRegression: gate.noRegression,
    },
    rows: [...shipped, ...today],
    gate,
  };
}

/**
 * A cell judged by completion only: at most two valid requests short of ten, every declared rep present and valid.
 * No ratio, no lower bound.
 * @param {Record<string, any>[]} rows The shipped arm's rows of the cell. @param {string} cell
 */
function completionEntry(rows, cell) {
  const ingested = rows.map(ingest);
  const declared = new Set(REPS);
  const scoped = ingested.filter((r) => declared.has(r.rep));
  const valid = scoped.filter((r) => r.status === 'valid');
  const stats = completion(scoped, OPTIONS);
  const short = valid.filter((r) => !reachedTen(r.run, OPTIONS));
  /** @type {string[]} */
  const problems = [];
  for (const rep of REPS) {
    const found = ingested.filter((r) => r.rep === rep);
    if (found.length === 0) {
      problems.push(`missing row: rep ${rep}`);
    } else if (found.length > 1) {
      problems.push(`duplicate rows: rep ${rep} has ${found.length}`);
    } else if (found[0].status !== 'valid') {
      problems.push(`status ${found[0].status}: rep ${rep}`);
    }
  }
  for (const r of ingested) {
    if (!declared.has(r.rep)) {
      problems.push(`row outside the declared replicates: rep ${String(r.rep)}`);
    }
  }
  const incorrect = ingested.filter((r) => r.status === 'incorrect');
  /** @type {'pass' | 'fail' | 'incomplete'} */
  let verdict = 'pass';
  /** @type {string[]} */
  let reasons = [];
  if (incorrect.length > 0) {
    verdict = 'fail';
    reasons = incorrect.map((r) => `incorrect row: rep ${String(r.rep)}`);
  } else if (short.length >= 3) {
    verdict = 'fail';
    reasons = [`${short.length} valid requests did not reach ten (reps ${short.map((r) => r.rep).join(', ')})`];
  } else if (problems.length > 0) {
    verdict = 'incomplete';
    reasons = problems;
  }
  return { cell, verdict, reasons, reachedTen: stats.reachedTen, requests: scoped.length, completionOnly: true };
}

/** @typedef {{ input: GateInput, coh: Cohorts, equalityByKey: Map<string, Record<string, any>> }} Ctx */

/** @param {Ctx} ctx @returns {Gate} */
function s1({ input }) {
  /** @type {string[]} */
  const problems = [];
  let failed = false;
  let incomplete = false;
  for (const bundle of PROOF_BUNDLES) {
    const result = input.proofs?.[bundle] ?? null;
    if (result === null) {
      problems.push(`S1 proof ${bundle}: missing`);
      incomplete = true;
      continue;
    }
    if (result.bundle !== bundle) {
      problems.push(`S1 proof ${bundle}: bundle ${String(result.bundle)}`);
      failed = true;
    }
    if (result.status !== 'pass') {
      problems.push(`S1 proof ${bundle}: status ${String(result.status)}`);
      failed = true;
    }
    if (input.seal === undefined) {
      problems.push(`S1 proof ${bundle}: no seal to bind it to`);
      incomplete = true;
      continue;
    }
    for (const problem of verifyProof(result, input.seal).problems) {
      problems.push(`S1 proof ${bundle}: ${problem}`);
      failed = true;
    }
  }
  return record('S1', 'smoke', failed ? 'fail' : incomplete ? 'incomplete' : 'pass', [], { bundles: [...PROOF_BUNDLES], problems });
}

/** @param {Ctx} ctx @returns {Gate} */
function s2({ input, coh, equalityByKey }) {
  const have = Object.values(coh.smoke ?? {}).flatMap((cells) => Object.values(cells).flat());
  const expected = input.plan
    ? input.plan.rows.filter((r) => r.component === 'smoke').map((r) => r.key)
    : keysOf(have);
  /** @type {string[]} */
  const problems = [];
  let failed = false;
  let incomplete = expected.length === 0;
  if (expected.length === 0) {
    problems.push('S2: no smoke rows');
  }
  for (const key of expected) {
    const row = have.find((r) => r.key === key);
    const eq = equalityByKey.get(key);
    if (!row) {
      problems.push(`S2 ${key}: missing row`);
      incomplete = true;
    } else if (!eq) {
      problems.push(`S2 ${key}: no oracle`);
      incomplete = true;
    } else if (eq.verdict === 'differ') {
      problems.push(`S2 ${key}: differ ${eq.path}`);
      failed = true;
    } else if (eq.verdict === 'no-evidence') {
      problems.push(`S2 ${key}: no evidence (${eq.why})`);
      incomplete = true;
    }
  }
  const verdicts = expected.map((key) => equalityByKey.get(key)?.verdict ?? 'missing');
  return record('S2', 'smoke', failed ? 'fail' : incomplete ? 'incomplete' : 'pass', expected, { verdicts, problems });
}

/** @param {Ctx} ctx @returns {Gate} */
function a1({ coh }) {
  const parts = A1_CELLS.map((cell) => controlEntry(coh, cell, 'shipped', ['gen-v4', 'today'], 'baseline-control'));
  return record('A1', 'A', worst(parts.map((p) => p.entry.verdict)), keysOf(parts.flatMap((p) => p.rows)), { cells: parts.map((p) => p.entry) });
}

/** @param {Ctx} ctx @returns {Gate} */
function a2({ coh }) {
  const parts = A2_CELLS.map((cell) => controlEntry(coh, cell, 'non-table', ['gen-v4', 'today']));
  const sentinel = rowsOf(coh, 'non-table', 'gen-v4', A2_COMPLETION_CELL);
  const entries = [...parts.map((p) => p.entry), completionEntry(sentinel, A2_COMPLETION_CELL)];
  return record('A2', 'A', worst(entries.map((e) => e.verdict)), keysOf([...parts.flatMap((p) => p.rows), ...sentinel]), { cells: entries });
}

/** @param {Ctx} ctx @returns {Gate} */
function a3({ input, coh }) {
  const required = (input.plan?.rows ?? []).filter((r) => r.component === 'require').map((r) => r.key);
  const present = Object.values(coh.require ?? {}).flatMap((cells) => Object.values(cells).flat());
  /** @type {string[]} */
  const problems = [];
  let failed = false;
  if (!input.plan || required.length === 0) {
    problems.push('A3: the plan has no require rows');
  }
  for (const key of required) {
    const found = present.filter((r) => r.key === key).length;
    if (found !== 1) {
      problems.push(`A3 ${key}: ${found === 0 ? 'no row line' : 'duplicate row lines'}`);
    }
  }
  // `require` rows have no oracle, so this is where their correctness shows.
  for (const row of present) {
    const ingested = ingest(row);
    if (ingested.status === 'incorrect') {
      problems.push(`A3 ${row.key}: incorrect (${ingested.problems[0]})`);
      failed = true;
    } else if (ingested.status !== 'valid') {
      problems.push(`A3 ${row.key}: status ${ingested.status}`);
    }
  }
  const cells = [];
  for (const [arm, byCell] of Object.entries(coh.require ?? {})) {
    for (const [cell, rows] of Object.entries(byCell)) {
      const ingested = rows.map(ingest);
      cells.push({
        arm,
        cell,
        rows: rows.length,
        reachedTen: ingested.filter((r) => r.status === 'valid' && reachedTen(r.run, OPTIONS)).length,
        statuses: completion(ingested, OPTIONS).statuses,
        unique: rows.reduce((sum, r) => sum + (r.run?.certificates?.unique ?? 0), 0),
        budgetStops: rows.reduce((sum, r) => sum + (r.telemetry?.setCounters?.budgetStops ?? 0) + (r.telemetry?.batchCounters?.budgetStops ?? 0), 0),
        deadlineStops: rows.filter((r) => WALL_CLOCK_CAUSES.includes(r.run?.partialReason)).length,
      });
    }
  }
  cells.sort((a, b) => byText(`${a.arm}/${a.cell}`, `${b.arm}/${b.cell}`));
  return record('A3', 'A', failed ? 'fail' : problems.length === 0 ? 'pass' : 'incomplete', keysOf(present), { expected: required.length, cells, problems });
}

/** @param {Ctx} ctx @returns {Gate} */
function a4({ input }) {
  const result = resourceGate(input.replay ?? null, input.seal ?? {});
  const problems = result.items.flatMap((i) => i.problems.map((p) => `A4 item ${i.n} (${i.cell}): ${p}`));
  return record('A4', 'A', result.status, [], { items: result.items, problems });
}

/** @param {Ctx} ctx @returns {Gate} */
function a5({ input }) {
  const result = browserGate(input.browser ?? {}, input.seal ?? {});
  const problems = result.checks.flatMap((c) => c.problems.map((p) => `A5 ${c.check}: ${p}`));
  return record('A5', 'A', result.status, [], { checks: result.checks, problems });
}

/**
 * Memory (P2-T12; A6 and B7): the process peak, the accounted peak and `model-too-large`, over every row of the stage.
 * @param {Record<string, any>[]} rows
 * @param {{ key: string }[]} [refused] Rows of the stage that `verifyRow` refused: missing evidence.
 * @returns {{ status: 'pass' | 'fail' | 'incomplete', problems: string[], rows: string[] }}
 */
export function memory(rows, refused = []) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const missing = refused.map(({ key }) => `${key}: refused, no usable evidence`);
  if (rows.length + refused.length === 0) {
    missing.push('no rows');
  }
  for (const row of rows) {
    const run = row.run;
    for (const [field, limit] of /** @type {const} */ ([['peakProcessBytes', PROCESS_LIMIT_MIB], ['peakAccountedBytes', ACCOUNTED_LIMIT_MIB]])) {
      const bytes = run?.[field];
      if (typeof bytes !== 'number' || !Number.isFinite(bytes)) {
        missing.push(`${row.key}: ${field} missing`);
      } else if (bytes > limit * MIB) {
        failures.push(`${row.key}: ${field} ${Math.round(bytes / MIB)} MiB exceeds ${limit} MiB`);
      }
    }
    if ((Array.isArray(run?.errors) ? run.errors : []).some((/** @type {any} */ e) => e?.code === 'model-too-large')) {
      failures.push(`${row.key}: model-too-large`);
    }
  }
  return {
    status: failures.length > 0 ? 'fail' : missing.length > 0 ? 'incomplete' : 'pass',
    problems: [...failures, ...missing],
    rows: keysOf(rows),
  };
}

/** @param {'A' | 'B'} stage @returns {(ctx: Ctx) => Gate} */
const memoryGate = (stage) => ({ input }) => {
  const result = memory(
    input.rows.filter((r) => r.stage === stage),
    (input.refused ?? []).filter((r) => r.stage === stage),
  );
  return record(stage === 'A' ? 'A6' : 'B7', stage, result.status, result.rows, { limits: { processMiB: PROCESS_LIMIT_MIB, accountedMiB: ACCOUNTED_LIMIT_MIB }, problems: result.problems });
};

/** @param {Ctx} ctx */
function b1Entries({ input, coh }) {
  return B1_CELLS.map((cell) => {
    const rows = rowsOf(coh, 'shipped', 'gen-v4', cell);
    const gate = cellGate('failing', rows.map(ingest), { reps: [...REPS], ...OPTIONS, journals: input.journals ?? {} });
    return {
      rows,
      entry: { cell, verdict: gate.verdict, reasons: gate.reasons, reachedTen: gate.reachedTen, deadEnds: gate.deadEnds, deadlineViolations: gate.deadlineViolations, p95Ms: gate.p95Ms },
    };
  });
}

/** @param {Ctx} ctx @returns {Gate} */
function b1(ctx) {
  const parts = b1Entries(ctx);
  return record('B1', 'B', worst(parts.map((p) => p.entry.verdict)), keysOf(parts.flatMap((p) => p.rows)), { cells: parts.map((p) => p.entry) });
}

/** @param {Ctx} ctx @returns {Gate} */
function b2({ coh, equalityByKey }) {
  const controls = B2_CELLS.map((cell) => controlEntry(coh, cell, 'shipped', ['gen-v4', 'today'], 'baseline-control'));
  const completionRows = rowsOf(coh, 'shipped', 'gen-v4', B2_COMPLETION_CELL);
  // The 26x26 cell is judged by puzzle identity with `log-link`; its timing is reported, never gated.
  const timing = controlEntry(coh, B2_IDENTITY_CELL, 'shipped', ['gen-v4', 'today'], 'baseline-control');
  const identityShipped = rowsOf(coh, 'shipped', 'gen-v4', B2_IDENTITY_CELL);
  /** @type {string[]} */
  const reasons = [];
  let incomplete = false;
  let failed = false;
  const counts = { equal: 0, prefixEqual: 0, noEvidence: 0, missing: 0 };
  for (const rep of REPS) {
    const found = identityShipped.filter((r) => r.rep === rep);
    const eq = found.length === 1 ? equalityByKey.get(found[0].key) : undefined;
    if (found.length !== 1) {
      reasons.push(`rep ${rep}: ${found.length === 0 ? 'missing' : 'duplicate'} row`);
      incomplete = true;
      counts.missing += 1;
    } else if (!eq) {
      reasons.push(`rep ${rep}: no oracle comparison`);
      incomplete = true;
      counts.missing += 1;
    } else if (eq.verdict === 'equal') {
      counts.equal += 1;
    } else if (eq.verdict === 'prefix-equal') {
      counts.prefixEqual += 1;
    } else if (eq.verdict === 'differ') {
      reasons.push(`rep ${rep}: differ ${eq.path}`);
      failed = true;
    } else {
      reasons.push(`rep ${rep}: no evidence (${eq.why})`);
      incomplete = true;
      counts.noEvidence += 1;
    }
  }
  const entries = [
    ...controls.map((p) => p.entry),
    completionEntry(completionRows, B2_COMPLETION_CELL),
    {
      cell: B2_IDENTITY_CELL,
      verdict: failed ? 'fail' : incomplete ? 'incomplete' : 'pass',
      reasons,
      identity: counts,
      timing: { reachedTen: timing.gate.reachedTen, deadlineViolations: timing.gate.deadlineViolations, p95Ms: timing.gate.p95Ms, noRegression: timing.gate.noRegression },
    },
  ];
  return record('B2', 'B', worst(entries.map((e) => e.verdict)), keysOf([...controls.flatMap((p) => p.rows), ...completionRows, ...timing.rows]), { cells: entries });
}

/** @param {Ctx} ctx @returns {Gate} */
function b3({ coh }) {
  /** @type {Record<string, any>[]} */
  const used = [];
  const entries = MASTER_CELLS.map((cell) => {
    const after = rowsOf(coh, 'shipped-master', 'gen-v4', cell);
    const today = rowsOf(coh, 'baseline-master', 'today', cell);
    used.push(...after, ...today);
    const result = masterIdentity(today.map(ingest), after.map(ingest), [...MASTER_REPS]);
    return { cell, verdict: result.verdict, differences: result.differences, problems: result.problems };
  });
  return record('B3', 'B', worst(entries.map((e) => e.verdict)), keysOf(used), { cells: entries });
}

/** @param {Ctx} ctx @returns {Gate} */
function b4(ctx) {
  const { coh } = ctx;
  const cellGates = new Map(b1Entries(ctx).map((p) => [p.entry.cell, p.entry.verdict]));
  // The ten C9 fields only here, at the statistical boundary (review-2 R2-01); a row without a ledger has no journal.
  /** @param {Record<string, any>[]} rows @returns {Record<string, any>} */
  const ledgers = (rows) => Object.fromEntries(rows.filter((r) => isObject(r.ledger)).map((r) => [r.fileKey, workLedger(/** @type {any} */ (r.ledger))]));
  /** @type {Record<string, any>[]} */
  const used = [];
  const cells = B4_CELLS.map((cell) => {
    const screen = rowsOf(coh, 'shipped', 'gen-v4', cell);
    const noScreen = rowsOf(coh, 'n-mid-no-screen', 'no-screen', cell);
    used.push(...screen, ...noScreen);
    return {
      cell,
      screenRows: screen.map(ingest),
      noScreenRows: noScreen.map(ingest),
      screenLedgers: ledgers(screen),
      noScreenLedgers: ledgers(noScreen),
      screenCellGate: /** @type {'pass' | 'fail' | 'incomplete'} */ (cellGates.get(cell) ?? 'incomplete'),
    };
  });
  const verdict = classVerdict({ cells, reps: [...REPS], ...OPTIONS });
  const status = verdict.verdict === 'admitted' ? 'pass' : verdict.verdict === 'failed' ? 'fail' : 'incomplete';
  return record('B4', 'B', status, keysOf(used), {
    verdict: verdict.verdict, decidedBy: verdict.decidedBy, clue: verdict.clue, faster: verdict.faster, work: verdict.work,
    evidence: verdict.evidence, completion: verdict.completion, problems: verdict.problems,
  });
}

/** @param {Ctx} ctx @returns {Gate} */
function b5({ input, coh }) {
  /** @type {Record<string, Record<string, Record<string, any>>>} */
  const live = {};
  const populations = [];
  /** @type {Record<string, any>[]} */
  const used = [];
  let evidenceProblems = 0;
  for (const component of MAIN_COMPONENTS) {
    for (const [arm, byCell] of Object.entries(coh[component] ?? {})) {
      const rows = Object.values(byCell).flat();
      used.push(...rows);
      for (const [cell, pop] of Object.entries(population(rows.map(ingest), { quantity: OPTIONS.quantity }))) {
        ((live[component] ??= {})[arm] ??= {})[cell] = pop;
        evidenceProblems += pop.evidenceProblems.length;
        populations.push({ component, arm, cell, historical: false, population: pop });
      }
    }
  }
  const historical = [];
  if (input.oracleRoot !== undefined) {
    for (const p of populations) {
      const oracle = oracleOf({ component: p.component, arm: p.arm, cell: p.cell }, input.oracleRoot);
      if (oracle === null) {
        continue;
      }
      try {
        const rows = [...loadOracle(oracle.path, input.oracleRoot).values()].map((r) => ingestRow(r, { quantity: OPTIONS.quantity }));
        historical.push({ component: p.component, arm: p.arm, cell: p.cell, historical: true, path: oracle.path, population: population(rows, { quantity: OPTIONS.quantity })[p.cell] ?? null });
      } catch (error) {
        historical.push({ component: p.component, arm: p.arm, cell: p.cell, historical: true, path: oracle.path, error: String(/** @type {Error} */ (error).message) });
      }
    }
  }
  // Two-sided only where the plan pairs arms.
  const paired = PAIRS.flatMap(([leftComponent, leftArm, rightComponent, rightArm]) => Object.keys(live[leftComponent]?.[leftArm] ?? {})
    .filter((cell) => live[rightComponent]?.[rightArm]?.[cell])
    .map((cell) => ({
      pair: `${leftComponent}/${leftArm} vs ${rightComponent}/${rightArm}`, cell, left: live[leftComponent][leftArm][cell], right: live[rightComponent][rightArm][cell],
    })));
  return record('B5', 'B', populations.length === 0 || evidenceProblems > 0 ? 'incomplete' : 'pass', keysOf(used), { populations, historical, paired });
}

/** @param {Ctx} ctx @returns {Gate} */
function b6({ coh }) {
  /** @type {Record<string, any>[]} */
  const used = [];
  const cells = HELL_CELLS.map((cell) => {
    const rows = rowsOf(coh, 'shipped', 'gen-v4', cell);
    used.push(...rows);
    return { cell, ...hell1Report(rows.map(ingest), { reps: [...REPS], quantity: OPTIONS.quantity }) };
  });
  // Reported, never gated: the status only says whether every request is there.
  return record('B6', 'B', cells.every((c) => c.requests === REPS.length) ? 'pass' : 'incomplete', keysOf(used), { reportOnly: true, cells });
}

/** The signed F2 and F4 readings of stages 2 and 4 (accepted by both SAs): they settle the frozen rows' reach fields to zero. */
export const READINGS = 'docs/improve-generating-stages-2-4/stage4-report.md';
const F2_ROW = '| F2 | N-V4-16: no observed natural set call ended without a window, so the bound and glue were unexercised in stages 2 and 4 |';
const F4_ROW = '| F4 | No recorded call-budget stop;';
const READINGS_ACCEPTED = 'F2-F7 agreed';

/**
 * The bound F2 and F4 readings (C11): the SHA-256 of the report's text after LF, kept for each reading only when the
 * report holds its signed row and the acceptance line.
 * @param {string} [root] The repository root, or the self-test root with the same layout.
 * @returns {{ path: string, sha256: string | null, f2Sha256: string | null, f4Sha256: string | null }}
 */
export function readingsOf(root = ROOT) {
  const file = join(root, ...READINGS.split('/'));
  if (!existsSync(file)) {
    return { path: READINGS, sha256: null, f2Sha256: null, f4Sha256: null };
  }
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const sha256 = sha256Hex(text);
  const accepted = text.includes(READINGS_ACCEPTED);
  return { path: READINGS, sha256, f2Sha256: accepted && text.includes(F2_ROW) ? sha256 : null, f4Sha256: accepted && text.includes(F4_ROW) ? sha256 : null };
}

/**
 * The frozen side of an eligible row (R2-01): none for a `non-table` sentinel, else its oracle row (or null when the
 * counterpart is missing) with the readings.
 * @param {Record<string, any>} row
 * @param {string | undefined} root The repository root, or the self-test root.
 * @param {ReturnType<typeof readingsOf>} readings
 * @param {Map<string, Map<number, any> | null>} cache The oracle files by path, filled here.
 * @returns {{ applicable: boolean, row?: any, readings?: ReturnType<typeof readingsOf>, path?: string | null }}
 */
export function historicalOf(row, root, readings, cache) {
  if (row.component === 'non-table') {
    return { applicable: false };
  }
  const oracle = root === undefined ? null : oracleOf(row, root);
  if (oracle === null || root === undefined) {
    return { applicable: true, row: null, readings, path: null };
  }
  if (!cache.has(oracle.path)) {
    try {
      cache.set(oracle.path, loadOracle(oracle.path, root));
    } catch {
      cache.set(oracle.path, null);
    }
  }
  return { applicable: true, row: cache.get(oracle.path)?.get(row.rep) ?? null, readings, path: oracle.path };
}

const TWIN_KEY = /^conditional-twin\/uncapped\/(.+)\/(\d+)$/;

/**
 * B8, P5's coverage (review-2 R2-01): over the 440 eligible rows of both stages' final snapshots, per category and per
 * endpoint. Any unresolved eligible row, or one missing from the snapshots, leaves it incomplete; it never fails.
 * @param {Ctx} ctx @returns {Gate}
 */
function b8({ input }) {
  const plan = input.plan;
  if (!plan) {
    return record('B8', 'B', 'incomplete', [], { problems: ['B8: no sealed plan to name the eligible rows'] });
  }
  /** @type {string[]} */
  const problems = [];
  const expected = plan.rows.filter(isEligible);
  if (expected.length !== ELIGIBLE) {
    problems.push(`B8: the plan has ${expected.length} eligible rows, not ${ELIGIBLE}`);
  }
  const bound = new Map(input.rows.map((r) => [r.key, r]));
  const refused = new Map((input.refused ?? []).map((r) => [r.key, r.problems ?? []]));
  const interrupted = new Set(input.interrupted ?? []);
  /** @param {Record<string, any>} identity @returns {Record<string, any>} The row line, or a placeholder that says why there is none. */
  const entry = (identity) => {
    const line = bound.get(identity.key);
    if (line) {
      return { ...line, binding: { ok: true, problems: [] } };
    }
    const base = { key: identity.key, component: identity.component, cell: identity.cell, rep: identity.rep, seed: identity.seed, uniqueness: identity.uniqueness };
    if (refused.has(identity.key)) {
      return { ...base, binding: { ok: false, problems: refused.get(identity.key) } };
    }
    return { ...base, state: interrupted.has(identity.key) ? 'interrupted' : 'missing' };
  };
  const eligible = expected.map(entry);
  /** @type {Record<string, any>[]} */
  const twins = [];
  const twinKeys = new Set([...input.rows.map((r) => r.key), ...refused.keys(), ...interrupted].filter((k) => TWIN_KEY.test(k)));
  for (const key of twinKeys) {
    const [, cell, rep] = /** @type {RegExpExecArray} */ (TWIN_KEY.exec(key));
    const line = bound.get(key);
    twins.push(line ? entry(line) : entry({ key, component: 'conditional-twin', cell, rep: Number(rep) }));
  }
  const readings = readingsOf(input.oracleRoot);
  /** @type {Map<string, Map<number, any> | null>} */
  const cache = new Map();
  const result = coverage(eligible, twins, (row) => historicalOf(row, input.oracleRoot, readings, cache));
  for (const u of result.unresolved) {
    problems.push(`B8 ${u.key}: ${u.reasons.join('; ')}`);
  }
  return record('B8', 'B', problems.length > 0 ? 'incomplete' : 'pass', expected.map((r) => r.key), {
    eligible: expected.length,
    categories: result.counts,
    endpoints: result.endpoints,
    requiredTwinsMissing: result.requiredTwinsMissing,
    unresolved: result.unresolved,
    readings: { path: readings.path, sha256: readings.sha256 },
    problems,
  });
}

/** @type {Record<string, [string, (ctx: Ctx) => Gate][]>} */
const GATES = {
  smoke: [['S1', s1], ['S2', s2]],
  A: [['A1', a1], ['A2', a2], ['A3', a3], ['A4', a4], ['A5', a5], ['A6', memoryGate('A')]],
  B: [['B1', b1], ['B2', b2], ['B3', b3], ['B4', b4], ['B5', b5], ['B6', b6], ['B7', memoryGate('B')], ['B8', b8]],
};

/**
 * The gate records of a report stage and, `not-due`, of every later stage. A gate of an earlier stage is not part of the
 * stage's report.
 * @param {'smoke' | 'A' | 'B'} stage
 * @param {GateInput} input
 * @returns {Gate[]}
 */
export function stageGates(stage, input) {
  const at = STAGES.indexOf(stage);
  if (at < 0) {
    throw new RangeError(`gates: unknown stage ${String(stage)}`);
  }
  /** @type {Ctx} */
  const ctx = {
    input,
    coh: cohorts(input.rows ?? []),
    equalityByKey: new Map((input.equality ?? []).map((e) => [e.key, e])),
  };
  return STAGES.slice(at).flatMap((s) => GATES[s].map(([id, run]) => (s === stage ? run(ctx) : record(id, s, 'not-due', [], {}))));
}

/** @returns {{ E: string, state: string | null }} The real evidence folder. */
const defaultPaths = () => ({ E: join(ROOT, 'docs', 'improve-generating-phase-2', 'evidence'), state: null });

/**
 * The smoke gate of A's group 1 (S1 and S2), in process, from run-group's row lines.
 * @param {Record<string, any>[]} smokeRows The row lines of the smoke rows.
 * @param {{ rows: Record<string, any>[] } | null | undefined} plan
 * @param {{ E: string, state?: string | null }} [paths] Gives the evidence folder `E`; the real one by default.
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function smokeGate(smokeRows, plan, paths = defaultPaths()) {
  const seal = readJsonOrNull(join(paths.E, 'seal', 'seal.json'));
  /** @type {GateInput} */
  const input = {
    rows: smokeRows,
    plan: plan ?? null,
    ...(seal === null ? {} : { seal }),
    proofs: Object.fromEntries(PROOF_BUNDLES.map((b) => [b, readJsonOrNull(join(paths.E, 'proofs', b, 'result.json'))])),
    equality: equalityOf(smokeRows, paths.state ?? ROOT),
  };
  const gates = stageGates('smoke', input).slice(0, 2);
  return {
    ok: gates.every((g) => g.status === 'pass'),
    problems: gates.flatMap((g) => (g.status === 'pass' ? [] : g.detail.problems)),
  };
}
