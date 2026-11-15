// @ts-check
// Generation Steps ("How it was made"), the part that has no DOM (design §6.12, §11.11; RES-29 to RES-31): the two
// views of a replay, the sentence of a step, the score table, the stage list, the status text and the controller that
// loads, steps, plays and closes. Texts are never built here: every function returns descriptors `{ key, params }`
// of locale keys (a parameter may itself be a descriptor), which `renderDesc` turns into text with the app's `t`. No
// timer of its own (the scheduler is injected) and no storage.
import { PoolAbortError, PoolError } from '../../core/browser/worker-pool.js';
import { clueKey } from '../../core/engine/keys.js';

/** @typedef {import('../../core/engine/replay.js').ReplayResult} ReplayResult */
/** @typedef {import('../../core/engine/replay.js').Step} Step */
/** @typedef {import('../../core/engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../../core/engine/types.js').Pose} Pose */
/** @typedef {import('../../core/engine/types.js').Puzzle} Puzzle */
/** @typedef {import('../../core/engine/types.js').RatingDetail} RatingDetail */

/**
 * What the Generator gives the dialog: the set, the puzzle and its provenance (`client.replayPuzzle`'s input).
 * @typedef {{ set: PieceSet, puzzle: Puzzle, setOrigin: unknown, made: unknown }} ReplaySource
 */

/**
 * A text to be written: a locale key and its parameters. A parameter is a string, a raw number (the dialog formats it
 * for the language) or another descriptor (a translated noun phrase inside a sentence).
 * @typedef {{ key: string, params?: Record<string, string | number | Desc> }} Desc
 */

/**
 * One row of a score table: the header, the detail line (when its data exist) and the value: a raw number, a
 * descriptor ("not available", "none", "counted") or nothing.
 * @typedef {object} Row
 * @property {'base' | 'rules' | 'guess' | 'nodes' | 'node' | 'penalty' | 'total' | 'band' | 'v2u' | 'v2b'
 *   | 'unrateable' | 'refused'} id
 * @property {Desc} head
 * @property {Desc | null} detail
 * @property {number | Desc | null} value
 * @property {boolean} [counted] Node rows: whether the alternatives counted (kLow < c).
 */

/**
 * @typedef {object} ScoreTable
 * @property {'none' | 'unrateable' | 'table'} kind `none`: no score for the step (`message`); `unrateable`: one row.
 * @property {Row[]} rows
 * @property {Desc | null} message
 */

/**
 * `index` is the index into `result.steps` (the step shown), whichever the view.
 * @typedef {object} ReplayViewState
 * @property {'closed' | 'loading' | 'ready' | 'failed'} phase
 * @property {ReplayResult | null} result
 * @property {'worker-unavailable' | 'interrupted' | 'failed' | null} failure
 * @property {'compact' | 'all'} view
 * @property {number} index
 * @property {boolean} playing
 */

export const STAGE_COUNT = 7;
export const DEFAULT_INTERVAL_MS = 900;
const MODEL_V3 = 'difficulty-v3';
const MODEL_V2 = 'difficulty-v2';
const RULE_NAMES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
const UNAVAILABLE_REASONS = [
  'no-set-origin', 'set-versions', 'no-record', 'record-invalid', 'completion', 'overflow', 'record-versions',
  'calibration-needs-set',
];
const MISMATCH_FIELDS = ['set', 'skips', 'candidate-failed', 'board', 'pieces', 'witness', 'clues', 'rating', 'solution'];
const LIMITS = ['steps', 'bytes', 'work'];
const REPAIR_REFUSALS = ['not-proved', 'path-capped', 'no-proved-guess', 'out-of-band', 'excluded'];

/**
 * @param {string} key
 * @param {Record<string, string | number | Desc>} [params]
 * @returns {Desc}
 */
function desc(key, params) {
  return params === undefined ? { key } : { key, params };
}

const UNAVAILABLE = Object.freeze(desc('replay.table.unavailable'));

/**
 * @param {unknown} v
 * @returns {v is Record<string, any>}
 */
function isObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * @param {unknown} v
 * @returns {number | Desc} The number, or "not available" for anything else: no text is ever `NaN` or a bare `{name}`.
 */
function numOr(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : UNAVAILABLE;
}

/**
 * @param {unknown} v
 * @returns {number | Desc} The stored ordinal plus one (the sentences count from 1).
 */
