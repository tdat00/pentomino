// @ts-check
// N-V4-16's glue and the reach readings (P2-13f; contracts C6, C9 and C11, review-2 R2-02). Pure functions over published
// row lines as `loadSnapshot` gives them (each with its `binding`); nothing here reads a file. A missing field is
// unknown, never zero.

/** The reasons that a higher-priority cancellation or time cut gives instead of the bound's (C11). */
export const DECLARED_REASONS = Object.freeze(['cancelled', 'set:time-limit', 'set:reserve-cut', 'set:response-bound']);
/** The routes with the client bound: it must stop after four same-side ends. */
export const BOUND_VARIANTS = Object.freeze(['p2-gen4', 'p2-gen4-diag', 'p2-none']);
/** The routes with the bound disabled by design: they continue after four same-side ends. */
export const UNCAPPED_VARIANTS = Object.freeze(['p2-uncapped', 'p2-uncapped-diag']);
/** Today's search: its raw outcomes carry no `igNoWindow`. */
export const TODAY_VARIANT = 'p2-today';
/** The attempts that the client trail holds (C6) and that a natural match is made of. */
export const FIRST_ATTEMPTS = Object.freeze([0, 1, 2, 3]);

const isObject = (/** @type {unknown} */ v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (/** @type {unknown} */ v) => typeof v === 'number' && Number.isFinite(v);
const byText = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0);
const isSide = (/** @type {unknown} */ v) => v !== null && v !== undefined;

/**
 * @template T
 * @param {T[]} rows @param {(row: T) => Record<string, any>} identity
 * @returns {{ component: string, arm: string, cell: string, rows: T[] }[]} The rows grouped by component, arm and cell, in that order.
 */
function groupRows(rows, identity) {
  /** @type {Map<string, { component: string, arm: string, cell: string, rows: T[] }>} */
  const groups = new Map();
  for (const row of rows) {
    const { component, arm, cell } = identity(row);
    const id = JSON.stringify([component, arm, cell]);
    let group = groups.get(id);
    if (!group) groups.set(id, group = { component: String(component), arm: String(arm), cell: String(cell), rows: [] });
    group.rows.push(row);
  }
  return [...groups.values()].sort((a, b) => byText(a.component, b.component) || byText(a.arm, b.arm) || byText(a.cell, b.cell));
}

/** @param {Record<string, any>} row @returns {string[] | null} Null when the row's binding holds, else the problems that refuse it. */
function refusal(row) {
  if (!isObject(row.binding)) return ['binding not verified'];
  if (row.binding.ok !== true) return Array.isArray(row.binding.problems) && row.binding.problems.length > 0 ? row.binding.problems : ['binding refused'];
  return null;
}

/**
 * @typedef {object} TransportEntry A raw no-window end whose transport to the client is not as expected.
 * @property {string} key @property {number} attempt @property {string} raw The raw side.
 * @property {string | null} transported The client entry's reason, or null when it has no entry or no reason.
 * @property {number | null} arrival The client entry's arrival, or null without an entry.
 * @property {'unexplained' | 'declared' | 'unresolved'} class
 */

/**
 * @typedef {object} ReconcileEntry A raw first-four match that the client condition, firing and public reason do not show.
 * @property {string} key @property {null} attempt @property {string} raw The raw side.
 * @property {{ sameSide: string, boundFired: true, partialReason: string }} expected
 * @property {{ sameSide: unknown, boundFired: unknown, partialReason: unknown }} actual
 * @property {'unexplained' | 'declared'} class
 */

/**
 * @param {Record<string, any>} row A bound row line.
 * @returns {{ complete: boolean, route: 'bound' | 'uncapped' | 'today' | 'unknown', match: string | null, transport: TransportEntry[], reconcile: ReconcileEntry[],
 *   clientSameSide: boolean, fired: boolean, publicNoWindow: boolean, noTrail: boolean }}
 */
