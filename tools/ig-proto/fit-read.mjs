// @ts-check
// The fitting reader of the stages 2 to 4 pack (T02b: the pure core, T02c: the two commands). A read-only tool with two
// readings: whether the controls that stage 2 did not pilot keep today's speed on the no-screen arm (the no-regression
// preview against MP12b1's reps 0-4), and whether the proposed P5 budgets and attempt bound could have stopped an
// observed call or request (the call prefixes of a row). Missing, invalid or ambiguous evidence is always reported with
// its reason and never becomes a completion, zero work or a clear reading.
//   node tools\ig-proto\fit-read.mjs preview --task <T> --arm <A> --label frozen --source-label <SL>
//   node tools\ig-proto\fit-read.mjs prefixes --task <T> --arm <A> --budget <level>=<units>[,<level>=<units>...] [--bound <n>] --label frozen --source-label <SL>
import { withoutSampling } from './manifest.mjs';
import { cappedT10, geoMean, ingestRow, noRegression, reachedTen, runStatus } from './verdicts.mjs';

/** @typedef {{ rowKey: string, caseId: string, rep: number, seed: string, shard: string }} Declared */

/** @param {unknown} v @returns {v is Record<string, any>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** @param {unknown} v @returns {boolean} A finite number from 0. */
const isUnits = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** @param {string[]} node @param {string} flag @returns {string | undefined} The word after the flag. */
const valueOf = (node, flag) => {
  const at = node.indexOf(flag);
  return at < 0 ? undefined : node[at + 1];
};

/**
 * @param {any} plan A compiled plan (`{ task, steps }`).
 * @param {string} arm
 * @returns {Declared[]} The duplicate-free declared grid of the arm's `arm.mjs run` steps, in step order. Throws when
 *   the arm has no rows, a key is declared twice, a rep is outside 0-4 or a `--cases` entry is malformed.
 */
export function fitScope(plan, arm) {
  /** @type {Declared[]} */
  const grid = [];
  const seen = new Set();
  for (const step of plan.steps) {
    const node = step.node;
    if (!Array.isArray(node) || typeof node[0] !== 'string' || !node[0].endsWith('arm.mjs') || node[1] !== 'run' || valueOf(node, '--arm') !== arm) {
      continue;
    }
    const shard = String(valueOf(node, '--shard'));
    const cases = valueOf(node, '--cases');
    if (cases === undefined) {
      throw new Error(`fit-read: the step ${step.id} of ${arm} has no --cases`);
    }
    for (const entry of cases.split(',')) {
      const parsed = /^([^:]+):(\d+)-(\d+)$/.exec(entry);
      if (parsed === null || Number(parsed[2]) > Number(parsed[3])) {
        throw new Error(`fit-read: bad --cases entry ${entry}`);
      }
      const [caseId, from, to] = [parsed[1], Number(parsed[2]), Number(parsed[3])];
      for (let rep = from; rep <= to; rep += 1) {
        if (rep > 4) {
          throw new Error(`fit-read: rep ${rep} of ${caseId} is not a fitting rep (0-4)`);
        }
        const rowKey = `${caseId}~${rep}`;
        if (seen.has(rowKey)) {
          throw new Error(`fit-read: ${rowKey} is declared twice`);
        }
        seen.add(rowKey);
        grid.push({ rowKey, caseId, rep, seed: `landscape/${caseId}/${rep}`, shard });
      }
    }
  }
  if (grid.length === 0) {
    throw new Error(`fit-read: the plan ${plan.task} has no rows of ${arm}`);
  }
  return grid;
}

/**
 * @param {Declared} declared
 * @param {any} row A published row.
 * @returns {string | null} Null when the row (and its run, when it has one) is the declared one, else the first
 *   differing identity field. `ingestRow` compares a run with its own row only, so this runs first.
 */
export function declaredRowProblem(declared, row) {
  if (!isObject(row)) {
    return `wrong declared identity (row ${JSON.stringify(row)}, declared ${JSON.stringify(declared.rowKey)})`;
  }
  /** @type {[string, unknown, unknown][]} */
  const checks = [
    ['rowKey', row.rowKey, declared.rowKey],
    ['caseId', row.caseId, declared.caseId],
    ['rep', row.rep, declared.rep],
    ['seed', row.seed, declared.seed],
  ];
  if (isObject(row.run)) {
    checks.push(['run.caseId', row.run.caseId, declared.caseId], ['run.seed', row.run.seed, declared.seed]);
  }
  for (const [field, seen, want] of checks) {
    if (seen !== want) {
      return `wrong declared identity (${field} ${JSON.stringify(seen)}, declared ${JSON.stringify(want)})`;
    }
  }
  return null;
}

