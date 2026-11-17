// @ts-check
// The frozen-round matrix (V4-T11a): the requests of stages 2 to 5 as data (data/frozen-round-v1.json) and the pure rules that
// expand them into groups of request rows, each with its row limit, state path and collection (plan 5.1 stages 2 to 5, review
// R14, RV2-10, RV2-11, RV3-04, D-V4-20). The matrix is the priced universe, not a measurement plan: nothing here runs, rates,
// generates or reads a measured row of the round. V4-T11b adds the pricing (below the matrix: the projection inputs, the
// simulated schedule of one emitted step at a time under the runners' own rules, the ceiling from the enforced bounds and the
// approval fields; pure, nothing here executes any part of the round), V4-T11c the compiler of the plans (it reads the groups
// and `controlsFrom`), V4-T11e the activation of one collection (it reads the groups and `conditionalActivated`), V4-T11f the
// resolution of the comparators (it reads the expansion) and V4-T11g the manifest for the owner.
//
// The row-level readings (`runStatus`, `reachedTen`) are those of verdicts.mjs, which loads the frozen source when it is
// imported: self-test.mjs therefore loads this module on first use, as it does verdicts.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

import { evidenceDir, mp12b1Report } from './lib/paths.mjs';
import { loadCatalogue } from './lib/sets.mjs';
import { median, reachedTen, runStatus } from './verdicts.mjs';

/** The number of puzzles a request asks for: the matrix's `quantity` of every row. */
const QUANTITY = 10;
/** A completion-passing control has at least this many valid MP12b1 runs that reach ten (plan 5.2). */
const CONTROL_RUNS = 18;
/** A conditional Hell 1 board is activated when at least this many valid pilot requests reach ten (RV3-04). */
const ACTIVATION_RUNS = 3;
/** The placeholder arm of a comparator group: T11f resolves it to the uncapped twin of the arm its class ships. */
const COMPARATOR_ARM = 'shipped-uncapped';
/** The two twins of every validated cell (R14: the class table is unknown before stage 3, so both run). */
const TWINS = Object.freeze(['fr-frozen', 'fr-frozen-none']);
/** The cells of the live-deadline receipt (N-V4-13). */
const LIVE_CELLS = Object.freeze(['14x14-nightmare', '26x26-hell-1']);
/** The paired factor's reps (S4-6): five of the validation seeds, as the plan's "five seeds per cell" (data reps has no key for it). */
const FACTOR_REPS = Object.freeze([20, 24]);
/** The plan tasks of the groups (RV2-11): the stage-2 pilots, the live-deadline receipt, the first validation and its comparators, the second validation and its comparators. */
const TASKS = Object.freeze({ first: 'V4-S4', firstComparator: 'V4-S4C', second: 'V4-S4X', secondComparator: 'V4-S4XC', stage2: 'V4-S2', live: 'V4-LIVE' });

/** @typedef {{ variant: string, stage: number, settings?: Record<string, unknown>, comparatorOf?: string }} MatrixArm */
/** @typedef {{ id: string, text: string, groups: { arm: string, cells: string[] }[] }} Stage2Item */
/**
 * @typedef {object} MatrixData
 * @property {number} version
 * @property {number} resampleSeed
 * @property {number} resamples
 * @property {number} workers
 * @property {Record<'pilot' | 'validation' | 'master' | 'secondValidation' | 'liveDeadline', [number, number]>} reps
 * @property {{ default: number, liveDeadline: number }} rowLimitS
 * @property {Record<string, MatrixArm>} arms
 * @property {string[]} comparatorDifferences
 * @property {{ failingNightmare: string[], hell1Validated: string[], hell1Conditional: string[], master: string[] }} cells
 * @property {Stage2Item[]} stage2
 */
/**
 * @typedef {object} Group A block of request rows of one arm on one cell: the reps `from` to `to`, run as one shard of one task
 *   (state `<task>\<arm>\<shard>\state.json`).
 * @property {string} id `<task>/<arm>/<shard>`
 * @property {string} task
 * @property {string} arm
 * @property {string} cell
 * @property {number} from
 * @property {number} to
 * @property {number} rows `to - from + 1`
 * @property {number} stage 2 or 4
 * @property {string} cohort `pilot`, `live`, `val`, `master`, `factor` or `second`
 * @property {string} shard `<cohort>-<cell>`
 * @property {number} rowLimitS
 * @property {boolean} optional
 * @property {string[]} items The ids of the items that list the group, in the order they were expanded.
 * @property {string} collection `stage2`, `live`, `initial`, `conditional`, `optional` or `second`
 * @property {boolean} comparator True for an arm `shipped-uncapped` group.
 */
/**
 * @typedef {object} MatrixItem
 * @property {string} id
 * @property {string} text
 * @property {number} stage
 * @property {string} collection
 * @property {boolean} optional
 * @property {string[]} groups The ids of the groups the item lists.
 * @property {number} rows The rows of those groups (a group shared by two items is counted for each).
 */

