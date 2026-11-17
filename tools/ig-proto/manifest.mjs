// @ts-check
// The frozen-round matrix (V4-T11a): the requests of stages 2 to 5 as data (data/frozen-round-v1.json) and the pure rules that
// expand them into groups of request rows, each with its row limit, state path and collection (plan 5.1 stages 2 to 5, review
// R14, RV2-10, RV2-11, RV3-04, D-V4-20). The matrix is the priced universe, not a measurement plan: nothing here runs, rates,
// generates or reads a measured row of the round. V4-T11b adds the pricing (below the matrix: the projection inputs, the
// simulated schedule of one emitted step at a time under the runners' own rules, the ceiling from the enforced bounds and the
// approval fields; pure, nothing here executes any part of the round), V4-T11c the compiler of the plans (below the pricing: the
// step builders, the plans `V4-S2` and `V4-LIVE`, the priced universe of stage 4 and the templates, the item manifests of the
// parity passes and of the isolated P-0, and the prerequisites gate; `compile` and `check-prerequisites` are its commands, unlocked,
// and nothing here executes any plan), V4-T11e the stage-4 collections (below the prerequisites gate: the activation record of the
// initial collection, the concrete plan `V4-S4` and the comparator template it yields, and the closure record; `activate` and `close`
// are its commands, unlocked and write-once, run only on the owner's decision), V4-T11f the comparators and the verdict inputs (below
// the collections: the expectation of a class-selection receipt, the resolution of the comparator template into the plan `V4-S4C`
// from a final selection, and the selection and final verdict manifests; `resolve-comparators` and `verdict-input` are its commands,
// unlocked) and V4-T11g the manifest for the owner.
//   node tools\ig-proto\manifest.mjs compile --label frozen --source-label "frozen 3fc65f4"
//   node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"
//   node tools\ig-proto\manifest.mjs activate --collection initial [--approve-optional S4-6] --label frozen --source-label "frozen 3fc65f4"
//   node tools\ig-proto\manifest.mjs close --collection initial --reason "<text>" --label frozen --source-label "frozen 3fc65f4"
//   node tools\ig-proto\manifest.mjs resolve-comparators --selection <receipt> --activation <record> --out <plan> --label frozen --source-label "frozen 3fc65f4"
//   node tools\ig-proto\manifest.mjs verdict-input --purpose <selection|final> --activation <record> [--selection <receipt>] --out <manifest> --label frozen --source-label "frozen 3fc65f4"
//
// The row-level readings (`runStatus`, `reachedTen`) are those of verdicts.mjs, which loads the frozen source when it is
// imported: self-test.mjs therefore loads this module on first use, as it does verdicts.mjs.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { ITEM_LANES, readItemLog } from './lib/items.mjs';
import { DEFAULT_LIMITS } from './lib/lanes.mjs';
import { abs, artifactDir, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, IG_DIR, mp12b1Report, parseArgs, rel } from './lib/paths.mjs';
import { checkAccepted, LIVE_DEADLINE_FIELDS, proofCheck, readRepoFile } from './lib/proof.mjs';
import { harnessInfo, sha256, sha256File, sha256Text, writeJson } from './lib/records.mjs';
import { loadCatalogue } from './lib/sets.mjs';
import { ensureTree, listVariants } from './lib/tree.mjs';
import { parseCases, rowKey } from './arm.mjs';
import { DEFAULT_CASES as PROFILE_CASES, SUBSETS_PER_CASE } from './kernel-probe.mjs';
import { median, reachedTen, runStatus } from './verdicts.mjs';
import { WIDTHS } from './width-probe.mjs';

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

/** The horizon of an invocation (`lib/budget.mjs` `MAX_HORIZON_S`: the owner's 900-s limit less 15 s; the runner lowers it only when the allowance is short). */
const HORIZON_S = 885;
/**
 * The quiet period counted per locked invocation at most (`lib/budget.mjs` `QUIET_S`; `run-task.ps1` counts `Math.Min($lockWait, 45)`).
 * The price reserves 45 s per invocation even where the idle quiet is 15 s: whether difficulty-v3 will be idle is not known when a plan
 * is approved (fail-closed; the idle quiet can lower the quiet-period part of the spend, never the price).
 */
const QUIET_S = 45;
/** The lock helper kills an invocation at this many node seconds (check-list 3.2: the owner's 900-s limit of 2026-11-17). */
const KILL_S = 900;
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
/** The ceiling of one unit (a row or an item): at most one invocation per unit, each of at most 900 node seconds and 45 quiet seconds. */
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