/**
 * The no-regression preview of one cell: a fitting warning, not a five-seed verdict.
 * @param {string} cell
 * @param {Declared[]} declared The cell's entries of `fitScope`.
 * @param {any[]} published Every published row of the arm naming the cell (duplicates included).
 * @param {any[]} todayRuns MP12b1's run records of the cell.
 * @param {{ quantity?: number, capMs?: number }} [options]
 * @returns {{ cell: string, declared: number, pairs: { rep: number, ratio: number | null, problem: string | null }[],
 *   todayTen: number, afterTen: number, ratios: (number | null)[], geo: number | null, lower: number | null,
 *   pass: boolean | null, problems: string[] }}
 */
export function previewCell(cell, declared, published, todayRuns, { quantity = 10, capMs = 120000 } = {}) {
  let todayTen = 0;
  let afterTen = 0;
  const pairs = declared.map((entry) => {
    /** @type {(problem: string) => { rep: number, ratio: number | null, problem: string | null }} */
    const bad = (problem) => ({ rep: entry.rep, ratio: null, problem });
    const rows = published.filter((r) => isObject(r) && r.rowKey === entry.rowKey);
    if (rows.length !== 1) {
      return bad(rows.length === 0 ? 'no published row' : `${rows.length} published rows`);
    }
    const row = rows[0];
    const wrong = declaredRowProblem(entry, row);
    if (wrong !== null) {
      return bad(wrong);
    }
    const after = ingestRow(row, { quantity });
    if (after.status !== 'valid') {
      return bad(`after ${after.status}: ${after.problems.join('; ')}`);
    }
    const runs = todayRuns.filter((r) => isObject(r) && r.probeKind === 'generation' && r.rep === entry.rep);
    if (runs.length !== 1) {
      return bad(runs.length === 0 ? 'no MP12b1 run' : `${runs.length} MP12b1 runs`);
    }
    const today = withoutSampling(runs[0]);
    if (today.seed !== entry.seed) {
      return bad(`MP12b1 seed ${today.seed}`);
    }
    const judged = runStatus(today, { quantity });
    if (judged.status !== 'valid') {
      return bad(`today ${judged.status}: ${judged.problems.join('; ')}`);
    }
    const ratio = cappedT10(today, { quantity, capMs }) / cappedT10(after.run, { quantity, capMs });
    if (!(Number.isFinite(ratio) && ratio > 0)) {
      return bad(`ratio ${ratio}`);
    }
    todayTen += reachedTen(today, { quantity }) ? 1 : 0;
    afterTen += reachedTen(after.run, { quantity }) ? 1 : 0;
    return { rep: entry.rep, ratio, problem: null };
  });
  const ratios = pairs.map((p) => p.ratio);
  const good = /** @type {number[]} */ (ratios.filter((r) => r !== null));
  const whole = declared.length === 5 && good.length === 5;
  const bound = whole ? noRegression(good, declared.map((d) => d.rep), { resamples: 10000, resampleSeed: 20261116 }) : null;
  return {
    cell,
    declared: declared.length,
    pairs,
    todayTen,
    afterTen,
    ratios,
    geo: good.length > 0 ? geoMean(good) : null,
    lower: bound === null ? null : bound.lower,
    pass: bound === null ? null : bound.pass,
    problems: pairs.filter((p) => p.problem !== null).map((p) => `rep ${p.rep}: ${p.problem}`),
  };
}

/**
 * The prefixes of the calls of one row against the proposed budgets, accumulated in primitive order: the check is
 * between primitives, never inside one.
 * @param {Record<string, any>[]} lines The journal lines of one row (every worker file in file-name order, never the link file).
 * @param {Record<string, number>} budgets A level id to units.
 * @returns {{ calls: { call: string, level: any, stage: any, attempt: any, budget: number | null, spent: number,
 *   ended: boolean, open: boolean, firstAffected: number | null, endResult: any, status: string, problems: string[] }[],
 *   unowned: string[], problems: string[] }}
 */