function ordinal(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v + 1 : UNAVAILABLE;
}

/**
 * @param {Desc} d
 * @returns {string[]} Every locale key the descriptor names, itself first, then those of its parameters.
 */
export function descriptorKeys(d) {
  const keys = [d.key];
  for (const value of Object.values(d.params ?? {})) {
    if (typeof value === 'object') {
      keys.push(...descriptorKeys(value));
    }
  }
  return keys;
}

/**
 * Writes a descriptor. A numeric parameter goes through `format`, except `count`, which stays a number so that `t`
 * can choose the plural form.
 * @param {Desc} d
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @param {(value: number) => string} [format]
 * @returns {string}
 */
export function renderDesc(d, t, format = String) {
  /** @type {Record<string, unknown> | undefined} */
  let params;
  if (d.params !== undefined) {
    params = {};
    for (const [name, value] of Object.entries(d.params)) {
      params[name] = typeof value === 'object'
        ? renderDesc(value, t, format)
        : typeof value === 'number' && name !== 'count' ? format(value) : value;
    }
  }
  return t(d.key, params);
}

// ---------------------------------------------------------------------------------------------------------------
// Views (RES-30).

/**
 * The P1 comparator's three keys of a rated step (`ranked` of `core/engine/clues.js`): the distance to the band, the
 * distance to its centre and the clue key.
 * @param {Step} step
 * @param {string} key
 * @returns {[number, number, string] | null} Null for a step without a score or a band.
 */
function rankOf(step, key) {
  const { rating, band } = step;
  if (rating === null || band === null || !Number.isFinite(rating.score) || !Number.isFinite(band.min)) {
    return null;
  }
  const score = rating.score;
  const { min, max } = band;
  const open = max === null || max === undefined;
  const bandDistance = score < min ? min - score : !open && score >= max ? score - max + 1 : 0;
  const centreDistance = open ? 0 : Math.abs(score - (min + max) / 2);
  return [bandDistance, centreDistance, key];
}

/**
 * @param {[number, number, string]} a
 * @param {[number, number, string]} b
 * @returns {boolean} Whether `a` is lexicographically smaller than `b` (numbers, then the key as a string).
 */
function ranksBefore(a, b) {
  if (a[0] !== b[0]) {
    return a[0] < b[0];
  }
  if (a[1] !== b[1]) {
    return a[1] < b[1];
  }
  return a[2] < b[2];
}

/**
 * The indices of the compact view, in the original order: the first step of each stage, every `repair` step, the
 * `selected` step, the final step, and each `rated` step that strictly improves the best so far under the P1
 * comparator (an equal rank, the same clue set, is not an improvement).
 * @param {readonly Step[]} steps
 * @param {(step: Step, index: number) => string} keyOf The canonical clue key of the step's clue set.
 * @returns {number[]}
 */
export function compactIndices(steps, keyOf) {
  /** @type {Set<number>} */
  const kept = new Set();
  /** @type {Set<number>} */
  const stages = new Set();
  /** @type {[number, number, string] | null} */
  let best = null;
  steps.forEach((step, index) => {
    if (!stages.has(step.stage)) {
      stages.add(step.stage);
      kept.add(index);
    }
    if (step.kind === 'repair' || step.kind === 'selected' || step.kind === 'final') {
      kept.add(index);
    }
    if (step.kind === 'rated') {
      const rank = rankOf(step, keyOf(step, index));
      if (rank !== null && (best === null || ranksBefore(rank, best))) {
        best = rank;
        kept.add(index);
      }
    }
  });
  return [...kept].sort((a, b) => a - b);
}

/**
 * The compact view (RES-30).
 * @param {readonly Step[]} steps
 * @param {(step: Step, index: number) => string} keyOf
 * @returns {Step[]}
 */
export function compactSteps(steps, keyOf) {
  return compactIndices(steps, keyOf).map((index) => steps[index]);
}

/**
 * The canonical clue key of a step's clue set on the set, for the compact filter: `clueKey` of the poses of the
 * placed items whose ids are the step's clues. A pose the set cannot place gives a fallback key, never an error.
 * @param {Pick<PieceSet, 'board' | 'pieces'>} set
 * @returns {(step: Step) => string}
 */