function glueRow(row) {
  const key = String(row.key);
  const run = isObject(row.run) ? row.run : {};
  const partial = typeof run.partialReason === 'string' ? run.partialReason : null;
  const declared = partial !== null && DECLARED_REASONS.includes(partial);
  const ledger = isObject(row.ledger) ? row.ledger : null;
  const outcomes = ledger !== null && Array.isArray(ledger.outcomes) ? ledger.outcomes : null;
  const complete0 = ledger !== null && ledger.complete === true && outcomes !== null;
  const trail = isObject(row.telemetry) && isObject(row.telemetry.trail) ? row.telemetry.trail : null;
  const entries = trail !== null && Array.isArray(trail.attempts) ? trail.attempts : [];
  const route = BOUND_VARIANTS.includes(row.variant) ? 'bound' : UNCAPPED_VARIANTS.includes(row.variant) ? 'uncapped' : row.variant === TODAY_VARIANT ? 'today' : 'unknown';

  // The raw side: the ended set calls of attempts 0 to 3 (a pre-selection failure has no `end` line, so it is none).
  const first = (outcomes ?? []).filter((o) => o?.stage === 'set' && FIRST_ATTEMPTS.includes(o.attempt));
  const sides = FIRST_ATTEMPTS.map((attempt) => first.filter((o) => o.attempt === attempt).map((o) => o.igNoWindow));
  // C1 writes `igNoWindow` on every `end` line: a missing or malformed value, or repeats of one attempt that disagree, is bad evidence.
  const wellFormed = first.every((o) => o.igNoWindow === null || o.igNoWindow === 'below' || o.igNoWindow === 'above') && sides.every((s) => s.every((side) => side === s[0]));
  const complete = complete0 && wellFormed;
  const [lead] = sides[0];
  const match = wellFormed && sides.every((s) => s.length > 0 && isSide(s[0]) && s[0] === lead) ? String(lead) : null;

  /** @type {TransportEntry[]} */
  const transport = [];
  for (const o of first) {
    if (!isSide(o.igNoWindow)) continue;
    const entry = entries.find((e) => isObject(e) && e.attempt === o.attempt);
    const expected = `no-window-${o.igNoWindow}`;
    if (entry !== undefined && entry.reason === expected) continue;
    transport.push({
      key,
      attempt: o.attempt,
      raw: String(o.igNoWindow),
      transported: entry === undefined ? null : (entry.reason ?? null),
      arrival: entry !== undefined && isNum(entry.arrival) ? entry.arrival : null,
      class: entry === undefined ? (declared ? 'declared' : 'unresolved') : 'unexplained',
    });
  }
  // The client's arrival order, then the attempts it has no entry for.
  transport.sort((a, b) => (a.arrival === null ? 1 : 0) - (b.arrival === null ? 1 : 0) || (a.arrival ?? 0) - (b.arrival ?? 0) || a.attempt - b.attempt);

  /** @type {ReconcileEntry[]} */
  const reconcile = [];
  if (match !== null && route === 'bound') {
    const expected = /** @type {const} */ ({ sameSide: match, boundFired: true, partialReason: `set:no-window-${match}` });
    const actual = { sameSide: trail?.sameSide, boundFired: trail?.boundFired, partialReason: run.partialReason };
    if (actual.sameSide !== expected.sameSide || actual.boundFired !== true || actual.partialReason !== expected.partialReason) {
      reconcile.push({ key, attempt: null, raw: match, expected, actual, class: declared ? 'declared' : 'unexplained' });
    }
  }
  return {
    complete,
    route,
    match,
    transport,
    reconcile,
    clientSameSide: trail !== null && typeof trail.sameSide === 'string',
    fired: trail !== null && trail.boundFired === true,
    publicNoWindow: partial !== null && /^set:no-window-/.test(partial),
    noTrail: trail === null,
  };
}

/**
 * N-V4-16's glue, per component, arm and cell (C11): raw natural matches from the raw ended set calls, joined to the client
 * entries by `attempt`, and reconciled with the client condition, firing and public reason on the bound-enabled routes.
 * @param {Record<string, any>[]} rows Published row lines with their `binding`; a row without a valid binding is left out and listed.
 * @returns {{ component: string, arm: string, cell: string, rows: number, rawMatches: number, clientSameSide: number, firings: number,
 *   publicNoWindow: number, transport: TransportEntry[], reconcile: ReconcileEntry[], refused: { key: string, problems: string[] }[],
 *   incomplete: string[], noTrail: string[], status: 'exercised' | 'unexercised' | 'unknown' | 'not-applicable' }[]}
 */
export function glue(rows) {
  return groupRows(rows, (row) => row).map(({ component, arm, cell, rows: members }) => {
    /** @type {{ key: string, problems: string[] }[]} */
    const refused = [];
    /** @type {string[]} */
    const incomplete = [];
    /** @type {string[]} */
    const noTrail = [];
    /** @type {TransportEntry[]} */
    const transport = [];
    /** @type {ReconcileEntry[]} */
    const reconcile = [];
    let counted = 0;
    let rawMatches = 0;
    let clientSameSide = 0;
    let firings = 0;
    let publicNoWindow = 0;
    for (const row of members) {
      const problems = refusal(row);
      if (problems !== null) {
        refused.push({ key: String(row.key), problems });
        continue;
      }
      counted += 1;
      const g = glueRow(row);
      if (!g.complete) incomplete.push(String(row.key));
      if (g.noTrail) noTrail.push(String(row.key));
      if (g.match !== null) {
        rawMatches += 1;
        // The route decides the reconciliation; an unknown route cannot be decided.
        if (g.route === 'unknown' && g.complete) incomplete.push(String(row.key));
      }
      if (g.clientSameSide) clientSameSide += 1;
      if (g.fired) firings += 1;
      if (g.publicNoWindow) publicNoWindow += 1;
      transport.push(...g.transport);
      reconcile.push(...g.reconcile);
    }
    const status = members.every((row) => row.variant === TODAY_VARIANT) ? 'not-applicable'
      : rawMatches > 0 ? 'exercised' : incomplete.length === 0 && refused.length === 0 ? 'unexercised' : 'unknown';
    return { component, arm, cell, rows: counted, rawMatches, clientSameSide, firings, publicNoWindow, transport, reconcile, refused, incomplete, noTrail, status };
  });
}