/** The items of stage 4 and the live-deadline receipt (the stage-2 items are data). */
const ITEM_TEXT = Object.freeze({
  'S4-1': 'headline: both twins on every failing Nightmare cell',
  'S4-2': 'Hell 1: both twins on every validated Hell 1 board',
  'S4-3': 'controls: both twins and today\'s arm on every completion-passing Nightmare cell',
  'S4-C': 'comparators: the uncapped search of the arm each cell of S4-1 to S4-3 ships',
  'S4-4': 'Master identity: the frozen arm and today\'s arm on every Master cell',
  'S4-5': 'conditional Hell 1: both twins and the comparator on a board whose pilot reached ten',
  'S4-6': 'optional paired factor: today\'s arm on every failing Nightmare cell',
  'S4-7': 'conditional second validation: both twins and the comparator on a fresh cohort',
  live: 'the live-deadline receipt',
});

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {string[]} The list of distinct, non-empty cell ids; anything else throws.
 */
function cellList(value, name) {
  if (!Array.isArray(value) || value.some((c) => typeof c !== 'string' || c === '') || new Set(value).size !== value.length) {
    throw new Error(`manifest: ${name} must be a list of distinct cells`);
  }
  return value;
}

/**
 * @param {MatrixData} data
 * @param {string} name
 * @returns {[number, number]} The reps `[from, to]` of the matrix; a missing or malformed range throws.
 */
function repsOf(data, name) {
  const range = /** @type {Record<string, unknown>} */ (data.reps ?? {})[name];
  if (!Array.isArray(range) || range.length !== 2 || !range.every((n) => Number.isInteger(n) && n >= 0) || range[0] > range[1]) {
    throw new Error(`manifest: reps ${name} must be [from, to] with 0 <= from <= to`);
  }
  return /** @type {[number, number]} */ (range);
}

/**
 * Throws unless every comparator arm equals its twin in every setting that `comparatorDifferences` does not name (RV3-04: the
 * uncapped search differs from the arm it judges only in `callBudget`, `setAttemptsBound` and `liveDeadline`), and unless each
 * twin has a comparator arm.
 * @param {MatrixData} data
 */
function checkComparators(data) {
  const allowed = new Set(data.comparatorDifferences);
  for (const [id, arm] of Object.entries(data.arms)) {
    if (arm.comparatorOf === undefined) {
      continue;
    }
    const twin = data.arms[arm.comparatorOf];
    if (twin === undefined) {
      throw new Error(`manifest: comparator ${id} names the unknown twin ${arm.comparatorOf}`);
    }
    const mine = arm.settings ?? {};
    const theirs = twin.settings ?? {};
    for (const key of new Set([...Object.keys(theirs), ...Object.keys(mine)])) {
      if (!allowed.has(key) && !isDeepStrictEqual(mine[key], theirs[key])) {
        throw new Error(`manifest: comparator ${id} differs from ${arm.comparatorOf} in ${key}`);
      }
    }
  }
  for (const twin of TWINS) {
    if (!Object.values(data.arms).some((arm) => arm.comparatorOf === twin)) {
      throw new Error(`manifest: ${twin} has no uncapped comparator arm`);
    }
  }
}

/**
 * @param {Pick<Group, 'task' | 'arm' | 'shard' | 'from' | 'to'>} group
 * @returns {string} The key of a group, `task|arm|shard|from|to`: two groups of one key are the same request rows.
 */
export function groupKey(group) {
  return [group.task, group.arm, group.shard, group.from, group.to].join('|');
}

/**
 * Expands the matrix into groups of request rows (V4-T11a). The items run in this order: the stage-2 items of the data, S4-1
 * (both twins on every failing Nightmare cell), S4-2 (on the validated Hell 1 boards), S4-3 (the twins and today's arm on the
 * controls), S4-C (one comparator group on every cell of S4-1 to S4-3), S4-4 (Master identity), S4-5 (conditional Hell 1), S4-6
 * (the optional paired factor), S4-7 (the conditional second validation) and `live` (the live-deadline receipt). A second item
 * that needs an existing group (the same task, arm, shard and reps) only adds its id to that group's `items`. A comparator
 * differing from its twin in a setting other than `comparatorDifferences` throws before anything is expanded.
 * @param {MatrixData} data The parsed `data/frozen-round-v1.json` (or a copy of it).
 * @param {{ controls: string[], secondValidationBoards?: string[] }} inputs `controls`: the completion-passing Nightmare cells
 *   (`controlsFrom`); `secondValidationBoards`: the Hell 1 boards whose prior a stage-5 adoption changes (default: every
 *   validated and conditional Hell 1 board, the conservative price).
 * @returns {{ groups: Group[], items: MatrixItem[], counts: { total: { groups: number, rows: number },
 *   stages: Record<string, { groups: number, rows: number }>, items: Record<string, { groups: number, rows: number }> } }}
 *   `counts`: the groups and rows of the whole expansion, per stage and per item (an item counts the groups it lists, so the
 *   items do not sum to the total).
 */