export function callPrefixes(lines, budgets) {
  /** @type {Map<string, { start: Record<string, any>, lines: Record<string, any>[], problems: string[] }>} */
  const owned = new Map();
  /** @type {string[]} */
  const problems = [];
  const add = (/** @type {string[]} */ list, /** @type {string} */ problem) => {
    if (!list.includes(problem)) {
      list.push(problem);
    }
  };
  lines.forEach((line, index) => {
    if (line.t !== 'start') {
      return;
    }
    if (typeof line.call !== 'string' || line.call === '') {
      add(problems, `invalid start line ${index}`);
    } else if (owned.has(line.call)) {
      add(/** @type {any} */ (owned.get(line.call)).problems, 'duplicate start');
    } else {
      owned.set(line.call, { start: line, lines: [], problems: [] });
    }
  });
  /** @type {string[]} */
  const unowned = [];
  for (const line of lines) {
    if (!['p', 'count', 'begin', 'end', 'phase', 'caps'].includes(line.t)) {
      continue;
    }
    const owner = typeof line.call === 'string' ? owned.get(line.call) : undefined;
    if (owner === undefined) {
      add(unowned, String(line.call));
      add(problems, `unowned ${line.t} line ${line.call}`);
    } else {
      owner.lines.push(line);
    }
  }
  const calls = [...owned].map(([call, { start, lines: own, problems: callProblems }]) => {
    const level = start.level;
    const budget = Object.hasOwn(budgets, level) && typeof budgets[level] === 'number' ? budgets[level] : null;
    let spent = 0;
    let open = false;
    let begins = 0;
    /** @type {number | null} */
    let firstAffected = null;
    /** @type {Record<string, any> | null} */
    let end = null;
    for (const line of own) {
      if (line.t === 'begin') {
        if (open) {
          add(callProblems, 'begin while a primitive is open');
        }
        if (budget !== null && firstAffected === null && spent >= budget) {
          firstAffected = begins;
        }
        begins += 1;
        open = true;
      } else if (line.t === 'p' || line.t === 'count') {
        if (!open) {
          add(callProblems, `${line.t} without an open primitive`);
        }
        open = false;
        const units = line.t === 'p'
          ? (Array.isArray(line.tuple) && isUnits(line.tuple[4]) && isUnits(line.tuple[5]) ? line.tuple[4] + line.tuple[5] : null)
          : (isUnits(line.units) ? line.units : null);
        if (units === null) {
          add(callProblems, 'invalid units');
        } else {
          spent += units;
        }
      } else if (line.t === 'end') {
        if (end !== null) {
          add(callProblems, 'duplicate end');
        } else {
          end = line;
        }
      }
    }
    const ended = end !== null;
    if (end !== null && spent !== end.work + end.locate?.countWork) {
      add(callProblems, 'end mismatch');
    }
    const status = callProblems.length > 0 ? 'ambiguous'
      : budget === null ? 'no-budget'
        : firstAffected !== null ? 'affected'
          : !ended && spent >= budget ? 'potentially-affected' : 'clear';
    return {
      call, level, stage: start.stage, attempt: start.attempt ?? null, budget, spent, ended, open, firstAffected,
      endResult: end?.locate?.result ?? null, status, problems: callProblems,
    };
  });
  return { calls, unowned, problems };
}

/**
 * @param {{ stage: any, attempt: any, status: string, ended: boolean, endResult: any }[]} calls The calls of one row
 *   (`callPrefixes(...).calls`); only the `set`-stage calls count.
 * @param {number} bound The attempt bound (a positive integer).
 * @returns {{ fires: boolean, side: 'below' | 'above' | null, attempts: number }} Whether the bound fires: the calls of
 *   attempts 0 to `bound - 1` all exist once, none is ambiguous, all ended and all `below-to-one` or all `above-to-max`.
 */
export function boundFirings(calls, bound) {
  if (!Number.isInteger(bound) || bound < 1) {
    throw new RangeError(`fit-read: bound must be a positive integer, got ${String(bound)}`);
  }
  const sets = calls.filter((c) => c.stage === 'set');
  const firstAttempts = [];
  for (let attempt = 0; attempt < bound; attempt += 1) {
    const found = sets.filter((c) => c.attempt === attempt);
    if (found.length !== 1 || found[0].status === 'ambiguous' || !found[0].ended) {
      return { fires: false, side: null, attempts: sets.length };
    }
    firstAttempts.push(found[0]);
  }
  for (const [result, side] of /** @type {const} */ ([['below-to-one', 'below'], ['above-to-max', 'above']])) {
    if (firstAttempts.every((c) => c.endResult === result)) {
      return { fires: true, side, attempts: sets.length };
    }
  }
  return { fires: false, side: null, attempts: sets.length };
}
