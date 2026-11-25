// @ts-check
// P5's trigger, coverage and twin assignment (P2-13c; contracts C10 and C11, review-2 R2-01 and R2-06). Pure functions
// over published row lines as `loadSnapshot` gives them (each with its `binding`); nothing here reads a file. A missing
// field is unknown, never zero.

export const PREDICATE_VERSION = 'p2-twins-v1';
/** The eligible rows: 140 bounded rows in stage A and 300 in stage B (C11). */
export const ELIGIBLE = 440;
/** The twins of an overflow group: the 885-s horizon at 260 s each, with the group's 2 s and 45 s of quiet. */
export const TWINS_PER_GROUP = 3;
export const TWIN_LIMIT_S = 260;
const GROUP_FIXED_S = 2 + 45;
const GUARD_FACTOR = 1.25;

/** The trigger reasons, in report order. */
export const REASONS = Object.freeze(['fewer-than-ten', 'no-window', 'bound', 'budget-stop', 'clock-cut']);
const BOUND_REASONS = Object.freeze(['set:no-window-below', 'set:no-window-above']);
const CLOCK_REASONS = Object.freeze(['set:time-limit', 'set:reserve-cut', 'set:response-bound', 'time-limit', 'response-bound']);

const isObject = (/** @type {unknown} */ v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (/** @type {unknown} */ v) => typeof v === 'number' && Number.isFinite(v);
const byText = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @param {{ component?: string, arm?: string, cell?: string }} row
 * @returns {boolean} Whether the row is one of the 440 eligible rows: a shipped `gen-v4` row but the legacy 26x26
 * Nightmare, or a `non-table` sentinel of `gen-v4`.
 */
export function isEligible(row) {
  return row.arm === 'gen-v4' && ((row.component === 'shipped' && row.cell !== '26x26-nightmare') || row.component === 'non-table');
}

/**
 * @typedef {object} Historical What the frozen side of a row gives.
 * @property {boolean} applicable False for a `non-table` sentinel: no historical counterpart by design.
 * @property {Record<string, any> | null} [row] The frozen oracle row (`{ rep, run }`), or null when it is missing.
 * @property {{ f2Sha256?: string | null, f4Sha256?: string | null } | null} [readings] The bound F2 and F4 readings.
 */

/** @param {string | null} reason @returns {string[]} The trigger reasons that a `partialReason` names. */
function partialReasons(reason) {
  /** @type {string[]} */
  const out = [];
  if (reason !== null && BOUND_REASONS.includes(reason)) out.push('bound');
  if (reason !== null && CLOCK_REASONS.includes(reason)) out.push('clock-cut');
  return out;
}

/**
 * Whether a row's request is triggered (C11): any of the five reasons on the production row or on its frozen counterpart.
 * @param {Record<string, any>} row A published row line.
 * @param {Historical} historical An explicit `{ applicable: false }` evaluates production alone; anything else that is not
 * an object with a boolean `applicable` is unknown (`historical`), never production alone.
 * @returns {{ triggered: boolean, reasons: string[], unknown: string[] }}
 */
export function triggered(row, historical) {
  /** @type {Set<string>} */
  const reasons = new Set();
  /** @type {Set<string>} */
  const unknown = new Set();
  const run = row?.run;
  if (!isObject(run)) {
    unknown.add('run');
  } else {
    if (Number.isInteger(run.acceptedCount)) {
      if (run.acceptedCount < 10) reasons.add('fewer-than-ten');
    } else {
      unknown.add('run.acceptedCount');
    }
    if (run.partialReason === null || typeof run.partialReason === 'string') {
      for (const r of partialReasons(run.partialReason)) reasons.add(r);
    } else {
      unknown.add('run.partialReason');
    }
  }

  const telemetry = row?.telemetry;
  if (!isObject(telemetry)) {
    unknown.add('telemetry');
  } else {
    const trail = telemetry.trail;
    if (isObject(trail) && isObject(trail.noWindow) && isNum(trail.noWindow.below) && isNum(trail.noWindow.above)) {
      if (trail.noWindow.below + trail.noWindow.above > 0) reasons.add('no-window');
    } else {
      unknown.add('telemetry.trail.noWindow');
    }
    if (isObject(trail) && typeof trail.boundFired === 'boolean') {
      if (trail.boundFired) reasons.add('bound');
    } else {
      unknown.add('telemetry.trail.boundFired');
    }
    // A stage that did not run reports `null` counters (C6); only an absent field is unknown.
    for (const name of ['setCounters', 'batchCounters']) {
      const counters = telemetry[name];
      if (counters === undefined || (counters !== null && !(isObject(counters) && isNum(counters.budgetStops)))) {
        unknown.add(`telemetry.${name}`);
      } else if (counters !== null && counters.budgetStops > 0) {
        reasons.add('budget-stop');
      }
    }
  }

  const ledger = row?.ledger;
  if (isObject(ledger) && ledger.complete !== true) unknown.add('ledger');
  if (!isObject(ledger) || !Array.isArray(ledger.outcomes)) {
    unknown.add('ledger.outcomes');
  } else {
    for (const outcome of ledger.outcomes) {
      if (outcome?.stage === 'set') {
        if (outcome.igNoWindow === undefined) unknown.add('ledger.outcomes.igNoWindow');
        else if (outcome.igNoWindow !== null) reasons.add('no-window');
      }
      if (outcome?.budgetStop === undefined) unknown.add('ledger.outcomes.budgetStop');
      else if (outcome.budgetStop === true) reasons.add('budget-stop');
    }
  }

  if (!isObject(historical) || typeof historical.applicable !== 'boolean') {
    unknown.add('historical');
  } else if (historical.applicable) {
    const frozen = historical.row?.run;
    if (!isObject(frozen)) {
      unknown.add('historical.row');
    } else {
      if (Number.isInteger(frozen.acceptedCount)) {
        if (frozen.acceptedCount < 10) reasons.add('fewer-than-ten');
      } else {
        unknown.add('historical.acceptedCount');
      }
      if (frozen.partialReason === null || typeof frozen.partialReason === 'string') {
        for (const r of partialReasons(frozen.partialReason)) reasons.add(r);
      } else {
        unknown.add('historical.partialReason');
      }
    }
    // The frozen rows carry no no-window, bound or budget fields: they are settled to zero only by the signed readings.
    if (!(typeof historical.readings?.f2Sha256 === 'string' && typeof historical.readings?.f4Sha256 === 'string')) {
      unknown.add('historical.readings');
    }
  }
  return { triggered: reasons.size > 0, reasons: REASONS.filter((r) => reasons.has(r)), unknown: [...unknown] };
}

/**
 * Whether a row line is a valid observation: it exists, its binding holds, it was not interrupted and it has no errors.
 * A placeholder `{ state: 'interrupted' | 'missing' }` stands for a key without a row line.
 * @param {Record<string, any> | null | undefined} row
 * @returns {string[]} The problems; none means valid.
 */
export function observationProblems(row) {
  if (!isObject(row)) return ['no row line'];
  if (row.state === 'interrupted') return ['interrupted (censored)'];
  if (row.state === 'missing') return ['no row line'];
  if (!isObject(row.binding)) return ['binding not verified'];
  if (row.binding.ok !== true) return [`binding refused: ${(Array.isArray(row.binding.problems) ? row.binding.problems : []).join('; ') || 'no reason'}`];
  /** @type {string[]} */
  const problems = [];
  if (!isObject(row.run)) {
    problems.push('no run');
  } else {
    if (row.run.interrupted !== false) problems.push(row.run.interrupted === true ? 'run interrupted' : 'run.interrupted missing');
    if (!Array.isArray(row.run.errors)) problems.push('run.errors missing');
    else if (row.run.errors.length > 0) problems.push('run has errors');
    if (!Number.isInteger(row.run.acceptedCount)) problems.push('run.acceptedCount missing');
  }
  return problems;
}

/** @typedef {'observed-pair' | 'analytic-only' | 'unresolved'} Category */
/**
 * @typedef {object} RowCoverage
 * @property {string} key
 * @property {Category} category
 * @property {string[]} reasons Why the row is unresolved; empty otherwise.
 * @property {string[]} notes
 * @property {{ triggered: boolean, reasons: string[], unknown: string[] } | null} trigger
 * @property {string | null} twin The key of the valid twin that was joined.
 * @property {boolean | null} falseStop Known for an observed pair.
 * @property {boolean | null} lostCompletion Known for an observed pair.
 * @property {boolean} twinRequiredMissing An unresolved row that is triggered and has no valid twin.
 */

/**
 * @param {Record<string, any>} row @param {Record<string, any>} twin
 * @returns {boolean} Whether a twin is the row's request: same cell, repetition, seed and uniqueness (never group or slot).
 * A placeholder without a run is matched by cell and repetition.
 */
function sameRequest(row, twin) {
  if (twin.cell !== row.cell || twin.rep !== row.rep) return false;
  return !isObject(twin.run) && twin.seed === undefined ? true : twin.seed === row.seed && twin.uniqueness === row.uniqueness;
}

/**
 * Coverage of the eligible rows (review-2 R2-01; C11): exactly one category per row, and the two endpoints counted apart.
 * @param {Record<string, any>[]} rows The eligible rows, each a row line with its `binding`, or a placeholder with a `state`.
 * @param {Record<string, any>[]} twinRows The twin rows (lines with their `binding`, or placeholders with `cell`, `rep` and a `state`).
 * @param {(row: Record<string, any>) => Historical} historical The frozen side of a row.
 * @returns {{
 *   rows: RowCoverage[],
 *   counts: Record<Category, number>,
 *   endpoints: { lostCompletions: Endpoint, falseStops: Endpoint },
 *   requiredTwinsMissing: number,
 *   unresolved: { key: string, reasons: string[] }[],
 * }}
 * @typedef {{ fromObservedPairs: number, analyticalZeros: number, unresolved: number }} Endpoint
 */
export function coverage(rows, twinRows, historical) {
  /** @type {RowCoverage[]} */
  const out = rows.map((row) => {
    /** @type {RowCoverage} */
    const base = { key: row.key, category: 'unresolved', reasons: [], notes: [], trigger: null, twin: null, falseStop: null, lostCompletion: null, twinRequiredMissing: false };
    const own = observationProblems(row);
    if (own.length > 0) return { ...base, reasons: own };
    const trigger = triggered(row, historical(row));
    base.trigger = trigger;
    if (trigger.unknown.length > 0) return { ...base, reasons: trigger.unknown.map((u) => `unknown ${u}`) };

    const candidates = twinRows.filter((t) => sameRequest(row, t));
    const valid = candidates.find((t) => observationProblems(t).length === 0);
    if (valid) base.twin = valid.key;
    else if (candidates.length > 0) base.notes.push(`twin ${candidates[0].key} is not a valid observation: ${observationProblems(candidates[0]).join('; ')}`);
    if (trigger.triggered && !valid) {
      const why = candidates.length === 0 ? 'no twin' : `twin ${candidates[0].key}: ${observationProblems(candidates[0]).join('; ')}`;
      return { ...base, reasons: [`required twin missing (${why})`], twinRequiredMissing: true };
    }
    if (!valid) return { ...base, category: 'analytic-only' };

    const bound = trigger.reasons.includes('bound');
    const igSetMs = valid.run.igSetMs;
    if (bound && igSetMs === undefined) {
      return { ...base, reasons: [`twin ${valid.key} is not linked (no igSetMs)`] };
    }
    return {
      ...base,
      category: 'observed-pair',
      falseStop: bound && isNum(igSetMs),
      lostCompletion: trigger.reasons.includes('fewer-than-ten') && valid.run.acceptedCount >= 10,
    };
  });
  /** @type {Record<Category, number>} */
  const counts = { 'observed-pair': 0, 'analytic-only': 0, unresolved: 0 };
  for (const r of out) counts[r.category] += 1;
  /** @param {'lostCompletion' | 'falseStop'} field @returns {Endpoint} */
  const endpoint = (field) => ({
    fromObservedPairs: out.filter((r) => r.category === 'observed-pair' && r[field] === true).length,
    analyticalZeros: counts['analytic-only'],
    unresolved: counts.unresolved,
  });
  return {
    rows: out,
    counts,
    endpoints: { lostCompletions: endpoint('lostCompletion'), falseStops: endpoint('falseStop') },
    requiredTwinsMissing: out.filter((r) => r.twinRequiredMissing).length,
    unresolved: out.filter((r) => r.category === 'unresolved').map((r) => ({ key: r.key, reasons: r.reasons })),
  };
}

/**
 * The twin positions of the required rows (C10): a row with a fixed twin needs no slot; any other takes the next open
 * slot in key order; the rest is the overflow, three twins per group, and its reprice (review-2 R2-06).
 * @param {string[]} required The required row keys.
 * @param {ReadonlySet<string>} covered The required keys that a fixed plan twin covers.
 * @param {string[]} openSlots The open slot keys, in order.
 * @returns {{ slots: Record<string, string | null>, inactive: string[], overflow: { keys: string[], groups: string[][], repriceCountedS: number, repriceGuardS: number } }}
 */
export function assignTwins(required, covered, openSlots) {
  const rest = [...required].sort(byText).filter((key) => !covered.has(key));
  /** @type {Record<string, string | null>} */
  const slots = {};
  openSlots.forEach((slot, i) => {
    slots[slot] = rest[i] ?? null;
  });
  const keys = rest.slice(openSlots.length);
  /** @type {string[][]} */
  const groups = [];
  for (let i = 0; i < keys.length; i += TWINS_PER_GROUP) groups.push(keys.slice(i, i + TWINS_PER_GROUP));
  const repriceCountedS = groups.reduce((sum, g) => sum + GROUP_FIXED_S + TWIN_LIMIT_S * g.length, 0);
  return {
    slots,
    inactive: openSlots.filter((slot) => slots[slot] === null),
    overflow: { keys, groups, repriceCountedS, repriceGuardS: GUARD_FACTOR * repriceCountedS },
  };
}