export function expandMatrix(data, inputs) {
  checkComparators(data);
  const controls = cellList(inputs?.controls, 'inputs.controls');
  const failing = cellList(data.cells.failingNightmare, 'cells.failingNightmare');
  const hell1Validated = cellList(data.cells.hell1Validated, 'cells.hell1Validated');
  const hell1Conditional = cellList(data.cells.hell1Conditional, 'cells.hell1Conditional');
  const master = cellList(data.cells.master, 'cells.master');
  for (const cell of controls) {
    if (failing.includes(cell)) {
      throw new Error(`manifest: control ${cell} is a failing cell`);
    }
  }
  const secondBoards = inputs.secondValidationBoards === undefined
    ? [...hell1Validated, ...hell1Conditional] : cellList(inputs.secondValidationBoards, 'inputs.secondValidationBoards');
  const reps = {
    pilot: repsOf(data, 'pilot'), validation: repsOf(data, 'validation'), master: repsOf(data, 'master'),
    second: repsOf(data, 'secondValidation'), live: repsOf(data, 'liveDeadline'),
  };
  for (const name of ['default', 'liveDeadline']) {
    const limit = /** @type {Record<string, unknown>} */ (data.rowLimitS ?? {})[name];
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
      throw new Error(`manifest: rowLimitS ${name} must be a positive integer`);
    }
  }

  /** @type {Group[]} */
  const groups = [];
  /** @type {Map<string, Group>} */
  const byKey = new Map();
  /** @type {Map<string, string>} */
  const keyOfId = new Map();
  /** @type {MatrixItem[]} */
  const items = [];

  /**
   * 130 s only for a stage-4 group of an arm whose settings have `liveDeadline: true` (it runs after an accepted live-deadline
   * binding); 260 s for every other group, the live receipt's own rows included: a violation must be observed, not cut (RV2-10).
   * @param {string} arm @param {number} stage @param {string} collection @returns {number}
   */
  const rowLimitOf = (arm, stage, collection) => (stage === 4 && collection !== 'live' && data.arms[arm]?.settings?.liveDeadline === true
    ? data.rowLimitS.liveDeadline : data.rowLimitS.default);

  /** @param {string} id @param {string} text @param {number} stage @param {string} collection @param {boolean} optional @returns {MatrixItem} */
  const begin = (id, text, stage, collection, optional) => {
    const item = { id, text, stage, collection, optional, groups: [], rows: 0 };
    items.push(item);
    return item;
  };

  /**
   * @param {MatrixItem} item
   * @param {{ task: string, arm: string, cell: string, cohort: string, reps: readonly number[], comparator?: boolean }} spec
   */
  const add = (item, { task, arm, cell, cohort, reps: [from, to], comparator = false }) => {
    if (!comparator && data.arms[arm] === undefined) {
      throw new Error(`manifest: item ${item.id} names the unknown arm ${arm}`);
    }
    const shard = `${cohort}-${cell}`;
    const key = groupKey({ task, arm, shard, from, to });
    let group = byKey.get(key);
    if (group === undefined) {
      const id = `${task}/${arm}/${shard}`;
      if (keyOfId.has(id)) {
        throw new Error(`manifest: ${key} and ${keyOfId.get(id)} share the state path ${id}`);
      }
      group = {
        id, task, arm, cell, from, to, rows: to - from + 1, stage: item.stage, cohort, shard,
        rowLimitS: rowLimitOf(arm, item.stage, item.collection), optional: item.optional, items: [],
        collection: item.collection, comparator,
      };
      byKey.set(key, group);
      keyOfId.set(id, key);
      groups.push(group);
    } else if (group.collection !== item.collection || group.stage !== item.stage || group.optional !== item.optional) {
      throw new Error(`manifest: ${key} is listed by items of different collections (${group.items.join(', ')} and ${item.id})`);
    }
    if (!group.items.includes(item.id)) {
      group.items.push(item.id);
    }
    if (!item.groups.includes(group.id)) {
      item.groups.push(group.id);
    }
  };

  for (const spec of data.stage2) {
    const item = begin(spec.id, spec.text, 2, 'stage2', false);
    for (const { arm, cells } of spec.groups) {
      for (const cell of cellList(cells, `stage2 ${spec.id} cells`)) {
        add(item, { task: TASKS.stage2, arm, cell, cohort: 'pilot', reps: reps.pilot });
      }
    }
  }

  /**
   * The twins on each cell (then today's arm, then the comparator, when asked), cell by cell.
   * @param {MatrixItem} item @param {string[]} cells
   * @param {{ task: string, cohort: string, reps: readonly number[], today?: boolean, comparatorTask?: string }} where
   */
  const validated = (item, cells, { task, cohort, reps: range, today = false, comparatorTask }) => {
    for (const cell of cells) {
      for (const arm of TWINS) {
        add(item, { task, arm, cell, cohort, reps: range });
      }
      if (today) {
        add(item, { task, arm: 'log-link', cell, cohort, reps: range });
      }
      if (comparatorTask !== undefined) {
        add(item, { task: comparatorTask, arm: COMPARATOR_ARM, cell, cohort, reps: range, comparator: true });
      }
    }
  };
  const first = { task: TASKS.first, cohort: 'val', reps: reps.validation };

  // S4-1 to S4-3 list the twins (and today's arm on a control) only: their comparators are the one item S4-C that follows them.
  validated(begin('S4-1', ITEM_TEXT['S4-1'], 4, 'initial', false), failing, first);
  validated(begin('S4-2', ITEM_TEXT['S4-2'], 4, 'initial', false), hell1Validated, first);
  validated(begin('S4-3', ITEM_TEXT['S4-3'], 4, 'initial', false), controls, { ...first, today: true });
  const comparators = begin('S4-C', ITEM_TEXT['S4-C'], 4, 'initial', false);
  for (const cell of [...failing, ...hell1Validated, ...controls]) {
    add(comparators, { task: TASKS.firstComparator, arm: COMPARATOR_ARM, cell, cohort: 'val', reps: reps.validation, comparator: true });
  }
  const masters = begin('S4-4', ITEM_TEXT['S4-4'], 4, 'initial', false);
  for (const cell of master) {
    add(masters, { task: TASKS.first, arm: 'fr-frozen', cell, cohort: 'master', reps: reps.master });
    add(masters, { task: TASKS.first, arm: 'log-link', cell, cohort: 'master', reps: reps.master });
  }
  // S4-5 runs only when T11e activates its board (`conditionalActivated`); S4-6 only with the owner's approval.
  validated(begin('S4-5', ITEM_TEXT['S4-5'], 4, 'conditional', true), hell1Conditional, { ...first, comparatorTask: TASKS.firstComparator });
  const factor = begin('S4-6', ITEM_TEXT['S4-6'], 4, 'optional', true);
  for (const cell of failing) {
    add(factor, { task: TASKS.first, arm: 'log-link', cell, cohort: 'factor', reps: FACTOR_REPS });
  }
  validated(begin('S4-7', ITEM_TEXT['S4-7'], 4, 'second', false), secondBoards, {
    task: TASKS.second, comparatorTask: TASKS.secondComparator, cohort: 'second', reps: reps.second,
  });
  const live = begin('live', ITEM_TEXT.live, 4, 'live', false);
  for (const cell of LIVE_CELLS) {
    add(live, { task: TASKS.live, arm: 'fr-frozen', cell, cohort: 'live', reps: reps.live });
  }

  const rowsOf = new Map(groups.map((g) => [g.id, g.rows]));
  /** @type {Record<string, { groups: number, rows: number }>} */
  const stages = {};
  for (const g of groups) {
    const s = (stages[g.stage] ??= { groups: 0, rows: 0 });
    s.groups += 1;
    s.rows += g.rows;
  }
  for (const item of items) {
    item.rows = item.groups.reduce((sum, id) => sum + /** @type {number} */ (rowsOf.get(id)), 0);
  }
  return {
    groups,
    items,
    counts: {
      total: { groups: groups.length, rows: groups.reduce((sum, g) => sum + g.rows, 0) },
      stages,
      items: Object.fromEntries(items.map((i) => [i.id, { groups: i.groups.length, rows: i.rows }])),
    },
  };
}

