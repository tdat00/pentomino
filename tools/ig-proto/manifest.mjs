// @ts-check
// The frozen-round matrix (V4-T11a): the requests of stages 2 to 5 as data (data/frozen-round-v1.json) and the pure rules that
// expand them into groups of request rows, each with its row limit, state path and collection (plan 5.1 stages 2 to 5, review
// R14, RV2-10, RV2-11, RV3-04, D-V4-20). The matrix is the priced universe, not a measurement plan: nothing here runs, rates,
// generates or reads a measured row of the round. V4-T11b adds the pricing, V4-T11c the compiler of the plans (it reads the
// groups and `controlsFrom`), V4-T11e the activation of one collection (it reads the groups and `conditionalActivated`),
// V4-T11f the resolution of the comparators (it reads the expansion) and V4-T11g the manifest for the owner.
//
// The row-level readings (`runStatus`, `reachedTen`) are those of verdicts.mjs, which loads the frozen source when it is
// imported: self-test.mjs therefore loads this module on first use, as it does verdicts.mjs.
import { isDeepStrictEqual } from 'node:util';

import { loadCatalogue } from './lib/sets.mjs';
import { reachedTen, runStatus } from './verdicts.mjs';

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