/**
 * @typedef {object} Reading One summed reach counter.
 * @property {number} total The sum over the rows that have the field.
 * @property {string[]} unknown The keys of the rows without it: they add no zero.
 * @property {string} print `0 (unexercised)` only when every row has the field and the sum is 0; `unknown` when the sum is 0 and a row lacks the field.
 */

/** @param {number} total @param {string[]} unknown @returns {Reading} */
function reading(total, unknown) {
  const print = unknown.length === 0 ? (total === 0 ? '0 (unexercised)' : String(total)) : total === 0 ? 'unknown' : `${total} (${unknown.length} rows unknown)`;
  return { total, unknown, print };
}

/** @param {Record<string, any>} row @param {string} name @returns {number | null} The sum of a counter over the set and batch counters; null when either is missing. A stage that did not run has `null` counters (C6): zero. */
function counterOf(row, name) {
  const telemetry = isObject(row.telemetry) ? row.telemetry : null;
  if (telemetry === null) return null;
  let sum = 0;
  for (const stage of ['setCounters', 'batchCounters']) {
    const counters = telemetry[stage];
    if (counters === null) continue;
    if (!isObject(counters) || !isNum(counters[name])) return null;
    sum += counters[name];
  }
  return sum;
}

/** @param {Record<string, any>} row @param {'close' | 'rescue' | 'rerate'} phase @returns {number | null} The re-rating starts of a phase; null when the field is missing or the ledger is not complete. */
function startsOf(row, phase) {
  const ledger = isObject(row.ledger) ? row.ledger : null;
  if (ledger === null || ledger.complete !== true || !isObject(ledger.rerateStarts) || !isNum(ledger.rerateStarts[phase])) return null;
  return ledger.rerateStarts[phase];
}

/** @param {Record<string, any>[]} rows @param {(row: Record<string, any>) => number | null} of @returns {Reading} */
function sumOf(rows, of) {
  let total = 0;
  /** @type {string[]} */
  const unknown = [];
  for (const row of rows) {
    const n = of(row);
    if (n === null) unknown.push(String(row.key));
    else total += n;
  }
  return reading(total, unknown);
}

/**
 * The reach readings, per component, arm and cell: budget stops (F4), re-rating starts by phase, re-rating completions and
 * screen-capped profiles (F7). A row without a field is listed as unknown and adds no zero.
 * @param {Record<string, any>[]} rows Published row lines with their `binding`; a row without a valid binding is left out and listed.
 * @returns {{ component: string, arm: string, cell: string, rows: number, budgetStops: Reading, rerateStarts: { close: Reading, rescue: Reading, rerate: Reading },
 *   rescueReratings: Reading, tailReratings: Reading, screenCapped: Reading, refused: { key: string, problems: string[] }[] }[]}
 */
export function reach(rows) {
  return groupRows(rows, (row) => row).map(({ component, arm, cell, rows: members }) => {
    /** @type {{ key: string, problems: string[] }[]} */
    const refused = [];
    /** @type {Record<string, any>[]} */
    const bound = [];
    for (const row of members) {
      const problems = refusal(row);
      if (problems === null) bound.push(row);
      else refused.push({ key: String(row.key), problems });
    }
    const today = members.every((row) => row.variant === TODAY_VARIANT);
    // Today's search has no budget, screen or re-rating: neither a zero nor an unknown applies.
    const show = (/** @type {Reading} */ r) => (today ? { ...r, print: "n/a (today's search)" } : r);
    return {
      component,
      arm,
      cell,
      rows: bound.length,
      budgetStops: show(sumOf(bound, (row) => counterOf(row, 'budgetStops'))),
      rerateStarts: {
        close: show(sumOf(bound, (row) => startsOf(row, 'close'))),
        rescue: show(sumOf(bound, (row) => startsOf(row, 'rescue'))),
        rerate: show(sumOf(bound, (row) => startsOf(row, 'rerate'))),
      },
      rescueReratings: show(sumOf(bound, (row) => counterOf(row, 'rescueReratings'))),
      tailReratings: show(sumOf(bound, (row) => counterOf(row, 'tailReratings'))),
      screenCapped: show(sumOf(bound, (row) => counterOf(row, 'screenCapped'))),
      refused,
    };
  });
}