/**
 * @param {any} run A run record.
 * @returns {any} A copy of the run whose `errors` omit every entry of `phase` `sampling`; the run itself is unchanged. The
 *   landscape profile's diagnostic sampling runs after the timed interval and records up to three failures of its own sampled
 *   ratings (`tools/bench/runner.js:467-474`, `:852-858`), so those entries say nothing about the request; the frozen-round arms
 *   never run it (ruling of 2026-11-17, V4-T11a QUESTION 1). A value that is not a record with a list of `errors` is returned as
 *   it is, for `runStatus` to judge.
 */
export function withoutSampling(run) {
  if (typeof run !== 'object' || run === null || !Array.isArray(run.errors)) {
    return run;
  }
  return { ...run, errors: run.errors.filter((/** @type {any} */ e) => !(typeof e === 'object' && e !== null && e.phase === 'sampling')) };
}

/**
 * @param {unknown} run
 * @returns {boolean} Whether the record is a valid measurement (T09a's `runStatus`, the landscape's sampling entries set aside)
 *   that holds ten puzzles, whatever its time (D-V4-16). A missing, invalid, censored or erroneous run is never a completion.
 */
function validCompletion(run) {
  return runStatus(withoutSampling(run), { quantity: QUANTITY }).status === 'valid' && reachedTen(run, { quantity: QUANTITY });
}

/**
 * The completion-passing Nightmare cells (plan 5.2, RV2-06): the Nightmare cells of the catalogue, other than `failing`, whose
 * MP12b1 report has at least 18 runs that are valid measurements (the landscape's `sampling` entries set aside, see
 * `withoutSampling`) reaching ten puzzles, in catalogue order. A cell without a report is not a control.
 * @param {((caseId: string) => any) | Record<string, any>} reports `mp12b1Report` (the default form of the frozen round), or a
 *   map from case id to what it returns; a value is `{ path, report }` or the report itself, and the report's `runs` are read.
 * @param {string[]} failing The failing headline cells.
 * @returns {string[]}
 */