/** @param {unknown} value @returns {number} The horizon; one above the runner's 885 s is no schedule the runner executes (the ceiling rests on it). */
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
 * @property {number} ceilingS The hard ceiling from the enforced bounds: `units x 945` (the lock helper's 900 node seconds and 45 quiet
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

// ---- Plans (V4-T11c) ----
// The frozen round is a sequence of plans in the order of R2-11 (as amended by review 3). `V4-S2` (stage 2 with its P-1 parity passes,
// the isolated P-0 pass and the probes) and `V4-LIVE` are compiled here; the stage-4 universe and the second validation are priced
// templates that no runner executes (RV3-04, D-V4-20); `V4-S4` is written at the activation of its collection (T11e) and `V4-S4C` at
// the resolution of its comparators (T11f). A plan is data for `run-task.ps1`: the argv of every step, its state, its horizon and
// the price of every locked step, which is the simulation of that step alone (T11b). Nothing in this section executes any plan.

/** The tools' folder in the argv of a step: `run-task.ps1` runs `node` with these words, the script path first, and appends the labels. */
const IG = 'tools\\ig-proto\\';
const EVIDENCE = 'docs/improve-generating/evidence/frozen';
const RAW = 'tests/artifacts/ig-proto/frozen';
const TREES = 'tests/artifacts/ig-proto/tree-frozen';
/** The marker of a file the compiler owns: it refuses to overwrite a plan or template without it. */
const GENERATED_BY = 'manifest.mjs compile';
const EXIT_ON = 'a nonzero exit stops the plan (run-task.ps1)';
const STAGE1_BINDING = `${EVIDENCE}/V4-T04/accepted-binding.json`;
const P0_BINDING = `${EVIDENCE}/V4-S2P/p0-v4.accepted.json`;
/** The seven arms of stage 2, in the order of their P-1 passes and of the trees the plan builds. */
const STAGE2_ARMS = Object.freeze(['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5']);
/** The four arms of stage 4 (N-V4-03 creates them): their P-1 manifests are compiled, their passes are T11e's. */
const STAGE4_ARMS = Object.freeze(['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped']);
/** Every variant a step of `V4-S2` runs, the probes' `instr` and `r4c` included (`log-link` as the plan names it). */
const STAGE2_TREES = Object.freeze(['base', 'instr', 'r4c', 'v4', 'v4-w760', 'v4-w095', 'v4-w380', 'log-link', ...STAGE2_ARMS]);
/** A P-1 pass: the three observer modes on these cases, then one generation with its two replays (R06). */
const PARITY_CASES = Object.freeze(['12x12-nightmare', '26x26-hell-1', '14x14-master']);
const PARITY_GENERATE_CASE = '12x12-nightmare';
const PARITY_MODES = Object.freeze(['absent', 'charge', 'record']);
/** The minimum horizons (RV4-04, D-V4-19): a P-1 pass holds a generation item (reserve 245), every other bounded step 150. */
const PARITY_MIN_HORIZON_S = 270;
const PROBE_MIN_HORIZON_S = 150;
/** The probes of stage 2 (V4-S2K: T10a's counters and T10b's profile; V4-S2W: T10c's width run) and their populations. */
const KERNEL_CASES = Object.freeze(['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '26x26-nightmare', '26x26-hell-1']);
const WIDTH_CASES = Object.freeze(['26x26-nightmare', '14x14-nightmare']);
const WIDTH_ROUNDS = 3;
/** The admission reserve of a profile or width item (D-V4-14); the two probe modules keep it private. */
const PROCESS_RESERVE_S = 120;
/** The item logs whose `item-end` lines give the measured seconds (task, step): the stage-1 parity and replay, T10a, T10b and T10c. */
const DURATION_LOGS = Object.freeze([['V4-T04', 'parity'], ['V4-T04', 'replay'], ['V4-T10a', 'counters'], ['V4-T10b', 'profile'], ['V4-T10c', 'run']]);
const ITEM_MANIFEST_TASKS = Object.freeze(['V4-S2P', 'V4-S4P']);

/**
 * @typedef {object} Step One step of a plan (RV4-04). `node` is the argv of `run-task.ps1` (script path first); the paths of `consumes`
 *   and `produces` are relative to the root with `/` (a folder ends with `/`); `state`, `repeatUntilDone`, `projectS`, `minHorizonS`,
 *   `invocations` and `price` belong to locked steps (`price` is the simulation's input, `projectS` and `invocations` its result).
 * @property {string} id
 * @property {boolean} locked
 * @property {string[]} node
 * @property {string} [state] `<task>\<arm>\<shard>\state.json`, relative to `tests\artifacts\ig-proto\frozen`.
 * @property {boolean} [repeatUntilDone]
 * @property {number} [projectS]
 * @property {number} [minHorizonS]
 * @property {number} [invocations]
 * @property {boolean} optional
 * @property {Record<string, any>} [price]
 * @property {string[]} dependsOn
 * @property {string[]} consumes
 * @property {string[]} produces
 * @property {string} expect
 * @property {string} exitOn
 */
/**
 * @typedef {{ type: 'variant', id: string } | { type: 'file', path: string }
 *   | { type: 'accepted', path: string, current: string[], kind?: string, fields?: 'LIVE_DEADLINE_FIELDS' }
 *   | { type: 'selection', path: string, activation: string }} Prerequisite
 */
/** @typedef {(input: Parameters<typeof stepPrice>[0], id?: string) => ReturnType<typeof stepPrice>} PriceOf `stepPrice`, or a wrapper that also gets the step's id. */

/**
 * @param {string} [file] The data file; `data/frozen-round-v1.json` by default.
 * @returns {MatrixData} A fresh parse of the matrix data (the arms' variants and the workers of a request row come from it).
 */
export function matrixData(file = join(IG_DIR, 'data', 'frozen-round-v1.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** @param {string} variant @returns {string} The file the tree of the variant is built to (`tree.mjs build`). */
const treeFile = (variant) => `${TREES}/${variant}/ig-tree.json`;

/**
 * @param {PriceOf} priceOf
 * @param {Parameters<typeof stepPrice>[0]} input
 * @param {string} id
 * @returns {import('./manifest.mjs').StepPrice}
 */
function pricedOf(priceOf, input, id) {
  const priced = priceOf(input, id);
  if (priced?.admissible !== true) {
    throw new Error(`manifest: step ${id} is not admissible (${/** @type {any} */ (priced)?.reason ?? 'no price'})`);
  }
  return priced;
}

/** @param {string} id @param {string[]} node @param {{ dependsOn?: string[], consumes?: string[], produces?: string[], expect: string }} o @returns {Step} */
function unlockedStep(id, node, { dependsOn = [], consumes = [], produces = [], expect }) {
  return { id, locked: false, node, optional: false, dependsOn, consumes, produces, expect, exitOn: EXIT_ON };
}

/**
 * A locked step: `repeatUntilDone` always true (a step whose first invocation leaves it unfinished stops the plan otherwise,
 * `run-task.ps1`), its full `state` and its explicit `minHorizonS`; `projectS` and `invocations` are `stepPrice` of `price`.
 * @param {{ id: string, node: string[], state: string, minHorizonS: number, optional?: boolean, price: Record<string, any>,
 *   dependsOn: string[], consumes: string[], produces: string[], expect: string }} o
 * @param {PriceOf} priceOf
 * @returns {Step}
 */
function lockedStep({ id, node, state, minHorizonS, optional = false, price: input, dependsOn, consumes, produces, expect }, priceOf) {
  const priced = pricedOf(priceOf, /** @type {any} */ (input), id);
  return {
    id, locked: true, node, state, repeatUntilDone: true, projectS: priced.projectS, minHorizonS, invocations: priced.invocations, optional,
    price: input, dependsOn, consumes, produces, expect, exitOn: EXIT_ON,
  };
}

/**
 * @param {unknown} durations The measured seconds by `<kind>/<variant>` (`durationsFromLogs`); `<kind>/*` is a seam for a kind of one value.
 * @param {string} kind
 * @param {string} variant
 * @returns {number | null} The measure, `null` when the kind or the variant has none (the step then takes its reserve).
 */
function measuredS(durations, kind, variant) {
  const table = /** @type {Record<string, unknown>} */ (durations ?? {});
  const found = table[`${kind}/${variant}`] ?? table[`${kind}/*`];
  return found === undefined ? null : positive(`duration ${kind}/${variant}`, found);
}

/**
 * The seconds each item takes, from the `item-end` lines of the frozen steps of the earlier tasks: the mean of `ms / 1000` per
 * `<kind>/<variant>` (the kind and the variant are those of the item's `item-start` line). A line without a start, or without a finite
 * positive `ms`, is not a measure; every status counts (an ended item is a measure of what it took).
 * @param {any[][]} logs The lines of each item log.
 * @returns {Record<string, number>} In key order.
 */
export function measuredDurations(logs) {
  /** @type {Map<string, { ms: number, n: number }>} */
  const sums = new Map();
  for (const lines of logs) {
    /** @type {Map<string, string>} */
    const keyOf = new Map();
    for (const line of lines) {
      if (line?.type === 'item-start') {
        keyOf.set(line.item, `${line.kind}/${line.variant}`);
      }
    }
    for (const line of lines) {
      const key = line?.type === 'item-end' ? keyOf.get(line.item) : undefined;
      if (key === undefined || typeof line.ms !== 'number' || !Number.isFinite(line.ms) || line.ms <= 0) {
        continue;
      }
      const sum = sums.get(key) ?? { ms: 0, n: 0 };
      sum.ms += line.ms;
      sum.n += 1;
      sums.set(key, sum);
    }
  }
  return Object.fromEntries([...sums.keys()].sort().map((key) => {
    const { ms, n } = /** @type {{ ms: number, n: number }} */ (sums.get(key));
    return [key, ms / n / 1000];
  }));
}

/**
 * @param {(path: string) => any[]} [read] The item log at an absolute path; `readItemLog` by default (an absent log has no lines).
 * @returns {Record<string, number>} `measuredDurations` of the five logs of `DURATION_LOGS` (read only).
 */
export function durationsFromLogs(read = readItemLog) {
  return measuredDurations(DURATION_LOGS.map(([task, step]) => read(join(artifactDir('frozen', task, step), 'items.jsonl'))));
}

/**
 * The groups of a step of bounded items as `simulateItems` takes them: consecutive items of one kind and variant (`lib/items.mjs`
 * `runItems`), on the lanes of the kind, with the admission reserve of the kind; each item takes the measured seconds of its kind and
 * variant, else its reserve, and the group says which (`durationSource`).
 * @param {{ rows: any[] }} manifest An item manifest (T04c's format); a row of `v4-select` is one item per mode, a `v4-generate` one,
 *   a `v4-replay` one per puzzle (`expandManifest`'s order).
 * @param {Record<string, number>} durations
 * @returns {(ItemGroup & { durationSource: 'item logs' | 'reserve' })[]}
 */
export function itemGroups(manifest, durations) {
  if (!Array.isArray(manifest?.rows)) {
    throw new TypeError('manifest: an item manifest needs a list of rows');
  }
  /** @type {(ItemGroup & { durationSource: 'item logs' | 'reserve' })[]} */
  const groups = [];
  for (const row of manifest.rows) {
    const { kind, variant } = row ?? {};
    const count = kind === 'v4-select' ? row.modes?.length : kind === 'v4-generate' ? 1 : kind === 'v4-replay' ? row.puzzles : Number.NaN;
    if (!Object.hasOwn(DEFAULT_LIMITS.itemReserveS, kind) || typeof variant !== 'string' || !Number.isInteger(count) || count < 1) {
      throw new Error(`manifest: a row of kind ${String(kind)} on ${String(variant)} names no items`);
    }
    const reserveS = DEFAULT_LIMITS.itemReserveS[kind];
    const measured = measuredS(durations, kind, variant);
    let group = groups.at(-1);
    if (group === undefined || group.kind !== kind || group.variant !== variant) {
      group = {
        kind, variant, lanes: /** @type {Record<string, number>} */ (ITEM_LANES)[kind] ?? 1, reserveS, durationsS: [],
        durationSource: measured === null ? 'reserve' : 'item logs',
      };
      groups.push(group);
    }
    for (let i = 0; i < count; i += 1) {
      group.durationsS.push(measured ?? reserveS);
    }
  }
  return groups;
}

/**
 * The item manifest of a P-1 parity pass of one arm (R06; T04c's format): the three observer modes on `12x12-nightmare`,
 * `26x26-hell-1` and `14x14-master` (9 `v4-select` items), one `v4-generate` on `12x12-nightmare` (quantity 2) and its 2 `v4-replay`
 * items (12 items). The seeds are T04c's (`ig-v4/parity/<caseId>` and `ig-v4/replay/<caseId>`).
 * @param {string} task `V4-S2P` or `V4-S4P`.
 * @param {string} arm The variant under test.
 * @returns {{ format: string, version: number, task: string, step: string, rows: Record<string, unknown>[] }}
 */
export function parityManifest(task, arm) {
  const generated = { variant: arm, caseId: PARITY_GENERATE_CASE, seedText: `ig-v4/replay/${PARITY_GENERATE_CASE}` };
  return {
    format: 'ig-proto-items',
    version: 1,
    task,
    step: `parity-${arm}`,
    rows: [
      ...PARITY_CASES.map((caseId) => ({ kind: 'v4-select', variant: arm, caseId, seedText: `ig-v4/parity/${caseId}`, modes: [...PARITY_MODES] })),
      { kind: 'v4-generate', ...generated, quantity: 2 },
      { kind: 'v4-replay', ...generated, puzzles: 2 },
    ],
  };
}

/**
 * The step of one group of request rows (RV4-04): `arm.mjs run` with the complete arguments of the group, its state, `minHorizonS`
 * `rowLimitS + 12`, and its price as the simulation of `rows` rows of `rowS` seconds.
 * @param {Group & { variant?: string }} group A group of the expansion; `variant` (T11f's resolved comparator) replaces the arm's own,
 *   which is `arms[<arm>].variant` of the data file (T11a's groups carry none).
 * @param {PriceOf} priceOf
 * @param {number} rowS The projected seconds of a row (`projectedRowS`).
 * @returns {Step}
 */
export function rowStep(group, priceOf, rowS) {
  if (!(group.rows >= 1)) {
    throw new Error(`manifest: a row step needs at least one row (${groupKey(group)})`);
  }
  const data = matrixData();
  const variant = group.variant ?? data.arms[group.arm]?.variant;
  if (typeof variant !== 'string') {
    throw new Error(`manifest: no variant for the arm ${group.arm} (${groupKey(group)})`);
  }
  return lockedStep({
    id: `rows-${group.arm}-${group.shard}`,
    node: [`${IG}arm.mjs`, 'run', '--task', group.task, '--arm', group.arm, '--shard', group.shard, '--variant', variant, '--workers', String(data.workers),
      '--cases', `${group.cell}:${group.from}-${group.to}`, '--row-limit-s', String(group.rowLimitS)],
    state: `${group.task}\\${group.arm}\\${group.shard}\\state.json`,
    minHorizonS: group.rowLimitS + 12,
    optional: group.optional === true,
    price: { type: 'rows', rows: group.rows, rowS, rowLimitS: group.rowLimitS },
    dependsOn: ['trees'],
    consumes: [treeFile(variant)],
    produces: [`${RAW}/${group.task}/${group.arm}/${group.shard}/state.json`],
    expect: `arm: <n> row(s) recorded in this invocation, ${group.rows} of ${group.rows} in all (<s> s); the state has done: true`,
  }, priceOf);
}

/**
 * The three steps of an arm's P-1 parity pass (R06, RV3-02): the bounded items of its manifest, the receipt with a required pass, and the
 * accepted binding (D-V4-18). The manifest is `tools\ig-proto\plans\items\<task>.parity-<arm>.json` (`parityManifest`).
 * @param {string} task `V4-S2P` or `V4-S4P`: the task and the folder of the pass; the binding is accepted `--by` the plan of that stage.
 * @param {string} arm
 * @param {PriceOf} priceOf
 * @param {Record<string, number>} durations
 * @returns {Step[]} `parity-<arm>`, `receipt-<arm>`, `accept-<arm>`.
 */
export function parityPass(task, arm, priceOf, durations) {
  const step = `parity-${arm}`;
  const manifest = `${IG}plans\\items\\${task}.${step}.json`;
  const receipt = `${EVIDENCE}/${task}/${step}.receipt.json`;
  const binding = `${EVIDENCE}/${task}/${step}.accepted.json`;
  const raw = `${RAW}/${task}/${step}`;
  return [
    lockedStep({
      id: step,
      node: [`${IG}v4-check.mjs`, 'run', '--task', task, '--step', step, '--manifest', manifest],
      state: `${task}\\${step}\\state.json`,
      minHorizonS: PARITY_MIN_HORIZON_S,
      price: { type: 'items', groups: itemGroups(parityManifest(task, arm), durations) },
      dependsOn: ['trees'],
      consumes: [treeFile(arm)],
      produces: [`${raw}/state.json`, `${raw}/items.jsonl`],
      expect: 'the state has done: true (every item of the manifest has ended)',
    }, priceOf),
    unlockedStep(`receipt-${arm}`, [`${IG}v4-check.mjs`, 'receipt', '--kind', 'parity', '--task', task, '--step', step, '--manifest', manifest, '--arm', arm, '--require-pass'], {
      dependsOn: [step],
      consumes: [`${raw}/state.json`, `${raw}/items.jsonl`],
      produces: [receipt],
      expect: `receipt: parity pass -> ${receipt}`,
    }),
    unlockedStep(`accept-${arm}`, [`${IG}v4-check.mjs`, 'accept', '--task', task, '--step', step, '--manifest', manifest, '--receipt', receipt, '--binding', binding, '--by', task.replace(/P$/, '')], {
      dependsOn: [`receipt-${arm}`],
      consumes: [receipt],
      produces: [binding],
      expect: `accepted: ${receipt} sha256 <hash> -> ${binding}`,
    }),
  ];
}

/**
 * A plan for `run-task.ps1` (the Authority section of T11c).
 * @param {{ task: string, generatedBy: string, runnable: boolean, blockedBy: string[], prerequisites: Prerequisite[], steps: Step[] }} o
 * @returns {{ task: string, generatedBy: string, runnable: boolean, blockedBy: string[], prerequisites: Prerequisite[],
 *   allocationMinutes: number, optionalMinutes: number, steps: Step[] }} `allocationMinutes` is the ceiling in minutes of the required locked
 *   steps' `projectS + 45 x invocations` (what the runner's forecast adds), `optionalMinutes` the same for the optional ones (R2-12).
 */
export function planOf({ task, generatedBy, runnable, blockedBy, prerequisites, steps }) {
  /** @param {boolean} optional @returns {number} */
  const minutes = (optional) => Math.ceil(steps
    .filter((s) => s.locked && s.optional === optional)
    .reduce((sum, s) => sum + /** @type {number} */ (s.projectS) + QUIET_S * /** @type {number} */ (s.invocations), 0) / 60);
  return { task, generatedBy, runnable, blockedBy, prerequisites, allocationMinutes: minutes(false), optionalMinutes: minutes(true), steps };
}

/** @param {string} plan @param {Prerequisite[]} prerequisites @returns {Step} The gate: a blocked plan stops here, at its first step. */
const gateStep = (plan, prerequisites) => unlockedStep('prerequisites', [`${IG}manifest.mjs`, 'check-prerequisites', '--plan', plan], {
  consumes: prerequisites.flatMap((p) => (p.type === 'file' || p.type === 'accepted' ? [p.path] : p.type === 'selection' ? [p.activation] : [])),
  expect: 'prerequisites: pass',
});

/** @param {string} task @returns {Step} */
const firewallSnapshotStep = (task) => unlockedStep('firewall-snapshot', [`${IG}firewall.mjs`, 'snapshot', '--task', task], {
  dependsOn: ['prerequisites'], produces: [`${RAW}/${task}/firewall-before.json`], expect: `firewall: snapshot of ${task}`,
});

/** @param {string} task @returns {Step} */
const firewallCheckStep = (task) => unlockedStep('firewall-check', [`${IG}firewall.mjs`, 'check', '--task', task], {
  dependsOn: ['firewall-snapshot'], consumes: [`${RAW}/${task}/firewall-before.json`], expect: `firewall: OK, <n> production files unchanged since the snapshot of ${task}`,
});

/** @param {readonly string[]} variants @returns {Step} */
const treesStep = (variants) => unlockedStep('trees', [`${IG}lib\\tree.mjs`, 'build', ...variants], {
  dependsOn: ['prerequisites'], produces: variants.map(treeFile), expect: '<variant> <treeId> <copyDigest> built|reused, one line per variant',
});

/** @param {string} task @param {string} arm @param {Step[]} rows The row steps of the arm. @returns {Step} */
const publishStep = (task, arm, rows) => unlockedStep(`publish-${arm}`, [`${IG}arm.mjs`, 'publish', '--task', task, '--arm', arm], {
  dependsOn: rows.map((s) => s.id),
  consumes: rows.flatMap((s) => s.produces),
  produces: [`${EVIDENCE}/${task}/${arm}/`],
  expect: `arm: published ${arm}/<shard>: <n> rows, <m> journal lines (one line per shard)`,
});

/**
 * The probes of stage 2, each priced on the population its command runs (RV4-04): T10a's counters (six subsets of each case), T10b's
 * profile (one process per case) and T10c's width run (each case at four widths, three rounds an item).
 * @param {PriceOf} priceOf
 * @param {Record<string, number>} durations
 * @returns {Step[]} `kernel-counters`, `kernel-profile`, `kernel-report`, `width`, `width-report`.
 */
function probeSteps(priceOf, durations) {
  const counters = `${RAW}/V4-S2K/counters`;
  const profile = `${RAW}/V4-S2K/profile`;
  const width = `${RAW}/V4-S2W/run`;
  const kernelCases = KERNEL_CASES.join(',');
  const profileCases = PROFILE_CASES.join(',');
  const widthCases = WIDTH_CASES.join(',');
  const kernelReserveS = DEFAULT_LIMITS.itemReserveS['v4-kernel'];
  const kernelS = measuredS(durations, 'v4-kernel', 'r4c');
  const profileS = measuredS(durations, 'process', 'instr');
  const widthS = measuredS(durations, 'width', 'base');
  const source = (/** @type {number | null} */ measured) => (measured === null ? 'reserve' : 'item logs');
  return [
    lockedStep({
      id: 'kernel-counters',
      node: [`${IG}kernel-probe.mjs`, 'counters', '--task', 'V4-S2K', '--cases', kernelCases],
      state: 'V4-S2K\\counters\\state.json',
      minHorizonS: PROBE_MIN_HORIZON_S,
      price: {
        type: 'items', cases: kernelCases,
        groups: [{
          kind: 'v4-kernel', variant: 'r4c', lanes: ITEM_LANES['v4-kernel'], reserveS: kernelReserveS,
          durationsS: Array.from({ length: KERNEL_CASES.length * SUBSETS_PER_CASE }, () => kernelS ?? kernelReserveS), durationSource: source(kernelS),
        }],
      },
      dependsOn: ['trees'], consumes: [treeFile('instr'), treeFile('r4c')], produces: [`${counters}/state.json`, `${counters}/items.jsonl`],
      expect: 'the state has done: true (every item has ended)',
    }, priceOf),
    lockedStep({
      id: 'kernel-profile',
      node: [`${IG}kernel-probe.mjs`, 'profile', '--task', 'V4-S2K', '--cases', profileCases],
      state: 'V4-S2K\\profile\\state.json',
      minHorizonS: PROBE_MIN_HORIZON_S,
      price: {
        type: 'process', cases: profileCases, durationsS: PROFILE_CASES.map(() => profileS ?? PROCESS_RESERVE_S), reserveS: PROCESS_RESERVE_S,
        durationSource: source(profileS),
      },
      dependsOn: ['trees'], consumes: [treeFile('instr')], produces: [`${profile}/state.json`, `${profile}/items.jsonl`],
      expect: `kernel-probe: wrote ${profile}/profile.jsonl (<n> records)`,
    }, priceOf),
    unlockedStep('kernel-report', [`${IG}kernel-probe.mjs`, 'report', '--task', 'V4-S2K'], {
      dependsOn: ['kernel-counters', 'kernel-profile'],
      consumes: [`${counters}/state.json`, `${counters}/items.jsonl`, `${profile}/state.json`, `${profile}/items.jsonl`],
      produces: [`${EVIDENCE}/V4-S2K/kernel.json`, `${EVIDENCE}/V4-S2K/kernel.md`],
      expect: `kernel-probe: wrote ${EVIDENCE}/V4-S2K/kernel.json`,
    }),
    lockedStep({
      id: 'width',
      node: [`${IG}width-probe.mjs`, 'run', '--task', 'V4-S2W', '--cases', widthCases, '--rounds', String(WIDTH_ROUNDS)],
      state: 'V4-S2W\\run\\state.json',
      minHorizonS: PROBE_MIN_HORIZON_S,
      price: {
        type: 'process', cases: widthCases, durationsS: Array.from({ length: WIDTH_CASES.length * WIDTHS.length }, () => (widthS === null ? PROCESS_RESERVE_S : WIDTH_ROUNDS * widthS)),
        reserveS: PROCESS_RESERVE_S, durationSource: source(widthS),
      },
      dependsOn: ['trees'], consumes: [treeFile('base')], produces: [`${width}/state.json`, `${width}/items.jsonl`],
      expect: 'width-probe: every item has ended; the state has done: true',
    }, priceOf),
    unlockedStep('width-report', [`${IG}width-probe.mjs`, 'report', '--task', 'V4-S2W'], {
      dependsOn: ['width'],
      consumes: [`${width}/state.json`, `${width}/items.jsonl`],
      produces: [`${EVIDENCE}/V4-S2W/width.json`, `${EVIDENCE}/V4-S2W/width.md`],
      expect: `width-probe: wrote ${EVIDENCE}/V4-S2W/width.json`,
    }),
  ];
}

/**
 * Compiles the plans that can be fixed now (T11c): `V4-S2` (stage 2: the isolated P-0 pass of `v4` and the P-1 pass of every stage-2 arm
 * first, so that a failed proof stops the plan before any request row, then the request rows and the probes) and `V4-LIVE` (blocked until the freeze and the live deadline exist), the priced universe of stage 4
 * and the template of the second validation (`runnable: false`, no `node`: no stage-4 measurement plan is compiled before its collection
 * is activated, D-V4-20), and the item manifests the plans name. Every step is priced alone as it will run (T11b); a step that is not
 * admissible makes the whole compilation throw, naming each. Nothing is read from a measured row of the round.
 * @param {ReturnType<typeof expandMatrix>} expansion
 * @param {PriceOf} priceOf `stepPrice` (a function of the step's price input and, as a second argument, its id).
 * @param {{ durations?: Record<string, number>, rowSOf?: (group: Group) => number, stage1Parity?: any }} [options] `durations`: the measured
 *   seconds by `<kind>/<variant>` (`durationsFromLogs`); `rowSOf`: the projected seconds of one row of a group (default: `projectedRowS`
 *   of the cell's MP12b1 median and the identity factor); `stage1Parity`: the stage-1 parity manifest (default `plans/V4-T04.parity.json`).
 * @returns {{ plans: Record<string, ReturnType<typeof planOf>>, templates: Record<string, any>, itemManifests: Record<string, any> }}
 *   Each map is keyed by the file name: `plans` and `templates` under `tools/ig-proto/plans/`, `itemManifests` under
 *   `tools/ig-proto/plans/items/`.
 */
export function compilePlans(expansion, priceOf, { durations = {}, rowSOf, stage1Parity } = {}) {
  const stage1 = stage1Parity ?? JSON.parse(readFileSync(join(IG_DIR, 'plans', 'V4-T04.parity.json'), 'utf8'));
  const rowSFor = rowSOf ?? defaultRowSOf();
  /** @type {string[]} */
  const inadmissible = [];
  /** @param {string} name @returns {PriceOf} */
  const pricing = (name) => (input, id = '') => {
    const priced = priceOf(input, id);
    if (priced.admissible !== true) {
      inadmissible.push(`${name}/${id}: ${priced.reason}`);
      return { admissible: true, projectS: 0, invocations: 1, quietS: 0, countedS: 0, guardS: 0, ceilingS: 0, ceilingInvocations: 1, completed: 0, censored: 0, schedule: [] };
    }
    return priced;
  };
  /** @param {string} collection @param {boolean} [comparator] @returns {Group[]} */
  const groupsOf = (collection, comparator = false) => expansion.groups.filter((g) => g.collection === collection && g.comparator === comparator);
  /** @param {Step[]} steps @param {string} plan @returns {Step[]} The steps, once their ids are known to be distinct. */
  const distinct = (steps, plan) => {
    const ids = steps.map((s) => s.id);
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (repeated.length > 0) {
      throw new Error(`manifest: ${plan} repeats the step ${repeated[0]}`);
    }
    return steps;
  };

  // V4-S2
  const stage2 = groupsOf('stage2');
  const armsOfGroups = [...new Set(stage2.map((g) => g.arm))];
  if (stage2.length === 0 || armsOfGroups.length !== STAGE2_ARMS.length || !STAGE2_ARMS.every((a) => armsOfGroups.includes(a))) {
    throw new Error(`manifest: the stage-2 groups must run exactly the arms ${STAGE2_ARMS.join(', ')} (found ${armsOfGroups.join(', ')})`);
  }
  const s2 = pricing('V4-S2');
  const s2Prerequisites = /** @type {Prerequisite[]} */ ([{ type: 'accepted', path: STAGE1_BINDING, current: [] }]);
  const rows2 = stage2.map((g) => rowStep(g, s2, rowSFor(g)));
  const p0Manifest = { ...JSON.parse(JSON.stringify(stage1)), task: 'V4-S2P', step: 'p0-v4' };
  const p0Variants = [...new Set(p0Manifest.rows.map((/** @type {{ variant: string }} */ r) => r.variant))];
  const p0File = `${IG}plans\\items\\V4-S2P.p0-v4.json`;
  const p0Receipt = `${EVIDENCE}/V4-S2P/p0-v4.receipt.json`;
  const p0Raw = `${RAW}/V4-S2P/p0-v4`;
  // The proofs come first (ruling of 2026-11-17): a failed or incomplete proof stops the plan before any request row runs.
  const p0Steps = [
    lockedStep({
      id: 'p0-v4',
      node: [`${IG}v4-check.mjs`, 'run', '--task', 'V4-S2P', '--step', 'p0-v4', '--manifest', p0File],
      state: 'V4-S2P\\p0-v4\\state.json',
      minHorizonS: PROBE_MIN_HORIZON_S,
      price: { type: 'items', groups: itemGroups(p0Manifest, durations) },
      dependsOn: ['trees'], consumes: p0Variants.map(treeFile), produces: [`${p0Raw}/state.json`, `${p0Raw}/items.jsonl`],
      expect: 'the state has done: true (every item of the stage-1 parity corpus has ended under V4-S2P)',
    }, s2),
    unlockedStep('receipt-p0', [`${IG}v4-check.mjs`, 'receipt', '--kind', 'p0-identity', '--task', 'V4-S2P', '--step', 'p0-v4', '--manifest', p0File, '--arm', 'v4',
      '--baseline', STAGE1_BINDING, '--require-pass'], {
      dependsOn: ['p0-v4'], consumes: [`${p0Raw}/state.json`, `${p0Raw}/items.jsonl`, STAGE1_BINDING], produces: [p0Receipt],
      expect: `receipt: p0-identity pass -> ${p0Receipt}`,
    }),
    unlockedStep('accept-p0', [`${IG}v4-check.mjs`, 'accept', '--task', 'V4-S2P', '--step', 'p0-v4', '--manifest', p0File, '--receipt', p0Receipt, '--binding', P0_BINDING, '--by', 'V4-S2'], {
      dependsOn: ['receipt-p0'], consumes: [p0Receipt], produces: [P0_BINDING], expect: `accepted: ${p0Receipt} sha256 <hash> -> ${P0_BINDING}`,
    }),
  ];
  const planS2 = planOf({
    task: 'V4-S2', generatedBy: GENERATED_BY, runnable: true, blockedBy: [], prerequisites: s2Prerequisites,
    steps: distinct([
      gateStep('V4-S2', s2Prerequisites),
      firewallSnapshotStep('V4-S2'),
      treesStep(STAGE2_TREES),
      ...p0Steps,
      ...STAGE2_ARMS.flatMap((arm) => parityPass('V4-S2P', arm, s2, durations)),
      ...rows2,
      ...STAGE2_ARMS.map((arm) => publishStep('V4-S2', arm, rows2.filter((s) => s.node[s.node.indexOf('--arm') + 1] === arm))),
      ...probeSteps(s2, durations),
      firewallCheckStep('V4-S2'),
    ], 'V4-S2'),
  });

  // V4-LIVE
  const live = groupsOf('live');
  if (live.length === 0) {
    throw new Error('manifest: the expansion has no live-deadline group');
  }
  const sLive = pricing('V4-LIVE');
  const liveRoot = `${EVIDENCE}/V4-LIVE`;
  const liveReceipt = `${liveRoot}/live-deadline.json`;
  const liveBinding = `${liveRoot}/live-deadline.accepted.json`;
  const liveRows = live.map((g) => rowStep(g, sLive, rowSFor(g)));
  const liveArms = [...new Set(live.map((g) => g.arm))];
  const liveRequires = /** @type {Prerequisite[]} */ ([
    { type: 'variant', id: 'fr-frozen' },
    { type: 'file', path: `${EVIDENCE}/V4-S3/freeze.json` },
    { type: 'file', path: 'tools/ig-proto/live-deadline.mjs' },
    { type: 'accepted', path: P0_BINDING, current: ['v4'] },
  ]);
  const planLive = planOf({
    task: 'V4-LIVE', generatedBy: GENERATED_BY, runnable: false, blockedBy: ['N-V4-03', 'N-V4-13'], prerequisites: liveRequires,
    steps: distinct([
      gateStep('V4-LIVE', liveRequires),
      firewallSnapshotStep('V4-LIVE'),
      treesStep(liveArms),
      ...liveRows,
      ...liveArms.map((arm) => publishStep('V4-LIVE', arm, liveRows.filter((s) => s.node[s.node.indexOf('--arm') + 1] === arm))),
      unlockedStep('live-receipt', [`${IG}live-deadline.mjs`, 'receipt', '--task', 'V4-LIVE', '--require-pass'], {
        dependsOn: liveArms.map((a) => `publish-${a}`), consumes: liveArms.map((a) => `${liveRoot}/${a}/`), produces: [liveReceipt],
        expect: `receipt: live-deadline pass -> ${liveReceipt}`,
      }),
      unlockedStep('accept-live', [`${IG}v4-check.mjs`, 'accept', '--task', 'V4-LIVE', '--receipt', liveReceipt, '--binding', liveBinding, '--by', 'V4-LIVE'], {
        dependsOn: ['live-receipt'], consumes: [liveReceipt], produces: [liveBinding], expect: `accepted: ${liveReceipt} sha256 <hash> -> ${liveBinding}`,
      }),
      firewallCheckStep('V4-LIVE'),
    ], 'V4-LIVE'),
  });

  // The universe of stage 4 and the second validation: priced groups, no step.
  const universe = pricing('V4-S4.universe');
  /** @param {Group} group @returns {Group & { price: Record<string, any>, projectS: number, invocations: number }} */
  const priced = (group) => {
    const input = { type: /** @type {const} */ ('rows'), rows: group.rows, rowS: rowSFor(group), rowLimitS: group.rowLimitS };
    const result = pricedOf(universe, input, group.id);
    return { ...group, price: input, projectS: result.projectS, invocations: result.invocations };
  };
  const collection = (/** @type {string} */ name) => ({ groups: groupsOf(name).map(priced), comparators: groupsOf(name, true).map(priced) });
  const second = collection('second');

  // The item manifests: the isolated P-0 and the P-1 pass of every arm of stages 2 and 4.
  /** @type {Record<string, any>} */
  const itemManifests = { 'V4-S2P.p0-v4.json': p0Manifest };
  for (const arm of STAGE2_ARMS) {
    itemManifests[`V4-S2P.parity-${arm}.json`] = parityManifest('V4-S2P', arm);
  }
  for (const arm of STAGE4_ARMS) {
    itemManifests[`V4-S4P.parity-${arm}.json`] = parityManifest('V4-S4P', arm);
  }

  if (inadmissible.length > 0) {
    throw new Error(`manifest: ${inadmissible.length} step(s) not admissible: ${inadmissible.join('; ')}`);
  }
  return {
    plans: { 'V4-S2.json': planS2, 'V4-LIVE.json': planLive },
    templates: {
      'V4-S4.universe.json': {
        task: 'V4-S4', generatedBy: GENERATED_BY, template: true, runnable: false,
        collections: { initial: collection('initial'), conditional: collection('conditional'), optional: collection('optional'), second },
      },
      'V4-S4X.template.json': {
        task: 'V4-S4X', generatedBy: GENERATED_BY, template: true, runnable: false, blockedBy: ['N-V4-04'], groups: second.groups, comparators: second.comparators,
      },
    },
    itemManifests,
  };
}

/** @returns {(group: Group) => number} The projected seconds of a row: `projectedRowS` of the cell's MP12b1 median and the identity's factor. */
function defaultRowSOf() {
  const ratio = factor();
  /** @type {Map<string, number | null>} */
  const reference = new Map();
  return (group) => {
    if (!reference.has(group.cell)) {
      reference.set(group.cell, refS(group.cell));
    }
    return projectedRowS({ refS: /** @type {number | null} */ (reference.get(group.cell)), factor: ratio, rowLimitS: group.rowLimitS });
  };
}

/**
 * The prerequisites gate (RV3-06, D-V4-19): a plan whose variants, files or bindings do not exist refuses at its first step.
 * @param {Prerequisite[]} list The `prerequisites` of a plan: `variant` (the id is in `variants`), `file` (`exists(path)`), `accepted`
 *   (`{ path, current, kind?, fields? }`: the binding exists, `checkAccepted` passes with today's tree of each `current` id, its
 *   `expected.kind` is `kind` and, for `fields: 'LIVE_DEADLINE_FIELDS'`, its `expected.fields` equal `LIVE_DEADLINE_FIELDS`) and
 *   `selection` (V4-T11f, `{ path, activation }`: `proofCheck` passes for the class-selection receipt at `path` against the
 *   expectation `selectionInputs` builds from the activation record at `activation`).
 * @param {{ variants: string[], exists: (path: string) => boolean, readJson: (path: string) => any,
 *   currentOf: (id: string) => Promise<{ id: string, treeId: string, paramsHash: string }>,
 *   readFile?: (path: string) => string | null, list?: (folder: string) => string[], harnessHash?: string }} io `readFile`, `list` and
 *   `harnessHash` serve the `selection` type only (the defaults read the repository and today's harness).
 * @returns {Promise<{ status: 'pass' | 'blocked', reasons: string[], line: string }>} `line` is what `check-prerequisites` prints.
 */
export async function checkPrerequisites(list, io) {
  if (!Array.isArray(list)) {
    throw new TypeError('manifest: the prerequisites must be a list');
  }
  const { variants, exists, readJson, currentOf } = io;
  /** @type {string[]} */
  const reasons = [];
  for (const entry of list) {
    const type = /** @type {any} */ (entry)?.type;
    if (type === 'variant') {
      if (!variants.includes(entry.id)) {
        reasons.push(`variant ${entry.id} missing`);
      }
    } else if (type === 'file') {
      if (!exists(entry.path)) {
        reasons.push(`missing file ${entry.path}`);
      }
    } else if (type === 'accepted') {
      reasons.push(...await acceptedProblems(entry, { exists, readJson, currentOf }));
    } else if (type === 'selection') {
      reasons.push(...selectionProblems(entry, io));
    } else {
      reasons.push(`unknown prerequisite ${String(type)}`);
    }
  }
  return {
    status: reasons.length === 0 ? 'pass' : 'blocked', reasons,
    line: reasons.length === 0 ? 'prerequisites: pass' : `prerequisites: blocked (${reasons.join('; ')})`,
  };
}

/**
 * @param {{ path: string, current: string[], kind?: string, fields?: string }} entry
 * @param {Pick<Parameters<typeof checkPrerequisites>[1], 'exists' | 'readJson' | 'currentOf'>} io
 * @returns {Promise<string[]>} Why the binding does not stand; none when it does.
 */
async function acceptedProblems({ path, current = [], kind, fields }, { exists, readJson, currentOf }) {
  if (!exists(path)) {
    return [`missing binding ${path}`];
  }
  /** @type {any} */
  let binding;
  try {
    binding = readJson(path);
  } catch {
    return [`unreadable binding ${path}`];
  }
  /** @type {{ id: string, treeId: string, paramsHash: string }[]} */
  const today = [];
  for (const id of current) {
    try {
      today.push(await currentOf(id));
    } catch (e) {
      return [`no tree of ${id} (${e instanceof Error ? e.message : String(e)})`];
    }
  }
  const checked = checkAccepted(binding, { current: today });
  if (checked.status !== 'pass') {
    return checked.reasons;
  }
  const problems = [];
  if (kind !== undefined && binding.expected?.kind !== kind) {
    problems.push(`${path} is not a ${kind} binding`);
  }
  if (fields === 'LIVE_DEADLINE_FIELDS' && !isDeepStrictEqual(binding.expected?.fields, LIVE_DEADLINE_FIELDS)) {
    problems.push(`${path} lacks the live-deadline fields`);
  }
  return problems;
}

/**
 * The files a compilation writes, with the rule that tells a file of the compiler from another.
 * @param {ReturnType<typeof compilePlans>} compiled
 * @returns {{ path: string, value: any, own: (existing: any) => boolean }[]} Plans, templates, then item manifests, by repository path.
 */
export function compiledFiles({ plans, templates, itemManifests }) {
  /** @param {any} existing @returns {boolean} */
  const ownPlan = (existing) => existing?.generatedBy === GENERATED_BY;
  /** @param {any} existing @returns {boolean} */
  const ownItems = (existing) => existing?.format === 'ig-proto-items' && ITEM_MANIFEST_TASKS.includes(existing.task);
  return [
    ...Object.entries({ ...plans, ...templates }).map(([name, value]) => ({ path: `tools/ig-proto/plans/${name}`, value, own: ownPlan })),
    ...Object.entries(itemManifests).map(([name, value]) => ({ path: `tools/ig-proto/plans/items/${name}`, value, own: ownItems })),
  ];
}

/**
 * Writes the compiled files, or none: an existing target that is not the compiler's own (a plan without `"generatedBy": "manifest.mjs
 * compile"`, an item manifest that is not `ig-proto-items` of `V4-S2P` or `V4-S4P`, or a file that is not JSON) refuses the whole write.
 * @param {ReturnType<typeof compiledFiles>} files
 * @param {{ resolve?: (path: string) => string }} [io] `resolve` maps a repository path to the file (the self-test's seam).
 * @returns {{ written: string[], refused: string[] }} The paths written (in order), or why nothing was.
 */
export function writeCompiled(files, { resolve = abs } = {}) {
  /** @type {string[]} */
  const refused = [];
  for (const { path, own } of files) {
    const file = resolve(path);
    if (!existsSync(file)) {
      continue;
    }
    /** @type {any} */
    let existing = null;
    try {
      existing = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      existing = null;
    }
    if (!own(existing)) {
      refused.push(`${path} exists and is not a file of this compiler`);
    }
  }
  if (refused.length > 0) {
    return { written: [], refused };
  }
  for (const { path, value } of files) {
    writeJson(resolve(path), value);
  }
  return { written: files.map((f) => f.path), refused };
}

/** @param {string} reason @returns {1} */
function refuse(reason) {
  process.stderr.write(`manifest: ${reason}\n`);
  return 1;
}

/**
 * `compile --label frozen --source-label <SL>`: the matrix (with the controls of today's MP12b1 reports), the measured durations and the
 * plans; prints `wrote <path>` per file written and `compile: <n> files`. Its notes (each plan's allocation and the kinds priced at their
 * reserve) go to stderr, so that the lines of stdout are the contract.
 * @param {string[]} argv
 * @returns {Promise<number>} 0 once the files are written; 1 for a refused command, a step that is not admissible or a file of another origin.
 */
async function compileCommand(argv) {
  const { args } = parseArgs(argv, { values: ['label', 'source-label'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const data = matrixData();
  const expansion = expandMatrix(data, { controls: controlsFrom(mp12b1Report, data.cells.failingNightmare) });
  const durations = durationsFromLogs();
  const compiled = compilePlans(expansion, stepPrice, { durations });
  const { written, refused } = writeCompiled(compiledFiles(compiled));
  if (refused.length > 0) {
    return refuse(`compile: refused, nothing written (${refused.join('; ')})`);
  }
  for (const path of written) {
    process.stdout.write(`wrote ${path}\n`);
  }
  process.stdout.write(`compile: ${written.length} files\n`);
  for (const plan of Object.values(compiled.plans)) {
    process.stderr.write(`compile: ${plan.task} allocation ${plan.allocationMinutes} min, optional ${plan.optionalMinutes} min (${plan.steps.length} steps)\n`);
  }
  process.stderr.write(`compile: priced at the reserve (no measured item): ${reservePriced(compiled.plans).join(', ') || 'none'}\n`);
  return 0;
}

/**
 * @param {ReturnType<typeof compilePlans>['plans']} plans
 * @returns {string[]} The items a plan prices at their reserve for want of a measure: `<kind>/<variant>` of a group of bounded items,
 *   the step id of a process step; each once, sorted.
 */
export function reservePriced(plans) {
  /** @type {Set<string>} */
  const found = new Set();
  for (const plan of Object.values(plans)) {
    for (const step of plan.steps) {
      for (const group of step.price?.groups ?? []) {
        if (group.durationSource === 'reserve') {
          found.add(`${group.kind}/${group.variant}`);
        }
      }
      if (step.price?.durationSource === 'reserve') {
        found.add(step.id);
      }
    }
  }
  return [...found].sort();
}

/**
 * `check-prerequisites --plan <id> --label frozen --source-label <SL>`: the gate of a plan file under `tools/ig-proto/plans/`.
 * @param {string[]} argv
 * @returns {Promise<number>} 0 and `prerequisites: pass`; 1 and `prerequisites: blocked (<reason>; ...)` or a refused command.
 */
async function checkPrerequisitesCommand(argv) {
  const { args } = parseArgs(argv, { values: ['plan', 'label', 'source-label'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  if (args.plan === undefined || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(args.plan)) {
    return refuse('check-prerequisites needs --plan <id>');
  }
  const file = join(IG_DIR, 'plans', `${args.plan}.json`);
  if (!existsSync(file)) {
    return refuse(`no plan ${rel(file)}`);
  }
  const plan = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(plan.prerequisites)) {
    return refuse(`${rel(file)} has no prerequisites list`);
  }
  const result = await checkPrerequisites(plan.prerequisites, {
    variants: listVariants(),
    exists: (path) => existsSync(abs(path)),
    readJson: (path) => JSON.parse(readFileSync(abs(path), 'utf8')),
    currentOf: async (id) => {
      const tree = await ensureTree(id);
      return { id, treeId: tree.treeId, paramsHash: sha256(JSON.stringify(tree.params)) };
    },
  });
  process.stdout.write(`${result.line}\n`);
  return result.status === 'pass' ? 0 : 1;
}

// ---- Stage-4 collections (V4-T11e) ----
// The stage-4 validation measures one declared collection, fixed before it runs (R3-04, RV4-07, D-V4-20). `activation` is the pure record of
// the initial collection: its epoch hashes, the groups of its required cells (each with the collection it comes from), the conditional
// boards whose five-seed pilots reached ten on at least three valid requests, the optional items the owner approved, the declared rows and
// the comparator cells; `activationPlans` builds from it the concrete validation plan `V4-S4` (every selected group required, no comparator
// row) and the comparator template of exactly that collection; `activate` and `close` are the two write-once commands. All of it is data
// and pure functions (unlocked): nothing here runs a plan, a rating, a pool or a measurement.

const ACTIVATION_FORMAT = 'ig-v4-activation';
const CLOSURE_FORMAT = 'ig-v4-closure';
const ACTIVATE_GENERATED_BY = 'manifest.mjs activate';
const SHA_256 = /^[0-9a-f]{64}$/;
const FIRST_ROOT = `${EVIDENCE}/${TASKS.first}`;
const ACTIVATION_FILE = `${FIRST_ROOT}/activation.json`;
const SELECTION_FILE = `${FIRST_ROOT}/class-selection.json`;
const LIVE_BINDING = `${EVIDENCE}/V4-LIVE/live-deadline.accepted.json`;
const VERDICT_MANIFEST = 'tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json';
const COMPARATOR_PLAN = `tools/ig-proto/plans/${TASKS.firstComparator}.json`;
/** The uncapped twins a comparator cell may resolve to (T11f picks one from the cell's shipped arm). */
const COMPARATOR_CANDIDATES = Object.freeze(['fr-frozen-uncapped', 'fr-frozen-none-uncapped']);
/** The variants `V4-S4` builds: today's arm and the four stage-4 arms. */
const STAGE4_TREES = Object.freeze(['log-link', ...STAGE4_ARMS]);

/**
 * @typedef {object} ActivationRecord The record of the initial collection (V4-T11e); `activate` adds `createdAt`.
 * @property {'ig-v4-activation'} format
 * @property {1} version
 * @property {'initial'} collection
 * @property {Record<'data' | 'freeze' | 'universe', { path: string, sha256: string }>} epoch
 * @property {{ cell: string, activated: boolean, valid: number, reachingTen: number, pilotRuns: number }[]} conditional
 * @property {{ approved: string[], notApproved: string[] }} optional
 * @property {{ key: string, origin: 'initial' | 'conditional' | 'optional' }[]} groups
 * @property {string[]} declaredRows `<arm>/<rowKey>` of every rep of the groups.
 * @property {{ cell: string, from: number, to: number, rows: number, shard: string }[]} comparatorCells
 */

/**
 * The activation record of the initial collection (R3-04): the groups it measures are every non-comparator group of collection `initial`,
 * those of collection `conditional` on a board whose pilot `conditionalActivated` and those of collection `optional` whose item is
 * approved; its comparator cells are the comparator groups of `initial` and of the activated boards. A missing or invalid pilot row is
 * never a completion. Pure: the epoch hashes and the pilots are read by the caller.
 * @param {ReturnType<typeof expandMatrix>} expansion The default expansion (`expandMatrix` with today's controls).
 * @param {{ pilots: Record<string, unknown[] | null | undefined>, approvedOptional: string[],
 *   epoch: Record<'data' | 'freeze' | 'universe', { path: string, sha256: string }> }} input `pilots` maps each conditional board
 *   to the run records of its S2-5 pilot (a board without a key, or with `[]`, has none; a key that is no conditional board
 *   throws); `approvedOptional` lists the optional items the owner approved (`S4-6`); `epoch` the data file, the freeze file and the
 *   universe, each `{ path, sha256 }`.
 * @returns {ActivationRecord}
 */
export function activation(expansion, { pilots, approvedOptional, epoch }) {
  if (!Array.isArray(expansion?.groups) || !Array.isArray(expansion.items)) {
    throw new TypeError('manifest: activation needs the expansion of the matrix');
  }
  if (typeof pilots !== 'object' || pilots === null || Array.isArray(pilots)) {
    throw new TypeError('manifest: pilots must map each conditional board to the runs of its pilot');
  }
  const { groups } = expansion;
  const boards = [...new Set(groups.filter((g) => g.collection === 'conditional').map((g) => g.cell))];
  for (const cell of Object.keys(pilots)) {
    if (!boards.includes(cell)) {
      throw new Error(`manifest: ${cell} is not a conditional board (${boards.join(', ')})`);
    }
  }
  const conditional = boards.map((cell) => {
    const runs = pilots[cell] ?? [];
    return { cell, ...conditionalActivated(runs), pilotRuns: runs.length };
  });
  const activated = new Set(conditional.filter((c) => c.activated).map((c) => c.cell));

  const optionalItems = expansion.items.filter((i) => i.collection === 'optional').map((i) => i.id);
  if (!Array.isArray(approvedOptional) || approvedOptional.some((id) => !optionalItems.includes(id))) {
    throw new Error(`manifest: approvedOptional must be a list of optional items (${optionalItems.join(', ')})`);
  }
  if (new Set(approvedOptional).size !== approvedOptional.length) {
    throw new Error('manifest: an optional item is approved twice');
  }
  const approved = optionalItems.filter((id) => approvedOptional.includes(id));
  const notApproved = optionalItems.filter((id) => !approvedOptional.includes(id));

  /** @param {Group} group @returns {'initial' | 'conditional' | 'optional' | null} Where a group comes from, null when the collection does not measure it. */
  const originOf = (group) => {
    if (group.comparator) {
      return null;
    }
    switch (group.collection) {
      case 'initial':
        return 'initial';
      case 'conditional':
        return activated.has(group.cell) ? 'conditional' : null;
      case 'optional':
        return group.items.some((id) => approved.includes(id)) ? 'optional' : null;
      default:
        return null;
    }
  };
  const selected = groups.flatMap((group) => {
    const origin = originOf(group);
    return origin === null ? [] : [{ group, origin }];
  });
  const declaredRows = selected.flatMap(({ group }) => Array.from({ length: group.to - group.from + 1 }, (_, i) => `${group.arm}/${rowKey(group.cell, group.from + i)}`));
  const repeated = declaredRows.find((row, i) => declaredRows.indexOf(row) !== i);
  if (repeated !== undefined) {
    throw new Error(`manifest: the declared row ${repeated} is listed twice`);
  }
  for (const name of /** @type {const} */ (['data', 'freeze', 'universe'])) {
    const ref = epoch?.[name];
    if (typeof ref?.path !== 'string' || ref.path === '' || !SHA_256.test(ref.sha256)) {
      throw new TypeError(`manifest: epoch.${name} needs a path and a SHA-256`);
    }
  }
  return {
    format: ACTIVATION_FORMAT, version: 1, collection: 'initial',
    epoch: {
      data: { path: epoch.data.path, sha256: epoch.data.sha256 },
      freeze: { path: epoch.freeze.path, sha256: epoch.freeze.sha256 },
      universe: { path: epoch.universe.path, sha256: epoch.universe.sha256 },
    },
    conditional,
    optional: { approved, notApproved },
    groups: selected.map(({ group, origin }) => ({ key: groupKey(group), origin })),
    declaredRows,
    comparatorCells: groups
      .filter((g) => g.comparator && (g.collection === 'initial' || (g.collection === 'conditional' && activated.has(g.cell))))
      .map((g) => ({ cell: g.cell, from: g.from, to: g.to, rows: g.rows, shard: g.shard })),
  };
}

/**
 * The concrete validation plan `V4-S4` of an activation and the comparator template of exactly its collection (R3-04, RV4-07). The plan
 * holds the activated groups only, each required (`optional: false` whatever its origin: a default run and a default approval cover
 * exactly the declared rows), no comparator row and no `shipped-uncapped` word; its proofs (the four P-1 parity passes) come before its
 * rows, as in `V4-S2`; its last unlocked steps feed T11f's verdict input, the verdicts and the comparator resolution. The template
 * `V4-S4C.template.json` lists the record's comparator cells, never a cell of an unactivated option or of the second validation.
 * @param {ReturnType<typeof expandMatrix>} expansion The expansion the record was made over.
 * @param {ActivationRecord} record
 * @param {PriceOf} priceOf `stepPrice`.
 * @param {{ activationSha256: string, durations?: Record<string, number>, rowSOf?: (group: Group) => number, activationPath?: string }} options
 *   `activationSha256`: `sha256File` of the written record (the template carries it); `durations`: `durationsFromLogs`; `rowSOf`: the
 *   projected seconds of a row (default: `projectedRowS` of the cell's MP12b1 median and the identity factor, as `compile`);
 *   `activationPath`: the record's repository path (default: the real one).
 * @returns {{ plan: ReturnType<typeof planOf>, template: { task: string, generatedBy: string, template: true, runnable: false,
 *   activationSha256: string, cells: Record<string, any>[] } }}
 */
export function activationPlans(expansion, record, priceOf, { activationSha256, durations = {}, rowSOf, activationPath = ACTIVATION_FILE }) {
  if (record?.format !== ACTIVATION_FORMAT || !Array.isArray(record.groups) || !Array.isArray(record.comparatorCells)) {
    throw new TypeError('manifest: not an activation record');
  }
  if (typeof activationSha256 !== 'string' || !SHA_256.test(activationSha256)) {
    throw new TypeError('manifest: the template needs the SHA-256 of the activation record');
  }
  const rowSFor = rowSOf ?? defaultRowSOf();
  const byKey = new Map(expansion.groups.map((g) => [groupKey(g), g]));
  /** @param {string} key @returns {Group} */
  const groupOf = (key) => {
    const found = byKey.get(key);
    if (found === undefined) {
      throw new Error(`manifest: the activation names ${key}, which the matrix has no group for`);
    }
    return found;
  };
  const selected = record.groups.map(({ key, origin }) => {
    const group = groupOf(key);
    if (group.comparator || group.collection !== origin) {
      throw new Error(`manifest: the activation lists ${key} as ${origin}, the matrix has it in ${group.comparator ? 'a comparator group' : group.collection}`);
    }
    return group;
  });
  if (selected.length === 0) {
    throw new Error('manifest: an activation without a group has no plan');
  }
  const plan = TASKS.first;
  const parityTask = `${plan}P`;
  const prerequisites = /** @type {Prerequisite[]} */ ([
    ...STAGE4_ARMS.map((id) => ({ type: 'variant', id })),
    { type: 'file', path: record.epoch.freeze.path },
    { type: 'file', path: activationPath },
    { type: 'accepted', path: STAGE1_BINDING, current: [] },
    { type: 'accepted', path: P0_BINDING, current: ['v4'] },
    { type: 'accepted', path: LIVE_BINDING, current: ['fr-frozen', 'fr-frozen-none'], kind: 'live-deadline', fields: 'LIVE_DEADLINE_FIELDS' },
  ]);
  const parity = STAGE4_ARMS.flatMap((arm) => parityPass(parityTask, arm, priceOf, durations));
  const rows = selected.map((group) => rowStep({ ...group, optional: false }, priceOf, rowSFor(group)));
  const arms = [...new Set(selected.map((g) => g.arm))];
  const publishes = arms.map((arm) => publishStep(plan, arm, rows.filter((s) => s.node[s.node.indexOf('--arm') + 1] === arm)));
  const verdictInput = unlockedStep('verdict-input', [`${IG}manifest.mjs`, 'verdict-input', '--purpose', 'selection', '--activation', activationPath,
    '--out', VERDICT_MANIFEST.replaceAll('/', '\\')], {
    dependsOn: [...publishes.map((s) => s.id), ...STAGE4_ARMS.map((arm) => `accept-${arm}`)],
    consumes: [activationPath, record.epoch.freeze.path, STAGE1_BINDING, P0_BINDING, LIVE_BINDING,
      ...STAGE4_ARMS.map((arm) => `${EVIDENCE}/${parityTask}/parity-${arm}.accepted.json`), ...publishes.flatMap((s) => s.produces)],
    produces: [VERDICT_MANIFEST],
    expect: `the selection verdict manifest ${VERDICT_MANIFEST} is written (T11f)`,
  });
  const verdicts = unlockedStep('verdicts', [`${IG}verdicts.mjs`, '--manifest', VERDICT_MANIFEST.replaceAll('/', '\\')], {
    dependsOn: ['verdict-input'], consumes: [VERDICT_MANIFEST], produces: [SELECTION_FILE],
    expect: `verdicts: wrote ${SELECTION_FILE} (the class-selection receipt)`,
  });
  const resolve = unlockedStep('resolve-comparators', [`${IG}manifest.mjs`, 'resolve-comparators', '--selection', SELECTION_FILE, '--activation', activationPath,
    '--out', COMPARATOR_PLAN.replaceAll('/', '\\')], {
    dependsOn: ['verdicts'], consumes: [SELECTION_FILE, activationPath], produces: [COMPARATOR_PLAN],
    expect: `the plan ${COMPARATOR_PLAN} is written from a final selection (T11f)`,
  });
  const steps = [
    gateStep(plan, prerequisites), firewallSnapshotStep(plan), treesStep(STAGE4_TREES), ...parity, ...rows, ...publishes, verdictInput, verdicts, resolve,
    firewallCheckStep(plan),
  ];
  const ids = steps.map((s) => s.id);
  const again = ids.find((id, i) => ids.indexOf(id) !== i);
  if (again !== undefined) {
    throw new Error(`manifest: ${plan} repeats the step ${again}`);
  }

  const cells = record.comparatorCells.map(({ cell, from, to, rows: count, shard }) => {
    const group = groupOf(groupKey({ task: TASKS.firstComparator, arm: COMPARATOR_ARM, shard, from, to }));
    if (!group.comparator || group.cell !== cell || group.rows !== count) {
      throw new Error(`manifest: the comparator cell ${cell} (${shard}) is not a comparator group of the matrix`);
    }
    const price = { type: /** @type {const} */ ('rows'), rows: group.rows, rowS: rowSFor(group), rowLimitS: group.rowLimitS };
    pricedOf(priceOf, price, group.id);
    return { cell, from, to, rows: count, rowLimitS: group.rowLimitS, shard, candidates: [...COMPARATOR_CANDIDATES], price };
  });
  return {
    plan: planOf({ task: plan, generatedBy: ACTIVATE_GENERATED_BY, runnable: true, blockedBy: [], prerequisites, steps }),
    template: { task: TASKS.firstComparator, generatedBy: ACTIVATE_GENERATED_BY, template: true, runnable: false, activationSha256, cells },
  };
}

/**
 * @param {string} dir The published pilot runs of stage 2, `<dir>/*.runs.json` (`{ meta, shard, rows }`).
 * @param {MatrixData} data
 * @returns {Record<string, unknown[]>} For each conditional board, the `run` of every row of that case with a pilot rep (`reps.pilot`);
 *   none when the folder does not exist. A row published twice throws: three valid requests are three distinct reps.
 */
function readPilots(dir, data) {
  const [from, to] = repsOf(data, 'pilot');
  /** @type {Record<string, unknown[]>} */
  const pilots = Object.fromEntries(cellList(data.cells.hell1Conditional, 'cells.hell1Conditional').map((cell) => [cell, []]));
  if (!existsSync(dir)) {
    return pilots;
  }
  /** @type {Set<string>} */
  const seen = new Set();
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
    const doc = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    if (!Array.isArray(doc?.rows)) {
      throw new Error(`manifest: ${name} has no list of rows`);
    }
    for (const row of doc.rows) {
      if (!Object.hasOwn(pilots, row?.caseId) || !Number.isInteger(row.rep) || row.rep < from || row.rep > to) {
        continue;
      }
      const key = rowKey(row.caseId, row.rep);
      if (seen.has(key)) {
        throw new Error(`manifest: the pilot row ${key} is published twice`);
      }
      seen.add(key);
      pilots[row.caseId].push(row.run);
    }
  }
  return pilots;
}

/**
 * @param {string} dir The evidence folder of the validation, `<dir>/<arm>/*.runs.json`.
 * @param {(note: string) => void} note Told of a file whose rows are not counted.
 * @returns {string[]} `<arm>/<rowKey>` of every row of every runs file (the arm is the folder). A file that is not JSON or holds no list
 *   of rows counts nothing, as the verdict tool reads it (T09e: such a file is no publication); no folder, no row.
 */
function publishedRows(dir, note) {
  /** @type {string[]} */
  const published = [];
  if (!existsSync(dir)) {
    return published;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    for (const name of readdirSync(join(dir, entry.name)).filter((n) => n.endsWith('.runs.json')).sort()) {
      const file = join(dir, entry.name, name);
      /** @type {any} */
      let doc = null;
      try {
        doc = JSON.parse(readFileSync(file, 'utf8'));
      } catch {
        doc = null;
      }
      if (!Array.isArray(doc?.rows)) {
        note(`${rel(file)} is not a runs file: its rows are not published`);
        continue;
      }
      for (const row of doc.rows) {
        if (typeof row?.rowKey === 'string') {
          published.push(`${entry.name}/${row.rowKey}`);
        }
      }
    }
  }
  return published;
}

/** @typedef {{ activation: string, plan: string, template: string, universe: string, freeze: string, data: string, pilots: string }} ActivatePaths */
/** @typedef {{ activation: string, closure: string, runs: string }} ClosePaths */

/** The real files of `activate` (absolute): the record, the plan and the template it writes; the universe, the freeze file and the matrix data it hashes; the pilots it reads. */
const ACTIVATE_PATHS = Object.freeze({
  activation: evidenceDir('frozen', TASKS.first, 'activation.json'),
  plan: join(IG_DIR, 'plans', `${TASKS.first}.json`),
  template: join(IG_DIR, 'plans', `${TASKS.firstComparator}.template.json`),
  universe: join(IG_DIR, 'plans', `${TASKS.first}.universe.json`),
  freeze: evidenceDir('frozen', 'V4-S3', 'freeze.json'),
  data: join(IG_DIR, 'data', 'frozen-round-v1.json'),
  pilots: evidenceDir('frozen', TASKS.stage2, 'fr-base'),
});
/** The real files of `close` (absolute): the activation record, the closure it writes and the folder of the published runs. */
const CLOSE_PATHS = Object.freeze({
  activation: evidenceDir('frozen', TASKS.first, 'activation.json'),
  closure: evidenceDir('frozen', TASKS.first, 'closure.json'),
  runs: evidenceDir('frozen', TASKS.first),
});

/** @param {string} file @returns {{ path: string, sha256: string }} The repository path of a file and its SHA-256 (`sha256File`, LF-normalised text). */
const refOf = (file) => ({ path: rel(file), sha256: sha256File(file) });

/**
 * `activate --collection initial [--approve-optional <ids>] --label frozen --source-label <SL>` (V4-T11e): the data-only activation of
 * the initial collection. It reads the pilots of the conditional boards (`V4-S2/fr-base/*.runs.json`), hashes the data, the freeze file
 * and the universe, writes the activation record once, then `plans/V4-S4.json` and `plans/V4-S4C.template.json`, and prints what the
 * owner decides on. It runs nothing and measures nothing. Everything is built before any file is written, and the freeze file's classes
 * must name exactly the record's comparator cells, each in one class (V4-T11f: `manifest: the freeze file's classes do not match ...`).
 * @param {string[]} argv
 * @param {ActivatePaths} [paths] The files (a case passes scratch ones).
 * @returns {Promise<number>} 0 once the three files are written; 1 for a refused command (nothing written).
 */
export async function activateCommand(argv, paths = ACTIVATE_PATHS) {
  try {
    const { args } = parseArgs(argv, { values: ['collection', 'approve-optional', 'label', 'source-label'] });
    if (args.label !== 'frozen') {
      return refuse('--label frozen only');
    }
    if (existsSync(paths.activation)) {
      return refuse('activation exists: an activation is never rewritten');
    }
    if (args.collection === undefined) {
      return refuse('activate needs --collection initial');
    }
    if (args.collection !== 'initial') {
      return refuse('only the initial collection is activated here; the second is N-V4-04\'s');
    }
    for (const [what, file] of [['freeze file', paths.freeze], ['universe', paths.universe]]) {
      if (!existsSync(file)) {
        return refuse(`no ${what} ${rel(file)}`);
      }
    }
    for (const file of [paths.plan, paths.template]) {
      if (existsSync(file)) {
        return refuse(`${rel(file)} exists: a plan is never rewritten`);
      }
    }
    const data = matrixData(paths.data);
    const expansion = expandMatrix(data, { controls: controlsFrom(mp12b1Report, data.cells.failingNightmare) });
    const approvedOptional = (args['approve-optional'] ?? '').split(',').map((id) => id.trim()).filter((id) => id !== '');
    const record = {
      ...activation(expansion, {
        pilots: readPilots(paths.pilots, data), approvedOptional,
        epoch: { data: refOf(paths.data), freeze: refOf(paths.freeze), universe: refOf(paths.universe) },
      }),
      createdAt: new Date().toISOString(),
    };
    const options = { durations: durationsFromLogs(), rowSOf: defaultRowSOf(), activationPath: rel(paths.activation) };
    // The plan is built before anything is written, with a placeholder hash, so that an inadmissible step leaves no record.
    activationPlans(expansion, record, stepPrice, { ...options, activationSha256: '0'.repeat(64) });
    // Every comparator cell needs a class, and a class cell that stage 4 does not measure would leave its class inconclusive (V4-T11f, R3-04).
    const mismatch = freezeMismatch(readFreeze(record, () => readFileSync(paths.freeze, 'utf8')), record.comparatorCells.map((c) => c.cell));
    if (mismatch.length > 0) {
      return refuse(`the freeze file's classes do not match the comparator cells of the collection (${mismatch.join('; ')})`);
    }
    writeJson(paths.activation, record);
    const { plan, template } = activationPlans(expansion, record, stepPrice, { ...options, activationSha256: sha256File(paths.activation) });
    writeJson(paths.plan, plan);
    writeJson(paths.template, template);
    for (const file of [paths.activation, paths.plan, paths.template]) {
      process.stderr.write(`activate: wrote ${rel(file)}\n`);
    }
    for (const board of record.conditional.filter((c) => c.pilotRuns === 0)) {
      process.stderr.write(`activate: note: no pilot run of ${board.cell} is published under ${rel(paths.pilots)}; the board is not activated\n`);
    }
    process.stdout.write(`${[
      `activation: ${record.groups.length} groups, ${record.declaredRows.length} declared rows, ${record.comparatorCells.length} comparator cells`,
      ...record.conditional.map((c) => `conditional ${c.cell}: ${c.activated} (${c.reachingTen} of ${c.valid} valid)`),
      `optional approved ${record.optional.approved.join(', ') || 'none'}`,
    ].join('; ')}\n`);
    process.stdout.write(`${plan.task}: allocation ${plan.allocationMinutes} min, optional ${plan.optionalMinutes} min; ask the owner with approval --plan ${plan.task} before any run\n`);
    return 0;
  } catch (e) {
    return refuse((e instanceof Error ? e.message : String(e)).replace(/^manifest: /, ''));
  }
}

/**
 * `close --collection initial --reason <text> --label frozen --source-label <SL>` (V4-T11e): declares the initial collection closed at its
 * recorded ceiling, on the owner's instruction (check-list 3.4). `published` is `<arm>/<rowKey>` of every row of
 * `V4-S4/<arm>/*.runs.json`; `missing` the declared rows of the activation record not in it, in their order; the closure is written once.
 * @param {string[]} argv
 * @param {ClosePaths} [paths] The files (a case passes scratch ones).
 * @returns {Promise<number>} 0 once the closure is written; 1 for a refused command (nothing written), `nothing to close` included.
 */
export async function closeCommand(argv, paths = CLOSE_PATHS) {
  try {
    const { args } = parseArgs(argv, { values: ['collection', 'reason', 'label', 'source-label'] });
    if (args.label !== 'frozen') {
      return refuse('--label frozen only');
    }
    if (args.collection === undefined) {
      return refuse('close needs --collection initial');
    }
    if (args.collection !== 'initial') {
      return refuse('only the initial collection is closed here; the second is N-V4-04\'s');
    }
    if (typeof args.reason !== 'string' || args.reason.trim() === '') {
      return refuse('close needs --reason <text>');
    }
    if (existsSync(paths.closure)) {
      return refuse('closure exists: a closure is never rewritten');
    }
    if (!existsSync(paths.activation)) {
      return refuse(`no activation record ${rel(paths.activation)}`);
    }
    /** @type {any} */
    let record = null;
    try {
      record = JSON.parse(readFileSync(paths.activation, 'utf8'));
    } catch {
      record = null;
    }
    if (record?.format !== ACTIVATION_FORMAT || !Array.isArray(record.declaredRows) || record.declaredRows.some((/** @type {unknown} */ r) => typeof r !== 'string')) {
      return refuse(`${rel(paths.activation)} is not an activation record`);
    }
    const published = new Set(publishedRows(paths.runs, (note) => process.stderr.write(`close: ${note}\n`)));
    const missing = record.declaredRows.filter((/** @type {string} */ row) => !published.has(row));
    if (missing.length === 0) {
      return refuse('nothing to close');
    }
    writeJson(paths.closure, {
      format: CLOSURE_FORMAT, version: 1, collection: 'initial', activation: refOf(paths.activation), missing, reason: args.reason, createdAt: new Date().toISOString(),
    });
    process.stdout.write(`closure: ${missing.length} missing rows\n`);
    return 0;
  } catch (e) {
    return refuse((e instanceof Error ? e.message : String(e)).replace(/^manifest: /, ''));
  }
}

// ---- Comparators and verdict inputs (V4-T11f) ----
// The comparator of a cell is the uncapped twin of the arm its class ships, so it is chosen only from a final class selection of the same
// collection (R2-11 steps 5 and 6, R3-03, R3-04, RV3-06). `selectionExpectation` is the expectation of that receipt, built apart from it
// from the records the resolver reads itself; `resolveComparators` turns the comparator template of T11e into the plan `V4-S4C`;
// `verdictInput` writes the selection manifest (its phase-0 line can never pass, T09d) and the final manifest (every expected P5 pair and
// the selection it rests on) in the schema of T09a for the verdict tool of T09e. All of it reads records and writes data (unlocked):
// nothing here runs a plan, a rating, a pool or a measurement.

const RESOLVE_GENERATED_BY = 'manifest.mjs resolve-comparators';
const COMPARATOR_TEMPLATE = `tools/ig-proto/plans/${TASKS.firstComparator}.template.json`;
const FINAL_VERDICT_TASK = 'V4-S4F';
const FINAL_VERDICT_MANIFEST = `tools/ig-proto/plans/verdicts/${FINAL_VERDICT_TASK}.verdict-manifest.json`;
/** The uncapped comparator of each arm a class can ship (RV3-04): the twin with the same settings but no call budget, no bound and no live deadline. */
const COMPARATOR_OF = Object.freeze({ 'fr-frozen': 'fr-frozen-uncapped', 'fr-frozen-none': 'fr-frozen-none-uncapped' });
/** The cap of a request's T10 and the response bound (D-V4-16), both 120 s. */
const RESPONSE_CAP_MS = 120000;
/** The post-hoc projection of the deadline (D-V4-08): the two twins, the reserve shares and the 115-s generation stop. */
const PROJECTED_ARMS = Object.freeze(['fr-frozen', 'fr-frozen-none']);
const PROJECTION_RESERVES = Object.freeze([0.3, 0.4, 0.5]);
const PROJECTION_DEADLINE_MS = 115000;

/** @typedef {{ path: string, sha256: string }} FileRef */
/** @typedef {{ id: string, cells: string[], screen: string, noScreen: string }} FreezeClass */
/** @typedef {{ task: string, arm: string, variant: string }} ArmRuns */
/** @typedef {(arm: ArmRuns) => { tree: any, files: FileRef[] } | null} PublishedRuns */

/** @param {unknown} value @returns {value is string[]} */
const isStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

/** @param {string} path A path as a command received it. @returns {string} Repository-relative with `/` (a worktree path or a path with backslashes is converted). */
const repoPath = (path) => (isAbsolute(path) ? rel(path) : path.replaceAll('\\', '/'));

/** @param {string} folder Repository-relative. @returns {string[]} The names of the files in the folder, sorted; none when it does not exist. */
function listRepoFolder(folder) {
  const dir = abs(folder);
  return existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort() : [];
}

/** @param {{ node: string[] }} step @param {string} flag @returns {string | undefined} The word after the flag in the step's argv. */
const argOf = (step, flag) => {
  const at = step.node.indexOf(flag);
  return at < 0 ? undefined : step.node[at + 1];
};

/** @param {unknown} e @returns {string} The message of a thrown value without the prefix of the module that threw it. */
const messageOf = (e) => (e instanceof Error ? e.message : String(e)).replace(/^(manifest|resolve|resolve-comparators|verdict-input): /, '');

/** @param {string} command @param {string} reason @returns {1} 1, after `<command>: <reason>` on stderr. */
function refuseCommand(command, reason) {
  process.stderr.write(`${command}: ${reason}\n`);
  return 1;
}

/**
 * The closure record of a collection: `closure.json` beside the activation record (T11e's `close` writes it there; the plans name no
 * closure argument). A closure is read only through its own activation (RV3-04).
 * @param {string} activationPath Repository-relative path of the activation record.
 * @param {string} activationSha256 `sha256File` of the activation record.
 * @param {{ readFile?: (path: string) => string | null }} [io] The text of a repository-relative file, `null` when absent (default `readRepoFile`).
 * @returns {{ ref: FileRef, record: { missing: string[], activation: { sha256: string } } & Record<string, any> } | null} `null` when there is
 *   no `closure.json`. A text that is not an object with a list of strings `missing` throws `an unreadable closure exists: <path>`, and a
 *   record whose `activation.sha256` is not `activationSha256` throws `the closure belongs to another activation: <path>`.
 */
export function closureOf(activationPath, activationSha256, { readFile = readRepoFile } = {}) {
  const folder = repoPath(activationPath).split('/').slice(0, -1);
  const path = [...folder, 'closure.json'].join('/');
  const text = readFile(path);
  if (text === null) {
    return null;
  }
  /** @type {any} */
  let record = null;
  try {
    record = JSON.parse(text);
  } catch {
    record = null;
  }
  if (typeof record !== 'object' || record === null || Array.isArray(record) || !isStrings(record.missing)) {
    throw new Error(`an unreadable closure exists: ${path}`);
  }
  if (record.activation?.sha256 !== activationSha256) {
    throw new Error(`the closure belongs to another activation: ${path}`);
  }
  return { ref: { path, sha256: sha256Text(text) }, record };
}

/**
 * The published runs of one arm of a collection: every `*.runs.json` of `docs/improve-generating/evidence/frozen/<task>/<arm>/` with its
 * SHA-256, and the tree the runs files carry (`meta.trees.<variant>`, which every file that has one must carry alike: two different
 * values throw `<who>: two trees in the runs of <arm>`). A file that is not JSON or carries no tree is listed and gives no identity:
 * the verdict tool judges its rows invalid (T09e `stale tree`, `unreadable evidence`).
 * @param {ArmRuns} arm
 * @param {{ readFile?: (path: string) => string | null, list?: (folder: string) => string[], who: string }} io `list` gives the names of the
 *   files of a repository-relative folder (default: the repository's); `who` prefixes a thrown message.
 * @returns {{ tree: any, files: FileRef[] } | null} `null` when the arm has no runs file or none carries its tree.
 */
export function publishedRuns({ task, arm, variant }, { readFile = readRepoFile, list = listRepoFolder, who }) {
  const folder = `${EVIDENCE}/${task}/${arm}`;
  /** @type {FileRef[]} */
  const files = [];
  /** @type {any} */
  let tree = null;
  for (const name of list(folder).filter((n) => n.endsWith('.runs.json'))) {
    const path = `${folder}/${name}`;
    const text = readFile(path);
    if (text === null) {
      throw new Error(`${who}: ${path} cannot be read`);
    }
    files.push({ path, sha256: sha256Text(text) });
    /** @type {any} */
    let found = null;
    try {
      found = JSON.parse(text)?.meta?.trees?.[variant] ?? null;
    } catch {
      found = null;
    }
    if (typeof found?.treeId !== 'string' || found.treeId === '') {
      continue;
    }
    if (tree !== null && !isDeepStrictEqual(tree, found)) {
      throw new Error(`${who}: two trees in the runs of ${arm}`);
    }
    tree ??= found;
  }
  return files.length === 0 || tree === null ? null : { tree, files };
}

/**
 * @param {string} path @param {(path: string) => string | null} readFile
 * @returns {{ activation: any, sha256: string }} The activation record at `path` and its SHA-256; a missing file or another format throws.
 */
function readActivation(path, readFile) {
  const text = readFile(path);
  if (text === null) {
    throw new Error(`no activation record ${path}`);
  }
  /** @type {any} */
  let record = null;
  try {
    record = JSON.parse(text);
  } catch {
    record = null;
  }
  if (record?.format !== ACTIVATION_FORMAT || !isStrings(record.declaredRows)) {
    throw new Error(`${path} is not an activation record`);
  }
  return { activation: record, sha256: sha256Text(text) };
}

/** @param {any} activation @param {(path: string) => string | null} readFile @returns {{ classes: FreezeClass[] }} The freeze file `epoch.freeze` names. */
function readFreeze(activation, readFile) {
  const path = activation.epoch?.freeze?.path;
  if (typeof path !== 'string' || path === '') {
    throw new Error('the activation record names no freeze file (epoch.freeze)');
  }
  const text = readFile(path);
  if (text === null) {
    throw new Error(`no freeze file ${path}`);
  }
  /** @type {any} */
  let freeze = null;
  try {
    freeze = JSON.parse(text);
  } catch {
    freeze = null;
  }
  if (!Array.isArray(freeze?.classes) || !freeze.classes.every((/** @type {any} */ c) => typeof c?.id === 'string' && isStrings(c.cells) && typeof c.screen === 'string' && typeof c.noScreen === 'string')) {
    throw new Error(`${path} is not a freeze file: its classes must be [{ id, cells, screen, noScreen }]`);
  }
  return freeze;
}

/** @param {{ classes: FreezeClass[] }} freeze @returns {string[]} The distinct screen and no-screen arms of the classes, sorted. */
const classArmsOf = (freeze) => [...new Set(freeze.classes.flatMap((c) => [c.screen, c.noScreen]))].sort();

/**
 * How the cells of the freeze file's classes differ from the comparator cells of a collection (V4-T11f step 5): every comparator cell is in
 * exactly one class, and every class cell is a comparator cell. A cell listed twice, in one class or in two, is in more than one class
 * (T09e refuses a manifest that lists a cell twice).
 * @param {{ classes: FreezeClass[] }} freeze
 * @param {string[]} comparatorCells The cells of the activation record's `comparatorCells`, in its order.
 * @returns {string[]} The parts of the refusal, in this order and only when not empty: `not in a class <cells>` (comparator cells of no
 *   class, in the record's order), `in more than one class <cells>` (comparator cells, in the record's order) and `not measured <cells>`
 *   (class cells that are no comparator cell, sorted); each list is joined by `, `.
 */
function freezeMismatch(freeze, comparatorCells) {
  /** @type {Map<string, number>} */
  const count = new Map();
  for (const { cells } of freeze.classes) {
    for (const cell of cells) {
      count.set(cell, (count.get(cell) ?? 0) + 1);
    }
  }
  const none = comparatorCells.filter((cell) => !count.has(cell));
  const several = comparatorCells.filter((cell) => (count.get(cell) ?? 0) > 1);
  const unmeasured = [...count.keys()].filter((cell) => !comparatorCells.includes(cell)).sort();
  return [
    ...(none.length > 0 ? [`not in a class ${none.join(', ')}`] : []),
    ...(several.length > 0 ? [`in more than one class ${several.join(', ')}`] : []),
    ...(unmeasured.length > 0 ? [`not measured ${unmeasured.join(', ')}`] : []),
  ];
}

/**
 * The expectation of the class-selection receipt of a collection (RV3-06, D-V4-18), built apart from the receipt from the records the resolver
 * reads itself: the frozen source, today's harness (the selection is written by `verdicts.mjs` in the same plan, T09e), the class arms of the
 * freeze file with the tree id and the parameter hash of their published runs files, the declared rows less the closed ones, and the
 * collection (the activation's and the closure's SHA-256 and the closed rows).
 * @param {{ activation: { declaredRows: string[] }, activationSha256: string, closure?: { missing: string[] } | null, closureSha256?: string | null,
 *   freeze: { classes: FreezeClass[] }, runsMeta: Record<string, any>, harnessHash: string }} input `runsMeta[id]` is `meta.trees.<variant>` of the
 *   arm's published runs files, `{ treeId, params }`: one value (`publishedRuns` checks the files) or the list of the files' values, which must
 *   be equal (two different values throw `resolve: two trees in the runs of <arm>`).
 * @returns {import('./lib/proof.mjs').ProofExpectation}
 */
export function selectionExpectation({ activation, activationSha256, closure, closureSha256, freeze, runsMeta, harnessHash }) {
  if (!isStrings(activation?.declaredRows) || !SHA_256.test(activationSha256) || !Array.isArray(freeze?.classes)) {
    throw new TypeError('manifest: selectionExpectation needs the activation record, its SHA-256 and the freeze file');
  }
  if (closure != null && (!isStrings(closure.missing) || !SHA_256.test(String(closureSha256)))) {
    throw new TypeError('manifest: a closure needs the list of its missing rows and its SHA-256');
  }
  const closed = closure?.missing ?? [];
  const arms = classArmsOf(freeze).map((id) => {
    // One tree, or the trees of every runs file of the arm: they must be the same.
    const found = runsMeta?.[id];
    const values = Array.isArray(found) ? found : [found];
    const tree = values[0];
    if (values.some((value) => !isDeepStrictEqual(value, tree))) {
      throw new Error(`resolve: two trees in the runs of ${id}`);
    }
    if (typeof tree?.treeId !== 'string' || tree.treeId === '' || typeof tree.params !== 'object' || tree.params === null) {
      throw new Error(`resolve: the runs of ${id} carry no tree identity`);
    }
    return { id, treeId: tree.treeId, paramsHash: sha256(JSON.stringify(tree.params)) };
  });
  return {
    kind: 'class-selection',
    source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
    harnessHash,
    arms,
    coverage: { expected: activation.declaredRows.filter((row) => !closed.includes(row)) },
    fields: { collection: { activationSha256, closureSha256: closureSha256 ?? null, missing: [...closed] } },
  };
}

/**
 * Reads the records of one activation and builds the expectation of its class selection (`selectionExpectation`).
 * @param {string} activationPath Repository-relative path of the activation record.
 * @param {{ readFile?: (path: string) => string | null, list?: (folder: string) => string[], harnessHash?: string }} [io] Default: the
 *   repository and today's harness (`harnessInfo`).
 * @returns {{ activation: any, activationSha256: string, closure: ReturnType<typeof closureOf>, freeze: { classes: FreezeClass[] },
 *   expectation: import('./lib/proof.mjs').ProofExpectation }}
 */
export function selectionInputs(activationPath, { readFile = readRepoFile, list = listRepoFolder, harnessHash } = {}) {
  const path = repoPath(activationPath);
  const { activation, sha256: activationSha256 } = readActivation(path, readFile);
  const closure = closureOf(path, activationSha256, { readFile });
  const freeze = readFreeze(activation, readFile);
  const data = matrixData();
  /** @type {Record<string, any>} */
  const runsMeta = {};
  for (const id of classArmsOf(freeze)) {
    const found = publishedRuns({ task: TASKS.first, arm: id, variant: data.arms[id]?.variant ?? id }, { readFile, list, who: 'resolve' });
    if (found === null) {
      throw new Error(`resolve: no published runs of ${id}`);
    }
    runsMeta[id] = found.tree;
  }
  const expectation = selectionExpectation({
    activation, activationSha256, closure: closure?.record ?? null, closureSha256: closure?.ref.sha256 ?? null, freeze, runsMeta,
    harnessHash: harnessHash ?? harnessInfo().harnessHash,
  });
  return { activation, activationSha256, closure, freeze, expectation };
}

/**
 * The `selection` prerequisite of a plan (`checkPrerequisites`): the receipt at `path` passes `proofCheck` against the expectation of
 * the activation record at `activation`. Every problem, a thrown one included, is a reason `selection: <reason>`.
 * @param {{ path: string, activation: string }} entry
 * @param {{ readFile?: (path: string) => string | null, list?: (folder: string) => string[], harnessHash?: string }} io
 * @returns {string[]}
 */
function selectionProblems({ path, activation }, { readFile = readRepoFile, list = listRepoFolder, harnessHash }) {
  try {
    const text = readFile(path);
    if (text === null) {
      return [`selection: missing ${path}`];
    }
    /** @type {any} */
    let receipt = null;
    try {
      receipt = JSON.parse(text);
    } catch {
      return [`selection: ${path} is not JSON`];
    }
    const { expectation } = selectionInputs(activation, { readFile, list, harnessHash });
    const checked = proofCheck(receipt, expectation, readFile);
    return checked.status === 'pass' ? [] : checked.reasons.map((reason) => `selection: ${reason}`);
  } catch (e) {
    return [`selection: ${messageOf(e)}`];
  }
}

/**
 * Resolves the comparator template of an activation into the concrete plan `V4-S4C` (R2-11 step 5, R3-04): per template cell the uncapped
 * twin of the arm the selection ships there (`fr-frozen` gives `fr-frozen-uncapped`, `fr-frozen-none` gives `fr-frozen-none-uncapped`). It reads
 * only a final selection of the same activation: an interim report is never a selection.
 * @param {any} template `V4-S4C.template.json` (T11e).
 * @param {any} selection The class-selection receipt (`class-selection.json`, T09e).
 * @param {import('./lib/proof.mjs').ProofExpectation} expectation `selectionExpectation` of the records of the same activation.
 * @param {{ readFile?: (path: string) => string | null, priceOf?: PriceOf, selectionPath?: string, activationPath?: string }} [io] `readFile`:
 *   the evidence files of the receipt (default `readRepoFile`); `priceOf`: `stepPrice`; the paths are those the plan names in its steps and
 *   prerequisites (default: the real ones).
 * @returns {ReturnType<typeof planOf>} The plan. A template that is not `V4-S4C`'s (`not a V4-S4C template`), one of another activation
 *   (`the template belongs to another activation`), a selection that does not pass `proofCheck` (`the selection is not final (<reasons>)`)
 *   and a cell the selection does not ship an arm for (`no shipped arm for <cell>`) throw.
 */
export function resolveComparators(template, selection, expectation, { readFile = readRepoFile, priceOf = stepPrice, selectionPath = SELECTION_FILE, activationPath = ACTIVATION_FILE } = {}) {
  const task = TASKS.firstComparator;
  if (template?.task !== task || !Array.isArray(template.cells)) {
    throw new Error(`not a ${task} template`);
  }
  if (template.activationSha256 !== expectation?.fields?.collection?.activationSha256) {
    throw new Error('the template belongs to another activation');
  }
  const checked = proofCheck(selection, expectation, readFile);
  if (checked.status !== 'pass') {
    throw new Error(`the selection is not final (${checked.reasons.join('; ')})`);
  }
  const shipped = selection.selection?.cells;
  /** @type {string[]} */
  const resolved = template.cells.map((/** @type {{ cell: string }} */ { cell }) => {
    const arm = typeof shipped === 'object' && shipped !== null && Object.hasOwn(shipped, cell) ? shipped[cell]?.shipped : undefined;
    if (typeof arm !== 'string' || !Object.hasOwn(COMPARATOR_OF, arm)) {
      throw new Error(`no shipped arm for ${cell}`);
    }
    return COMPARATOR_OF[/** @type {keyof typeof COMPARATOR_OF} */ (arm)];
  });
  const variants = [...new Set(resolved)];
  const prerequisites = /** @type {Prerequisite[]} */ ([
    ...variants.map((id) => ({ type: 'variant', id })),
    { type: 'file', path: selectionPath },
    { type: 'selection', path: selectionPath, activation: activationPath },
  ]);
  const rowLimitS = matrixData().rowLimitS.default;
  const rows = template.cells.map((/** @type {any} */ c, /** @type {number} */ i) => rowStep(/** @type {any} */ ({
    task, arm: resolved[i], variant: resolved[i], cell: c.cell, from: c.from, to: c.to, rows: c.rows, shard: c.shard, rowLimitS, optional: false,
  }), priceOf, c.price?.rowS));
  const publishes = variants.map((arm) => publishStep(task, arm, rows.filter((/** @type {Step} */ s) => argOf(s, '--arm') === arm)));
  const manifestFile = FINAL_VERDICT_MANIFEST.replaceAll('/', '\\');
  const verdictFile = `${EVIDENCE}/${FINAL_VERDICT_TASK}/verdicts.json`;
  const steps = [
    gateStep(task, prerequisites),
    firewallSnapshotStep(task),
    treesStep(variants),
    ...rows,
    ...publishes,
    unlockedStep('verdict-input', [`${IG}manifest.mjs`, 'verdict-input', '--purpose', 'final', '--activation', activationPath, '--selection', selectionPath, '--out', manifestFile], {
      dependsOn: publishes.map((s) => s.id),
      consumes: [activationPath, selectionPath, ...publishes.flatMap((s) => s.produces)],
      produces: [FINAL_VERDICT_MANIFEST],
      expect: `the final verdict manifest ${FINAL_VERDICT_MANIFEST} is written`,
    }),
    unlockedStep('verdicts', [`${IG}verdicts.mjs`, '--manifest', manifestFile], {
      dependsOn: ['verdict-input'], consumes: [FINAL_VERDICT_MANIFEST], produces: [verdictFile, `${EVIDENCE}/${FINAL_VERDICT_TASK}/verdicts.md`],
      expect: `verdicts: wrote ${verdictFile} (the global verdict record)`,
    }),
    firewallCheckStep(task),
  ];
  const ids = steps.map((s) => s.id);
  const again = ids.find((id, i) => ids.indexOf(id) !== i);
  if (again !== undefined) {
    throw new Error(`manifest: ${task} repeats the step ${again}`);
  }
  return planOf({ task, generatedBy: RESOLVE_GENERATED_BY, runnable: true, blockedBy: [], prerequisites, steps });
}

/**
 * `resolve-comparators --selection <receipt> --activation <record> --out <plan> --label frozen --source-label <SL>` (V4-T11f): reads the
 * records of the activation (the record, its closure beside it, the freeze file, the published runs of the class arms and today's harness),
 * the comparator template and the receipt, and writes the plan `V4-S4C`. Every refusal is `resolve-comparators: <reason>` on stderr, exit 1,
 * nothing written; an existing `--out` that is not a plan of this command (`generatedBy`) is never overwritten.
 * @param {string[]} argv
 * @param {{ readFile?: (path: string) => string | null, list?: (folder: string) => string[], harnessHash?: string, template?: string }} [io]
 *   The files (a case passes its own; `template` is the repository path of the template).
 * @returns {Promise<number>} 0 once the plan is written; 1 for a refused command.
 */
export async function resolveComparatorsCommand(argv, { readFile = readRepoFile, list = listRepoFolder, harnessHash, template = COMPARATOR_TEMPLATE } = {}) {
  const command = 'resolve-comparators';
  try {
    const { args } = parseArgs(argv, { values: ['selection', 'activation', 'out', 'label', 'source-label'] });
    if (args.label !== 'frozen') {
      return refuseCommand(command, '--label frozen only');
    }
    for (const name of ['selection', 'activation', 'out']) {
      if (args[name] === undefined) {
        return refuseCommand(command, `needs --${name} <path>`);
      }
    }
    const [selectionPath, activationPath, outPath] = [args.selection, args.activation, args.out].map(repoPath);
    const selectionText = readFile(selectionPath);
    if (selectionText === null) {
      return refuseCommand(command, `no selection receipt ${selectionPath}`);
    }
    /** @type {any} */
    let selection = null;
    try {
      selection = JSON.parse(selectionText);
    } catch {
      return refuseCommand(command, `${selectionPath} is not JSON`);
    }
    const templateText = readFile(template);
    if (templateText === null) {
      return refuseCommand(command, `no template ${template}`);
    }
    /** @type {any} */
    let parsedTemplate = null;
    try {
      parsedTemplate = JSON.parse(templateText);
    } catch {
      return refuseCommand(command, `${template} is not JSON`);
    }
    const { expectation } = selectionInputs(activationPath, { readFile, list, harnessHash });
    const plan = resolveComparators(parsedTemplate, selection, expectation, { readFile, selectionPath, activationPath });
    const out = abs(outPath);
    if (existsSync(out)) {
      /** @type {any} */
      let existing = null;
      try {
        existing = JSON.parse(readFileSync(out, 'utf8'));
      } catch {
        existing = null;
      }
      if (existing?.generatedBy !== RESOLVE_GENERATED_BY) {
        return refuseCommand(command, `${outPath} exists and is not a plan of this command`);
      }
    }
    writeJson(out, plan);
    process.stdout.write(`wrote ${outPath}\n`);
    process.stdout.write(`${command}: ${parsedTemplate.cells.length} cells, ${plan.prerequisites.filter((p) => p.type === 'variant').map((p) => /** @type {any} */ (p).id).join(', ')}; ${plan.task}: allocation ${plan.allocationMinutes} min\n`);
    return 0;
  } catch (e) {
    return refuseCommand(command, messageOf(e));
  }
}

/**
 * The verdict manifest of a stage-4 collection in T09a's schema (`data/verdict-manifest.schema.md`): the `selection` manifest of task `V4-S4`
 * (`p5` is `[]`: the comparators are not resolved yet, so T09d never passes its phase 0) or the `final` manifest of task `V4-S4F`, which
 * names the selection receipt it rests on and declares every expected P5 pair, one per cell of the comparator plan with the reps of its row
 * step. The arms are those of the activation's groups (and, for `final`, the resolved comparator arms), each with its published runs files.
 * @param {'selection' | 'final'} purpose
 * @param {{ activation: ActivationRecord, activationRef: FileRef, closureRef?: FileRef | null, selectionRef?: FileRef, freeze: { classes: FreezeClass[] },
 *   expansion: ReturnType<typeof expandMatrix>, published: PublishedRuns, comparatorPlan?: ReturnType<typeof planOf>, data?: MatrixData }} input
 *   `activationRef`, `closureRef` and `selectionRef` are `{ path, sha256 }` (`sha256File`); `published(arm)` gives the runs files of an arm and
 *   their tree (`publishedRuns`), `null` when the arm has none (`verdict-input: not published <arm>`); `comparatorPlan` is the plan
 *   `resolveComparators` wrote (`final` only); `data` is the matrix data (default: the file's).
 * @returns {Record<string, any>}
 */
export function verdictInput(purpose, { activation, activationRef, closureRef = null, selectionRef, freeze, expansion, published, comparatorPlan, data = matrixData() }) {
  if (purpose !== 'selection' && purpose !== 'final') {
    throw new Error(`verdict-input: purpose must be selection or final, got ${String(purpose)}`);
  }
  if (activation?.format !== ACTIVATION_FORMAT || !Array.isArray(activation.groups) || !Array.isArray(activation.conditional)) {
    throw new TypeError('manifest: verdictInput needs the activation record');
  }
  if (purpose === 'final' && (selectionRef === undefined || selectionRef === null)) {
    throw new Error('verdict-input: a final purpose needs the selection receipt');
  }
  const byKey = new Map(expansion.groups.map((g) => [groupKey(g), g]));
  const selected = activation.groups.map(({ key }) => {
    const group = byKey.get(key);
    if (group === undefined) {
      throw new Error(`verdict-input: the activation names ${key}, which the matrix has no group for`);
    }
    return group;
  });
  /** @type {Map<string, ArmRuns & { id: string }>} */
  const wanted = new Map();
  for (const { task, arm } of selected) {
    const variant = data.arms[arm]?.variant;
    if (typeof variant !== 'string') {
      throw new Error(`verdict-input: no variant for the arm ${arm}`);
    }
    if (!wanted.has(arm)) {
      wanted.set(arm, { id: arm, task, arm, variant });
    }
  }
  /** @type {{ cell: string, bounded: string, uncapped: string, reps: number[] }[]} */
  const p5 = [];
  if (purpose === 'final') {
    if (comparatorPlan?.task !== TASKS.firstComparator || !Array.isArray(comparatorPlan.steps)) {
      throw new Error(`verdict-input: not a ${TASKS.firstComparator} plan`);
    }
    for (const step of comparatorPlan.steps.filter((s) => s.node[0] === `${IG}arm.mjs` && s.node[1] === 'run')) {
      const [task, arm, variant] = ['--task', '--arm', '--variant'].map((flag) => argOf(step, flag));
      const cases = parseCases(String(argOf(step, '--cases')));
      const cell = cases[0]?.caseId;
      const bounded = typeof arm === 'string' ? data.arms[arm]?.comparatorOf : undefined;
      if (typeof task !== 'string' || typeof arm !== 'string' || typeof variant !== 'string' || cell === undefined || cases.some((c) => c.caseId !== cell) || typeof bounded !== 'string') {
        throw new Error(`verdict-input: the step ${step.id} of the comparator plan is not one comparator cell`);
      }
      p5.push({ cell, bounded, uncapped: arm, reps: cases.map((c) => c.rep) });
      if (!wanted.has(arm)) {
        wanted.set(arm, { id: arm, task, arm, variant });
      }
    }
    if (p5.length === 0) {
      throw new Error('verdict-input: the comparator plan has no row step');
    }
  }
  const arms = [...wanted.values()].map((wantedArm) => {
    const found = published(wantedArm);
    if (found === null || found === undefined || !Array.isArray(found.files) || found.files.length === 0 || typeof found.tree?.treeId !== 'string') {
      throw new Error(`verdict-input: not published ${wantedArm.id}`);
    }
    return { ...wantedArm, treeId: found.tree.treeId, files: found.files.map(({ path, sha256: hash }) => ({ path, sha256: hash })) };
  });
  const [validationFrom, validationTo] = repsOf(data, 'validation');
  const [masterFrom, masterTo] = repsOf(data, 'master');
  /** @param {number} from @param {number} to @returns {number[]} */
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  /** @param {string} item @param {string} arm @returns {string[]} The distinct cells of the selected groups of the item and arm. */
  const cellsOf = (item, arm) => [...new Set(selected.filter((g) => g.items.includes(item) && g.arm === arm).map((g) => g.cell))];
  const today = 'log-link';
  return {
    task: purpose === 'final' ? FINAL_VERDICT_TASK : TASKS.first,
    label: 'frozen',
    purpose,
    quantity: QUANTITY,
    capMs: RESPONSE_CAP_MS,
    responseBoundMs: RESPONSE_CAP_MS,
    resampleSeed: data.resampleSeed,
    resamples: data.resamples,
    validationReps: range(validationFrom, validationTo),
    masterReps: range(masterFrom, masterTo),
    collection: { activation: { path: activationRef.path, sha256: activationRef.sha256 }, closure: closureRef === null ? null : { path: closureRef.path, sha256: closureRef.sha256 } },
    ...(purpose === 'final' ? { selection: { path: /** @type {FileRef} */ (selectionRef).path, sha256: /** @type {FileRef} */ (selectionRef).sha256 } } : {}),
    arms,
    classes: freeze.classes.map(({ id, cells, screen, noScreen }) => ({ id, cells: [...cells], screen, noScreen })),
    failingCells: [...data.cells.failingNightmare],
    controls: cellsOf('S4-3', today).map((cell) => ({ cell, today })),
    masters: cellsOf('S4-4', 'fr-frozen').map((cell) => ({ cell, today, after: 'fr-frozen' })),
    hell1: [...data.cells.hell1Validated, ...activation.conditional.filter((c) => c.activated).map((c) => c.cell)],
    p5,
    deadlineProjection: { arms: [...PROJECTED_ARMS], reserves: [...PROJECTION_RESERVES], deadlineMs: PROJECTION_DEADLINE_MS },
    prerequisites: {
      stage1: { binding: STAGE1_BINDING, current: [] },
      parity: [
        ...STAGE4_ARMS.map((arm) => ({ binding: `${EVIDENCE}/${TASKS.first}P/parity-${arm}.accepted.json`, current: [arm] })),
        { binding: P0_BINDING, current: ['v4'] },
      ],
      liveDeadline: { binding: LIVE_BINDING, current: [...PROJECTED_ARMS] },
    },
  };
}

/**
 * `verdict-input --purpose <selection | final> --activation <record> [--selection <receipt>] --out <path> --label frozen --source-label <SL>`
 * (V4-T11f): writes the verdict manifest of `verdictInput` from the records on disk (the activation record, its closure beside it, the freeze
 * file, the published runs files of every arm and, for `final`, the receipt and the comparator plan `plans/V4-S4C.json`). Every refusal is
 * `verdict-input: <reason>` on stderr, exit 1, nothing written.
 * @param {string[]} argv
 * @param {{ readFile?: (path: string) => string | null, list?: (folder: string) => string[], data?: MatrixData,
 *   expansion?: ReturnType<typeof expandMatrix>, comparatorPlan?: string }} [io] The files (a case passes its own; `comparatorPlan` is the
 *   repository path of the plan).
 * @returns {Promise<number>} 0 once the manifest is written; 1 for a refused command.
 */
export async function verdictInputCommand(argv, io = {}) {
  const command = 'verdict-input';
  try {
    const { args } = parseArgs(argv, { values: ['purpose', 'activation', 'selection', 'out', 'label', 'source-label'] });
    if (args.label !== 'frozen') {
      return refuseCommand(command, '--label frozen only');
    }
    if (args.purpose !== 'selection' && args.purpose !== 'final') {
      return refuseCommand(command, 'needs --purpose selection or final');
    }
    for (const name of ['activation', 'out']) {
      if (args[name] === undefined) {
        return refuseCommand(command, `needs --${name} <path>`);
      }
    }
    if (args.purpose === 'final' && args.selection === undefined) {
      return refuseCommand(command, 'a final purpose needs --selection <receipt>');
    }
    if (args.purpose === 'selection' && args.selection !== undefined) {
      return refuseCommand(command, '--selection belongs to the purpose final');
    }
    const readFile = io.readFile ?? readRepoFile;
    const list = io.list ?? listRepoFolder;
    const activationPath = repoPath(args.activation);
    const { activation, sha256: activationSha256 } = readActivation(activationPath, readFile);
    const closure = closureOf(activationPath, activationSha256, { readFile });
    const freeze = readFreeze(activation, readFile);
    /** @type {FileRef | undefined} */
    let selectionRef;
    /** @type {any} */
    let comparatorPlan;
    if (args.purpose === 'final') {
      const selectionPath = repoPath(args.selection);
      const selectionText = readFile(selectionPath);
      if (selectionText === null) {
        return refuseCommand(command, `no selection receipt ${selectionPath}`);
      }
      selectionRef = { path: selectionPath, sha256: sha256Text(selectionText) };
      const planPath = io.comparatorPlan ?? COMPARATOR_PLAN;
      const planText = readFile(planPath);
      if (planText === null) {
        return refuseCommand(command, `no comparator plan ${planPath}`);
      }
      try {
        comparatorPlan = JSON.parse(planText);
      } catch {
        return refuseCommand(command, `${planPath} is not JSON`);
      }
    }
    const data = io.data ?? matrixData();
    const expansion = io.expansion ?? expandMatrix(data, { controls: controlsFrom(mp12b1Report, data.cells.failingNightmare) });
    const manifest = verdictInput(args.purpose, {
      activation, activationRef: { path: activationPath, sha256: activationSha256 }, closureRef: closure?.ref ?? null, selectionRef, freeze, expansion,
      published: (arm) => publishedRuns(arm, { readFile, list, who: command }), comparatorPlan, data,
    });
    const outPath = repoPath(args.out);
    writeJson(abs(outPath), manifest);
    process.stdout.write(`wrote ${outPath}\n`);
    process.stdout.write(`${command}: ${manifest.purpose} ${manifest.task}, ${manifest.arms.length} arms, ${manifest.arms.reduce((sum, a) => sum + a.files.length, 0)} runs files, ${manifest.p5.length} P5 pairs\n`);
    return 0;
  } catch (e) {
    return refuseCommand(command, messageOf(e));
  }
}

/**
 * @param {string[]} argv `compile ...`, `check-prerequisites ...`, `activate ...`, `close ...`, `resolve-comparators ...` or `verdict-input ...`
 * @returns {Promise<number>} The command's exit code.
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  const commands = /** @type {Record<string, (argv: string[]) => Promise<number>>} */ ({
    compile: compileCommand, 'check-prerequisites': checkPrerequisitesCommand, activate: (a) => activateCommand(a), close: (a) => closeCommand(a),
    'resolve-comparators': (a) => resolveComparatorsCommand(a), 'verdict-input': (a) => verdictInputCommand(a),
  });
  if (command === undefined || !Object.hasOwn(commands, command)) {
    return refuse(`unknown command ${command ?? ''} (compile, check-prerequisites, activate, close, resolve-comparators, verdict-input)`);
  }
  try {
    return await commands[command](rest);
  } catch (e) {
    return refuse((e instanceof Error ? e.message : String(e)).replace(/^manifest: /, ''));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