export function stepKeyOf(set) {
  return (step) => {
    const ids = new Set(step.board.clues);
    const poses = step.board.placed.flatMap((item) => (item.pose !== null && ids.has(item.id ?? '') ? [item.pose] : []));
    try {
      return clueKey(set.board, set.pieces, poses);
    } catch {
      return `~${JSON.stringify(poses)}`;
    }
  };
}

/**
 * @param {readonly Step[]} steps
 * @param {'compact' | 'all'} view
 * @param {(step: Step, index: number) => string} keyOf
 * @returns {number[]} The indices of the steps the view shows.
 */
export function visibleIndices(steps, view, keyOf) {
  return view === 'all' ? steps.map((_, index) => index) : compactIndices(steps, keyOf);
}

// ---------------------------------------------------------------------------------------------------------------
// Step sentences (RES-30, D34).

/**
 * The sentence of a step: a locale key chosen by the step's note and variant, with its placeholders. `{sequence}`
 * and `{step}` are the stored ordinals plus one; the final step says "generated" only for a `matched` result.
 * @param {Step} step
 * @returns {Desc}
 */
export function stepText(step) {
  const a = step.args;
  switch (step.kind) {
    case 'count':
      return desc('replay.step.count', { k: numOr(a.k), min: numOr(a.min ?? a.k), max: numOr(a.max ?? a.k) });
    case 'carve':
      return a.mode === 'macro' ? desc('replay.step.carve.macro', { parts: numOr(a.parts) }) : desc('replay.step.carve.flat');
    case 'piece':
      return desc('replay.step.piece', { n: numOr(a.n) });
    case 'start':
      return desc(a.start === 'restart' ? 'replay.step.start.restart' : 'replay.step.start.witness');
    case 'retile':
      return desc(a.changed === true ? 'replay.step.retile.changed' : 'replay.step.retile.same', {
        step: ordinal(a.step), lifted: numOr(a.lifted),
      });
    case 'rated':
      return desc(a.source === 'calibration' ? 'replay.step.rated.calibration' : 'replay.step.rated', {
        sequence: ordinal(a.sequence), score: numOr(step.rating?.score),
      });
    case 'skip':
      return desc('replay.step.skip', { sequence: ordinal(a.sequence) });
    case 'unrateable':
      return desc('replay.step.unrateable', { sequence: ordinal(a.sequence) });
    case 'rejected':
      return desc('replay.step.rejected', { sequence: ordinal(a.sequence), score: numOr(step.rating?.score) });
    case 'repair': {
      if (a.added === null || a.added === undefined) {
        return desc('replay.step.repair.failedBeforeClue');
      }
      const piece = String(a.added);
      if (a.accepted === true) {
        return desc('replay.step.repair.accepted', { piece, score: numOr(step.rating?.score) });
      }
      if (a.accepted === false && typeof a.reason === 'string' && REPAIR_REFUSALS.includes(a.reason)) {
        return desc(`replay.step.repair.rejected.${a.reason}`, { piece });
      }
      return desc('replay.step.repair.added', { piece });
    }
    case 'selected':
      return desc('replay.step.selected');
    case 'final':
      return desc(a.status === 'matched' ? 'replay.step.final.generated' : 'replay.step.final.stored');
    default:
      return desc(step.note);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The score table (RES-30).

/**
 * @param {unknown} b
 * @returns {boolean} Whether the object holds the four finite terms of a `difficulty-v3` breakdown.
 */
function isTermsV3(b) {
  return isObject(b) && [b.base, b.rule, b.guess, b.penalty].every((v) => typeof v === 'number' && Number.isFinite(v));
}

/**
 * @param {unknown} rules
 * @returns {string | Desc} The nonzero rule counts ("R1 ×3, R3 ×2"), or "none".
 */
function countsText(rules) {
  const list = RULE_NAMES.flatMap((name) => {
    const n = isObject(rules) ? rules[name] : undefined;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? [`${name} ×${n}`] : [];
  });
  return list.length === 0 ? desc('replay.table.rules.none') : list.join(', ');
}

/**
 * @param {Step} step
 * @param {readonly Step[]} steps
 * @returns {RatingDetail | null} The detail of the step's rating; for the final step that of the step that measured
 *   the matched puzzle (`args.detailStep`, SP11).
 */
function detailOf(step, steps) {
  if (step.kind === 'final') {
    const at = step.args.detailStep;
    return typeof at === 'number' && Number.isInteger(at) && at >= 0 && at < steps.length ? steps[at].detail ?? null : null;
  }
  return step.detail;
}

/**
 * @param {RatingDetail | null} detail
 * @returns {Row[]} The "Guess nodes" rows: the header with its value, then one row per final-path guess node.
 */
function nodeRows(detail) {
  const census = isObject(detail) && isObject(detail.first) && Array.isArray(detail.first.census) ? detail.first.census : null;
  const head = desc('replay.table.name.nodes');
  if (census === null) {
    return [{ id: 'nodes', head, detail: null, value: UNAVAILABLE }];
  }
  if (census.length === 0) {
    return [{ id: 'nodes', head, detail: null, value: desc('replay.table.none') }];
  }
  return [
    { id: 'nodes', head, detail: null, value: null },
    ...census.map((/** @type {any} */ node, /** @type {number} */ i) => {
      const counted = isObject(node) && typeof node.kLow === 'number' && typeof node.c === 'number' && node.kLow < node.c;
      return /** @type {Row} */ ({
        id: 'node',
        head: desc('replay.table.node', {
          n: i + 1, c: numOr(node?.c), klow: numOr(node?.kLow), f: numOr(node?.f), u: numOr(node?.u),
        }),
        detail: null,
        value: desc(counted ? 'replay.table.counted' : 'replay.table.notCounted'),
        counted,
      });
    }),
  ];
}

/** @returns {Row[]} The five rows of a rating whose terms are not available. */
function unavailableRows() {
  return /** @type {Row[]} */ (['base', 'rules', 'guess', 'nodes', 'penalty'].map((id) => ({
    id, head: desc(`replay.table.name.${id}`), detail: null, value: UNAVAILABLE,
  })));
}

/**
 * @param {Step} step
 * @param {readonly Step[]} steps
 * @returns {Row[]} The rows of a `difficulty-v3` rating with its terms.
 */
function termRows(step, steps) {
  const m = isObject(step.rating?.metrics) ? /** @type {Record<string, any>} */ (step.rating?.metrics) : {};
  const b = /** @type {{ base: number, rule: number, guess: number, penalty: number }} */ (step.breakdown);
  const solutions = m.solutions === 'few' || m.solutions === 'many' ? `replay.table.solutions.${m.solutions}` : 'replay.table.none';
  return [
    {
      id: 'base', head: desc('replay.table.name.base'), detail: desc('replay.table.base', { u: numOr(m.U) }), value: b.base,
    },
    {
      id: 'rules',
      head: desc('replay.table.name.rules'),
      detail: desc('replay.table.rules', { tier: numOr(m.deductionTier), counts: countsText(m.rules) }),
      value: b.rule,
    },
    {
      id: 'guess',
      head: desc('replay.table.name.guess'),
      detail: desc('replay.table.guess', { g: numOr(m.G), gproved: numOr(m.Gproved), info: numOr(m.info) }),
      value: b.guess,
    },
    ...nodeRows(detailOf(step, steps)),
    {
      id: 'penalty',
      head: desc('replay.table.name.penalty'),
      detail: desc('replay.table.penalty', { solutions: desc(solutions) }),
      value: b.penalty,
    },
  ];
}

/**
 * The score table of a step (RES-30): the terms of a `difficulty-v3` rating with the guess nodes, the total with its
 * estimate note, and the band; the two terms of a `difficulty-v2` claim and the total; for a rating whose terms are
 * not available (a summary claim, opaque metrics, another model) the total alone, every other row "not available",
 * never 0. A step without a rating has no score; an unrateable step says so; a refused one says so under its table.
 * @param {Step} step
 * @param {readonly Step[]} steps All the steps of the result (the final step reads its guess nodes from one of them).
 * @returns {ScoreTable}
 */
export function scoreTable(step, steps) {
  if (step.kind === 'unrateable') {
    return { kind: 'unrateable', rows: [{ id: 'unrateable', head: desc('replay.table.unrateable'), detail: null, value: null }], message: null };
  }
  const rating = step.rating;
  if (!isObject(rating)) {
    return { kind: 'none', rows: [], message: desc('replay.table.noScore') };
  }
  const v3 = rating.model === MODEL_V3;
  const v2 = rating.model === MODEL_V2 && isObject(step.breakdown) && step.breakdown.model === MODEL_V2;
  /** @type {Row[]} */
  const rows = [];
  if (v3 && isTermsV3(step.breakdown)) {
    rows.push(...termRows(step, steps));
  } else if (v2) {
    const terms = /** @type {{ u: number, b: number }} */ (/** @type {unknown} */ (step.breakdown));
    rows.push(
      { id: 'v2u', head: desc('replay.table.v2.u'), detail: null, value: numOr(terms.u) },
      { id: 'v2b', head: desc('replay.table.v2.b'), detail: null, value: numOr(terms.b) },
    );
  } else {
    rows.push(...unavailableRows());
  }
  /** @type {Desc | null} */
  let note = null;
  if (rating.censored === true) {
    const undecided = isObject(rating.metrics) ? rating.metrics.censusUndecided : undefined;
    note = typeof undecided === 'number' && Number.isFinite(undecided)
      ? desc('rating.note.estimate', { count: undecided })
      : desc('rating.note.estimateShort');
  }
  rows.push({ id: 'total', head: desc('replay.table.total'), detail: note, value: numOr(rating.score) });
  if (v3 && step.band !== null) {
    const { min, max } = step.band;
    rows.push({
      id: 'band',
      head: max === null || max === undefined
        ? desc('replay.table.bandOpen', { min: numOr(min) })
        : desc('replay.table.band', { min: numOr(min), max: numOr(max) }),
      detail: null,
      value: null,
    });
  }
  if (step.kind === 'rejected') {
    rows.push({ id: 'refused', head: desc('replay.table.refused'), detail: null, value: null });
  }
  return { kind: 'table', rows, message: null };
}

// ---------------------------------------------------------------------------------------------------------------
// The board, the stage list and the status (RES-29, RES-31).

/**
 * What a step shows on the board: its clues, its other placed pieces and the pieces to highlight (the lifted group of
 * stage 4, the piece a repair added, the clues of the selected step). Items without a pose are not drawn.
 * @param {Step} step
 * @returns {{ clues: Pose[], placements: Pose[], highlightedIds: string[] }}
 */
export function boardOf(step) {
  const { placed, lifted, clues } = step.board;
  const clueIds = new Set(clues);
  const drawn = placed.flatMap((item) => (item.pose !== null && item.id !== null ? [{ id: item.id, pose: item.pose }] : []));
  /** @type {string[]} */
  let highlightedIds = [];
  if (step.stage === 4) {
    highlightedIds = lifted.slice();
  } else if (step.kind === 'repair' && typeof step.args.added === 'string') {
    highlightedIds = [step.args.added];
  } else if (step.kind === 'selected') {
    highlightedIds = clues.slice();
  }
  return {
    clues: clues.flatMap((id) => drawn.filter((item) => item.id === id).map((item) => item.pose)),
    placements: drawn.filter((item) => !clueIds.has(item.id)).map((item) => item.pose),
    highlightedIds,
  };
}

/**
 * @typedef {object} StageEntry
 * @property {number} stage 1 to 7.
 * @property {Desc} name `replay.stage.<n>`.
 * @property {number} steps How many steps the result has in the stage.
 * @property {'stopped' | 'none' | 'notAvailable' | null} mark Null: the stage is available (it has steps), or the
 *   result is not known yet.
 * @property {Desc | null} markText
 */

/**
 * The seven stages and what each offers. Stages 1-3 follow `stages.set` and 4-6 `stages.candidate`; stage 7 always
 * has the final step. In a group that was `stopped`, every stage says so, with or without steps; an `incomplete`
 * result also says so for a stage without steps (the byte cut keeps the group states and drops the later steps). Any
 * other stage without steps is `notAvailable` in an `unavailable` or `mismatch` group, and `none` ("no steps were
 * needed": a repair stage nothing needed, the layout stage of a calibration puzzle) in a `replayed` or `calibration`
 * group. Without a result no stage carries a mark.
 * @param {ReplayResult | null} result
 * @returns {StageEntry[]}
 */
export function stageList(result) {
  return Array.from({ length: STAGE_COUNT }, (_, i) => {
    const stage = i + 1;
    const steps = result === null ? 0 : result.steps.filter((step) => step.stage === stage).length;
    /** @type {StageEntry['mark']} */
    let mark = null;
    if (result !== null && stage < STAGE_COUNT) {
      const group = stage <= 3 ? result.stages.set : result.stages.candidate;
      if (group === 'stopped') {
        mark = 'stopped';
      } else if (steps === 0) {
        if (stage === 4 && group === 'calibration') {
          mark = 'none';
        } else if (group === 'unavailable' || group === 'mismatch') {
          mark = 'notAvailable';
        } else {
          mark = result.status === 'incomplete' ? 'stopped' : 'none';
        }
      }
    }
    return {
      stage,
      name: desc(`replay.stage.${stage}`),
      steps,
      mark,
      markText: mark === null ? null : desc(mark === 'stopped' ? 'replay.stage.stopped' : mark === 'none' ? 'replay.stage.none' : 'replay.notAvailable'),
    };
  });
}

/**
 * The status of a result, as whole sentences: the headline and, for an unavailable result, the reason. For a mismatch
 * the field and for an incomplete result the limit are noun phrases inside the sentence.
 * @param {ReplayResult} result
 * @returns {Desc[]}
 */
export function statusText(result) {
  const reason = result.reason;
  switch (result.status) {
    case 'matched':
      return [desc('replay.status.matched')];
    case 'unavailable':
      return [
        desc('replay.status.unavailable'),
        ...(typeof reason === 'string' && UNAVAILABLE_REASONS.includes(reason) ? [desc(`replay.reason.${reason}`)] : []),
      ];
    case 'mismatch':
      return [desc('replay.status.mismatch', {
        field: typeof reason === 'string' && MISMATCH_FIELDS.includes(reason) ? desc(`replay.field.${reason}`) : String(reason),
      })];
    default:
      return [desc('replay.status.incomplete', {
        reason: typeof reason === 'string' && LIMITS.includes(reason) ? desc(`replay.limit.${reason}`) : String(reason),
      })];
  }
}

/**
 * @param {'worker-unavailable' | 'interrupted' | 'failed'} failure
 * @returns {Desc}
 */
export function failureText(failure) {
  return desc(failure === 'worker-unavailable' ? 'replay.failed.worker' : failure === 'interrupted' ? 'replay.failed.interrupted' : 'replay.failed');
}

// ---------------------------------------------------------------------------------------------------------------
// The controller (RES-29, RES-31).

/**
 * @param {unknown} error
 * @returns {'worker-unavailable' | 'interrupted' | 'failed'}
 */
function failureOf(error) {
  if (error instanceof PoolAbortError && error.reason === 'cancelled') {
    return 'interrupted';
  }
  if (error instanceof PoolError && error.code === 'worker-unavailable') {
    return 'worker-unavailable';
  }
  return 'failed';
}

/**
 * The state machine of the dialog: it runs the replay on `open`, keeps the step, the view and the playback, and on
 * `close` aborts only its own replay (never a generation, never the client).
 * @param {{ run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>,
 *   schedule: (fn: () => void, ms: number) => unknown, unschedule: (handle: unknown) => void,
 *   onChange: (state: ReplayViewState) => void, intervalMs?: number }} o
 */
export function createReplayController(o) {
  const { run, schedule, unschedule, onChange } = o;
  const intervalMs = o.intervalMs ?? DEFAULT_INTERVAL_MS;
  /** @type {ReplayViewState} */
  let state = { phase: 'closed', result: null, failure: null, view: 'compact', index: 0, playing: false };
  /** @type {AbortController | null} */
  let abort = null;
  /** @type {unknown} */
  let timer = null;
  let ticking = false;
  let runId = 0;
  let disposed = false;
  /** @type {((step: Step) => string) | null} */
  let keyOf = null;
  /** @type {number[] | null} */
  let visibleCache = null;

  const emit = () => {
    if (!disposed) {
      onChange({ ...state });
    }
  };

  const stopTimer = () => {
    if (ticking) {
      unschedule(timer);
      ticking = false;
      timer = null;
    }
  };

  /** @returns {number[]} The indices of the steps the view shows, the first of which is always step 0. */
  function visible() {
    if (state.result === null) {
      return [];
    }
    visibleCache ??= visibleIndices(state.result.steps, state.view, keyOf ?? (() => ''));
    return visibleCache;
  }

  /**
   * @param {number} index
   * @returns {number} The nearest visible step at or before `index` (the first visible one when there is none).
   */
  function nearestEarlier(index) {
    const list = visible();
    let found = list[0] ?? 0;
    for (const at of list) {
      if (at <= index) {
        found = at;
      }
    }
    return found;
  }

  /**
   * @param {Partial<ReplayViewState>} change
   * @param {boolean} [force] Emit even when nothing changed.
   */
  function update(change, force = false) {
    const next = { ...state, ...change };
    const same = (/** @type {keyof ReplayViewState} */ k) => next[k] === state[k];
    const changed = !(same('phase') && same('result') && same('failure') && same('view') && same('index') && same('playing'));
    state = next;
    if (changed || force) {
      emit();
    }
  }

  function endRun() {
    runId += 1;
    stopTimer();
    if (abort !== null) {
      abort.abort();
      abort = null;
    }
  }

  function tick() {
    ticking = false;
    timer = null;
    if (!state.playing || state.phase !== 'ready') {
      return;
    }
    const list = visible();
    const next = list.find((at) => at > state.index);
    if (next === undefined) {
      update({ playing: false });
      return;
    }
    const last = list[list.length - 1] === next;
    update({ index: next, playing: !last });
    if (!last) {
      timer = schedule(tick, intervalMs);
      ticking = true;
    }
  }

  return {
    /** @param {ReplaySource} source */
    open(source) {
      if (disposed) {
        return;
      }
      endRun();
      keyOf = isObject(source?.set) ? stepKeyOf(source.set) : null;
      visibleCache = null;
      const mine = runId;
      const controller = new AbortController();
      abort = controller;
      state = { phase: 'loading', result: null, failure: null, view: 'compact', index: 0, playing: false };
      emit();
      /** @type {Promise<ReplayResult>} */
      let promise;
      try {
        promise = Promise.resolve(run(source, controller.signal));
      } catch (error) {
        promise = Promise.reject(error);
      }
      promise.then((result) => {
        if (disposed || mine !== runId) {
          return;
        }
        if (!isObject(result) || !Array.isArray(result.steps) || result.steps.length === 0) {
          update({ phase: 'failed', failure: 'failed' });
          return;
        }
        visibleCache = null;
        update({ phase: 'ready', result, failure: null, index: 0 });
      }, (error) => {
        if (disposed || mine !== runId) {
          return;
        }
        update({ phase: 'failed', failure: failureOf(error) });
      });
    },
    close() {
      if (disposed || state.phase === 'closed') {
        return;
      }
      endRun();
      visibleCache = null;
      state = { phase: 'closed', result: null, failure: null, view: 'compact', index: 0, playing: false };
      emit();
    },
    /** @param {'compact' | 'all'} view */
    setView(view) {
      if (disposed || state.phase !== 'ready' || (view !== 'compact' && view !== 'all')) {
        return;
      }
      stopTimer();
      const changed = view !== state.view;
      const keep = state.index;
      visibleCache = null;
      state = { ...state, view };
      update({ index: nearestEarlier(keep), playing: false }, changed);
    },
    prev() {
      if (disposed || state.phase !== 'ready') {
        return;
      }
      stopTimer();
      const before = visible().filter((at) => at < state.index);
      update({ index: before.length > 0 ? before[before.length - 1] : state.index, playing: false });
    },
    next() {
      if (disposed || state.phase !== 'ready') {
        return;
      }
      stopTimer();
      const after = visible().find((at) => at > state.index);
      update({ index: after === undefined ? state.index : after, playing: false });
    },
    /** @param {number} index An index into `result.steps`; a step the view hides (or one out of range) moves to the nearest earlier visible one. */
    seek(index) {
      if (disposed || state.phase !== 'ready' || !Number.isFinite(index)) {
        return;
      }
      stopTimer();
      update({ index: nearestEarlier(Math.trunc(index)), playing: false });
    },
    play() {
      if (disposed || state.phase !== 'ready' || state.playing) {
        return;
      }
      const list = visible();
      const from = list[list.length - 1] === state.index ? list[0] : state.index;
      if (!list.some((at) => at > from)) {
        return;
      }
      update({ index: from, playing: true }, true);
      timer = schedule(tick, intervalMs);
      ticking = true;
    },
    pause() {
      if (disposed || !state.playing) {
        return;
      }
      stopTimer();
      update({ playing: false });
    },
    /** @returns {number[]} The indices of the steps the current view shows, in order. */
    visible() {
      return visible().slice();
    },
    /** @returns {ReplayViewState} */
    getState() {
      return { ...state };
    },
    dispose() {
      if (disposed) {
        return;
      }
      endRun();
      disposed = true;
      visibleCache = null;
      state = { phase: 'closed', result: null, failure: null, view: 'compact', index: 0, playing: false };
    },
  };
}