export function controlsFrom(reports, failing) {
  if (!Array.isArray(failing)) {
    throw new TypeError('manifest: failing must be a list of cells');
  }
  const lookup = typeof reports === 'function' ? reports : (/** @type {string} */ id) => (Object.hasOwn(reports, id) ? reports[id] : null);
  const { cases } = loadCatalogue();
  return Object.keys(cases).filter((id) => {
    if (cases[id].levelId !== 'nightmare' || failing.includes(id)) {
      return false;
    }
    const found = lookup(id);
    const report = found?.report ?? found;
    const runs = Array.isArray(report?.runs) ? report.runs : [];
    return runs.filter(validCompletion).length >= CONTROL_RUNS;
  });
}

/**
 * The activation rule of a conditional Hell 1 board (RV3-04): its five-seed pilot (`fr-base`, reps 0 to 4) reached ten on at
 * least three valid requests.
 * @param {unknown[] | null | undefined} runs The published run records of the board's pilot; none is an empty list.
 * @returns {{ activated: boolean, valid: number, reachingTen: number }}
 */
export function conditionalActivated(runs) {
  const list = runs ?? [];
  if (!Array.isArray(list)) {
    throw new TypeError('manifest: the pilot runs must be a list of run records');
  }
  const valid = list.filter((run) => runStatus(run, { quantity: QUANTITY }).status === 'valid');
  const reachingTen = valid.filter((run) => reachedTen(run, { quantity: QUANTITY })).length;
  return { activated: reachingTen >= ACTIVATION_RUNS, valid: valid.length, reachingTen };
}

// ---- Pricing (V4-T11b) ----
// The owner approves the frozen round by its price, so the price is the schedule that will execute: one emitted step at a time
// (a separately emitted locked step never shares an invocation or a quiet period), under the admission rules, lanes, cut and quiet
// periods of the runners (R15, R2-12). A reserve controls admission only: it is never a duration or a ceiling (RV3-05, RV4-05).
// The ceiling comes from the bounds the code enforces. Everything here is a pure function; nothing executes any part of the round.

/** The horizon of an invocation (`lib/budget.mjs` `MAX_HORIZON_S`; the runner lowers it only when the allowance is short). */
const HORIZON_S = 285;
/** The quiet period counted per locked invocation at most (`lib/budget.mjs` `QUIET_S`; `run-task.ps1` counts `Math.Min($lockWait, 45)`). */
const QUIET_S = 45;
/** The lock helper kills an invocation at this many node seconds (check-list 3.2). */
const KILL_S = 300;
/** The parent cuts a running item at `horizonS - 15` (`lib/items.mjs`, `lib/lanes.mjs`). */
const CUT_MARGIN_S = 15;
/** A request row starts while `elapsed + rowLimitS + 10 <= horizonS` (`arm.mjs`). An assumption of the projection, not a deadline. */
const ROW_MARGIN_S = 10;
/** The pack author's overhead assumptions (D-V4-13): start-up per invocation and per item group (its lanes and trees). */
const STARTUP_S = 2;
const GROUP_START_S = 3;
/** R15's planning projection of a request row, `1.25 x factor x refS` (a projection, not a bound) and the runner's guard (`1.25 x`). */
const PROJECTION_FACTOR = 1.25;
const GUARD_FACTOR = 1.25;
/** The ceiling of one unit (a row or an item): at most one invocation per unit, each of at most 300 node seconds and 45 quiet seconds. */
const CEILING_PER_UNIT_S = KILL_S + QUIET_S;

/** The assumptions and bounds of the pricing, for the manifest to print (V4-T11g); the simulations read these values. */
export const PRICING = Object.freeze({
  horizonS: HORIZON_S, quietS: QUIET_S, killS: KILL_S, cutMarginS: CUT_MARGIN_S, rowMarginS: ROW_MARGIN_S, startupS: STARTUP_S,
  groupStartS: GROUP_START_S, projectionFactor: PROJECTION_FACTOR, guardFactor: GUARD_FACTOR, ceilingPerUnitS: CEILING_PER_UNIT_S,
});

/** @param {string} name @param {unknown} value @param {boolean} [integer] @returns {number} The value; anything but a finite number above 0 (an integer when asked) throws. */
function positive(name, value, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new RangeError(`manifest: ${name} must be a positive ${integer ? 'integer' : 'number'}, got ${String(value)}`);
  }
  return value;
}

/** @param {string} name @param {unknown} value @returns {number} The value; anything but a finite number from 0 throws. */
function fromZero(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`manifest: ${name} must be a number from 0, got ${String(value)}`);
  }
  return value;
}

/** @param {unknown} value @returns {number} The horizon; one above the runner's 285 s is no schedule the runner executes (the ceiling rests on it). */
function horizonOf(value) {
  if (positive('horizonS', value) > HORIZON_S) {
    throw new RangeError(`manifest: horizonS must be at most ${HORIZON_S}, got ${String(value)}`);
  }
  return /** @type {number} */ (value);
}

/**
 * The reference time of a cell: the median of `responseMs / 1000` over the valid `generation` runs of its MP12b1 report (T09a's
 * `runStatus` of `withoutSampling(run)`: the landscape's sampling entries, written after the timed interval, are set aside; ruling
 * of 2026-11-17, V4-T11a QUESTION 1).
 * @param {string} caseId
 * @param {(caseId: string) => any} [reports] `mp12b1Report` by default; a function that returns `{ path, report }`, the report or
 *   `null` (a seam for the self-test: no report of the round is read through any other path).
 * @returns {number | null} `null` without a report or without a valid run.
 */
export function refS(caseId, reports = mp12b1Report) {
  const found = reports(caseId);
  const report = found?.report ?? found;
  const runs = Array.isArray(report?.runs) ? report.runs : [];
  const times = runs
    .filter((/** @type {unknown} */ run) => runStatus(withoutSampling(run), { quantity: QUANTITY }).status === 'valid')
    .map((/** @type {any} */ run) => run.responseMs / 1000);
  return times.length === 0 ? null : median(times);
}

/**
 * The factor of today's search in the frozen source against MP12b1: `summary.medianRatioBase` of the stage-1 identity record.
 * @param {string} [file] The record; by default `docs/improve-generating/evidence/frozen/V4-T04/identity.json` (read only).
 * @returns {number} 1 when the record is absent (the manifest says so); a present record without a finite positive
 *   `summary.medianRatioBase` throws.
 */
export function factor(file = evidenceDir('frozen', 'V4-T04', 'identity.json')) {
  if (!existsSync(file)) {
    return 1;
  }
  const value = JSON.parse(readFileSync(file, 'utf8'))?.summary?.medianRatioBase;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`manifest: ${file} has no positive summary.medianRatioBase`);
  }
  return value;
}

/**
 * R15's planning projection of one request row: `1.25 x factor x refS` seconds, a projection and not a bound.
 * @param {{ refS: number | null, factor: number, rowLimitS: number }} o
 * @returns {number} `rowLimitS` when `refS` is `null` (no report or no valid run).
 */
export function projectedRowS({ refS: reference, factor: ratio, rowLimitS }) {
  positive('rowLimitS', rowLimitS);
  if (reference === null) {
    return rowLimitS;
  }
  return PROJECTION_FACTOR * positive('factor', ratio) * positive('refS', reference);
}

/**
 * @typedef {object} Simulation
 * @property {true} admissible
 * @property {({ rows: number, nodeS: number } | { items: number, nodeS: number })[]} invocations One entry per locked invocation.
 * @property {number} nodeS The node seconds of all invocations.
 * @property {number} quietS `45 x` the invocations.
 * @property {number} countedS `nodeS + quietS` (the machine time that counts, check-list 1).
 * @property {number} guardS `1.25 x countedS`: a budget, not a promise that every observation completes.
 * @property {number} completed The observations predicted to complete.
 * @property {number} censored The observations predicted to be cut (never run again).
 */
/** @typedef {{ admissible: false, reason: string }} Inadmissible */

/**
 * @param {Simulation['invocations']} invocations @param {number} completed @param {number} censored
 * @returns {Simulation}
 */
function simulated(invocations, completed, censored) {
  const nodeS = invocations.reduce((sum, i) => sum + i.nodeS, 0);
  const quietS = QUIET_S * invocations.length;
  const countedS = nodeS + quietS;
  return { admissible: true, invocations, nodeS, quietS, countedS, guardS: GUARD_FACTOR * countedS, completed, censored };
}

/**
 * The invocations of a step of request rows (`arm.mjs`): in each, `e = startupS`, and while rows remain and `e + rowLimitS + 10 <=
 * horizonS` a row starts and takes `min(rowS, rowLimitS + 10)`; a row with `rowS > rowLimitS` is cut by the runner and counted
 * `censored`. The 10-s margin and the time a row takes after its limit are projection assumptions: no code enforces them as a deadline.
 * @param {{ rows: number, rowS: number, rowLimitS: number, horizonS?: number, startupS?: number }} o
 * @returns {Simulation | Inadmissible} Inadmissible when an invocation admits no row.
 */
export function simulateRows({ rows, rowS, rowLimitS, horizonS = HORIZON_S, startupS = STARTUP_S }) {
  positive('rows', rows, true);
  positive('rowS', rowS);
  positive('rowLimitS', rowLimitS);
  horizonOf(horizonS);
  fromZero('startupS', startupS);
  const invocations = [];
  let left = rows;
  let completed = 0;
  let censored = 0;
  while (left > 0) {
    let e = startupS;
    let ran = 0;
    while (left > 0 && e + rowLimitS + ROW_MARGIN_S <= horizonS) {
      e += Math.min(rowS, rowLimitS + ROW_MARGIN_S);
      if (rowS > rowLimitS) {
        censored += 1;
      } else {
        completed += 1;
      }
      left -= 1;
      ran += 1;
    }
    if (ran === 0) {
      return { admissible: false, reason: `a row of ${rowLimitS} s does not fit a horizon of ${horizonS} s` };
    }
    invocations.push({ rows: ran, nodeS: e });
  }
  return simulated(invocations, completed, censored);
}

/**
 * @typedef {object} ItemGroup Consecutive items of one kind and variant (`lib/items.mjs`).
 * @property {string} kind
 * @property {string} variant
 * @property {number} lanes `ITEM_LANES[kind]`, 1 for any other kind.
 * @property {number} reserveS The admission reserve of the kind (it controls admission only).
 * @property {number[]} durationsS The seconds each item takes, in order (the mean measured seconds of its kind and variant, else its reserve).
 */

/**
 * The invocations of a step of bounded items (T04a `runItems`), in the order of `groups`. In each, `e = startupS`; a group with items
 * left starts only when `e + reserveS <= horizonS - cutMarginS` (else the invocation ends); then `e += groupStartS`, every lane is
 * free at `e`, and the items left are placed in order, each on the lane that is free first at time `t` while `t + reserveS <=
 * horizonS - cutMarginS`; it runs to `t + durationsS[i]`, and an item still running at the cut `horizonS - cutMarginS` is stopped there
 * and counted `censored` (an ended item never runs again). The group stops placing at the first item not admitted; `e` becomes the
 * latest lane end (the drain); a group with items left ends the invocation, a finished group passes on to the next.
 * @param {{ groups: ItemGroup[], horizonS?: number, startupS?: number, groupStartS?: number, cutMarginS?: number }} o
 * @returns {Simulation | Inadmissible} Inadmissible when an invocation places no item: never a forced item.
 */
export function simulateItems({ groups, horizonS = HORIZON_S, startupS = STARTUP_S, groupStartS = GROUP_START_S, cutMarginS = CUT_MARGIN_S }) {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new TypeError('manifest: groups must be a non-empty list');
  }
  horizonOf(horizonS);
  fromZero('startupS', startupS);
  fromZero('groupStartS', groupStartS);
  fromZero('cutMarginS', cutMarginS);
  for (const [i, group] of groups.entries()) {
    if (typeof group?.kind !== 'string' || group.kind === '' || typeof group.variant !== 'string') {
      throw new TypeError(`manifest: group ${i} needs a kind and a variant`);
    }
    positive(`group ${i} lanes`, group.lanes, true);
    positive(`group ${i} reserveS`, group.reserveS);
    if (!Array.isArray(group.durationsS) || group.durationsS.length === 0) {
      throw new TypeError(`manifest: group ${i} needs at least one duration`);
    }
    group.durationsS.forEach((s, j) => positive(`group ${i} durationsS[${j}]`, s));
  }
  const cutS = horizonS - cutMarginS;
  const placed = groups.map(() => 0);
  const invocations = [];
  let completed = 0;
  let censored = 0;
  while (groups.some((g, i) => placed[i] < g.durationsS.length)) {
    let e = startupS;
    let items = 0;
    /** @type {ItemGroup | null} */
    let stuck = null;
    for (const [i, group] of groups.entries()) {
      const total = group.durationsS.length;
      if (placed[i] >= total) {
        continue;
      }
      stuck = group;
      if (e + group.reserveS > cutS) {
        break;
      }
      e += groupStartS;
      const free = new Array(group.lanes).fill(e);
      while (placed[i] < total) {
        const lane = free.indexOf(Math.min(...free));
        const t = free[lane];
        if (t + group.reserveS > cutS) {
          break;
        }
        const end = t + group.durationsS[placed[i]];
        if (end > cutS) {
          free[lane] = cutS;
          censored += 1;
        } else {
          free[lane] = end;
          completed += 1;
        }
        placed[i] += 1;
        items += 1;
      }
      e = Math.max(...free);
      if (placed[i] < total) {
        break;
      }
      stuck = null;
    }
    if (items === 0) {
      const { kind, reserveS } = /** @type {ItemGroup} */ (stuck);
      return { admissible: false, reason: `${kind} needs ${reserveS} s; the horizon ${horizonS} s admits none` };
    }
    invocations.push({ items, nodeS: e });
  }
  return simulated(invocations, completed, censored);
}

/**
 * The invocations of a step of process or custom items (T10b, T10c): one at a time, admitted while `e + reserveS <= horizonS - 15`,
 * cut at `horizonS - 15`; `simulateItems` with one group of one lane and `groupStartS` 0.
 * @param {{ durationsS: number[], reserveS: number, horizonS?: number, startupS?: number }} o
 * @returns {Simulation | Inadmissible}
 */
export function simulateProcess({ durationsS, reserveS, horizonS = HORIZON_S, startupS = STARTUP_S }) {
  return simulateItems({ groups: [{ kind: 'process', variant: 'process', lanes: 1, reserveS, durationsS }], horizonS, startupS, groupStartS: 0 });
}

/**
 * @typedef {object} StepPrice
 * @property {true} admissible
 * @property {number} projectS The node seconds of the simulated schedule (`run-task.ps1` adds `projectS + 45 x invocations` per locked step).
 * @property {number} invocations The number of locked invocations (a count).
 * @property {number} quietS
 * @property {number} countedS
 * @property {number} guardS
 * @property {number} ceilingS The hard ceiling from the enforced bounds: `units x 345` (the lock helper's 300 node seconds and 45 quiet
 *   seconds per invocation; an invocation that records no progress stops the plan, so every invocation that does not ends at least
 *   one unit and a step has at most `units` invocations). A request row has no enforced end inside an invocation: no tighter row ceiling is claimed.
 * @property {number} ceilingInvocations `units`, the rows or the items of the step.
 * @property {number} completed
 * @property {number} censored
 * @property {Simulation['invocations']} schedule The simulated invocations, one entry each.
 */

/**
 * The price of one emitted step (R15: the simulation of that step alone). A step of zero units is never emitted (T11c) and throws
 * here. An input field other than the simulation's (T11c's `cases`) is ignored.
 * @param {{ type: 'rows', rows: number, rowS: number, rowLimitS: number, horizonS?: number, startupS?: number }
 *   | { type: 'items', groups: ItemGroup[], horizonS?: number, startupS?: number, groupStartS?: number, cutMarginS?: number }
 *   | { type: 'process', durationsS: number[], reserveS: number, horizonS?: number, startupS?: number }} step
 * @returns {StepPrice | Inadmissible} Inadmissible when the simulation is: no invocation is priced.
 */
export function stepPrice(step) {
  /** @type {Simulation | Inadmissible} */
  let simulation;
  /** @type {number} */
  let units;
  switch (step?.type) {
    case 'rows': {
      const { rows, rowS, rowLimitS, horizonS, startupS } = step;
      simulation = simulateRows({ rows, rowS, rowLimitS, horizonS, startupS });
      units = rows;
      break;
    }
    case 'items': {
      const { groups, horizonS, startupS, groupStartS, cutMarginS } = step;
      simulation = simulateItems({ groups, horizonS, startupS, groupStartS, cutMarginS });
      units = groups.reduce((sum, g) => sum + g.durationsS.length, 0);
      break;
    }
    case 'process': {
      const { durationsS, reserveS, horizonS, startupS } = step;
      simulation = simulateProcess({ durationsS, reserveS, horizonS, startupS });
      units = durationsS.length;
      break;
    }
    default:
      throw new TypeError(`manifest: unknown step type ${JSON.stringify(/** @type {any} */ (step)?.type)}`);
  }
  if (!simulation.admissible) {
    return simulation;
  }
  const { nodeS, invocations, quietS, countedS, guardS, completed, censored } = simulation;
  return {
    admissible: true, projectS: nodeS, invocations: invocations.length, quietS, countedS, guardS, ceilingS: units * CEILING_PER_UNIT_S,
    ceilingInvocations: units, completed, censored, schedule: invocations,
  };
}

/**
 * The price of a list of emitted steps, each priced alone: the sum of the step prices. An inadmissible step is listed apart and makes
 * the plan not priceable (`admissible` false); the totals then cover the priced steps only and are never the price of the plan.
 * @param {Parameters<typeof stepPrice>[0][]} steps
 * @returns {{ admissible: boolean, projectS: number, invocations: number, quietS: number, countedS: number, guardS: number,
 *   ceilingS: number, ceilingInvocations: number, completed: number, censored: number, steps: (StepPrice | Inadmissible)[],
 *   inadmissible: { index: number, reason: string }[] }}
 */
export function price(steps) {
  if (!Array.isArray(steps)) {
    throw new TypeError('manifest: price needs a list of steps');
  }
  const priced = steps.map((step) => stepPrice(step));
  const admissible = /** @type {StepPrice[]} */ (priced.filter((p) => p.admissible));
  /** @param {Exclude<keyof StepPrice, 'admissible' | 'schedule'>} key @returns {number} */
  const sum = (key) => admissible.reduce((total, p) => total + p[key], 0);
  return {
    admissible: admissible.length === priced.length,
    projectS: sum('projectS'), invocations: sum('invocations'), quietS: sum('quietS'), countedS: sum('countedS'), guardS: sum('guardS'),
    ceilingS: sum('ceilingS'), ceilingInvocations: sum('ceilingInvocations'), completed: sum('completed'), censored: sum('censored'),
    steps: priced,
    inadmissible: priced.flatMap((p, index) => (p.admissible ? [] : [{ index, reason: /** @type {Inadmissible} */ (p).reason }])),
  };
}

/**
 * The fields of an approval request (RV2-13, D-V4-02): the round has one cumulative cap, so a request states the counted seconds already
 * spent, the additional guard it asks for and the cumulative cap in minutes that covers both. Prior invocation records are never deleted
 * or reset.
 * @param {{ roundCountedSBeforeApproval: number, requestedAdditionalGuardS: number }} o
 * @returns {{ roundCountedSBeforeApproval: number, requestedAdditionalGuardS: number, requestedCumulativeRoundMinutes: number }}
 */
export function approvalFields({ roundCountedSBeforeApproval, requestedAdditionalGuardS }) {
  fromZero('roundCountedSBeforeApproval', roundCountedSBeforeApproval);
  fromZero('requestedAdditionalGuardS', requestedAdditionalGuardS);
  return {
    roundCountedSBeforeApproval, requestedAdditionalGuardS,
    requestedCumulativeRoundMinutes: Math.ceil((roundCountedSBeforeApproval + requestedAdditionalGuardS) / 60),
  };
}
