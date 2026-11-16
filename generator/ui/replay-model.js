// @ts-check
// Generation steps (step 3, under "Pieces to place"), the part that has no DOM (design §6.12, §10.5, §11.11; RES-29 to
// RES-31; owner decision P-OD14): the two views of a replay, the sentence of a step, its row (pieces, techniques and
// score), the stage groups, the score table, the stage list, the status text and the controller that runs, keeps and
// resubmits the replay of the puzzle on show, with no playback. Texts are never built here: every function returns
// descriptors `{ key, params }` of locale keys (a parameter may itself be a descriptor or a list of them), which
// `renderDesc` turns into text with the app's `t`. No timer and no storage.
import { PoolAbortError, PoolError } from '../../core/browser/worker-pool.js';
import { clueKey } from '../../core/engine/keys.js';

/** @typedef {import('../../core/engine/replay.js').ReplayResult} ReplayResult */
/** @typedef {import('../../core/engine/replay.js').Step} Step */
/** @typedef {import('../../core/engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../../core/engine/types.js').Pose} Pose */
/** @typedef {import('../../core/engine/types.js').Puzzle} Puzzle */
/** @typedef {import('../../core/engine/types.js').RatingDetail} RatingDetail */

/**
 * What the Generator gives the section: the set, the puzzle and its provenance (`client.replayPuzzle`'s input).
 * @typedef {{ set: PieceSet, puzzle: Puzzle, setOrigin: unknown, made: unknown }} ReplaySource
 */

/**
 * A text to be written: a locale key and its parameters. A parameter is a string, a raw number (the section formats it
 * for the language), another descriptor (a translated noun phrase inside a sentence) or a list of descriptors (written
 * one by one and joined with ", ").
 * @typedef {{ key: string, params?: Record<string, string | number | Desc | Desc[]> }} Desc
 */

/**
 * One line of a cell of a step's row: a raw number, a descriptor or a list of descriptors (joined with ", ").
 * @typedef {number | Desc | Desc[]} Line
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
 * One row group of the table: a run of consecutive visible steps of one stage, or a stage without steps.
 * @typedef {object} StageGroup
 * @property {1 | 2 | 3 | 4 | 5 | 6 | 7} stage
 * @property {Desc} heading `{ key: 'replay.stage.heading', params: { n: stage, name: { key: 'replay.stage.<stage>' } } }`
 * @property {'stopped' | 'none' | 'notAvailable' | null} mark The stage's mark of `stageList(result)`.
 * @property {Desc | null} markText The stage's mark text of `stageList(result)`.
 * @property {number[]} indices The visible steps of the group, in order; empty for a stage without steps.
 */

/**
 * `expanded` is an index into `result.steps`, always a visible one.
 * @typedef {object} StepsState
 * @property {'idle' | 'loading' | 'ready' | 'failed'} phase
 * @property {ReplaySource | null} source The puzzle on show (null when idle).
 * @property {ReplayResult | null} result The presented result: an `unavailable` one holds its final step only.
 * @property {'worker-unavailable' | 'failed' | null} failure
 * @property {'compact' | 'all'} view Kept from one puzzle to the next.
 * @property {number | null} expanded The open step, or null.
 */

export const STAGE_COUNT = 7;
export const STEPS_CACHE_SIZE = 16;
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
 * @param {Record<string, string | number | Desc | Desc[]>} [params]
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
    if (Array.isArray(value)) {
      for (const item of value) {
        keys.push(...descriptorKeys(item));
      }
    } else if (typeof value === 'object') {
      keys.push(...descriptorKeys(value));
    }
  }
  return keys;
}

/**
 * Writes a descriptor. A numeric parameter goes through `format`, except `count`, which stays a number so that `t`
 * can choose the plural form; a list of descriptors is written one by one and joined with ", ".
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
      params[name] = Array.isArray(value)
        ? value.map((item) => renderDesc(item, t, format)).join(', ')
        : typeof value === 'object'
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
 * @returns {Desc[] | Desc} One descriptor per rule R1 to R9 that was used ("Forced cell ×3"), in rule order, or "none".
 */
function countsText(rules) {
  /** @type {Desc[]} */
  const list = RULE_NAMES.flatMap((name) => {
    const n = isObject(rules) ? rules[name] : undefined;
    return typeof n === 'number' && Number.isFinite(n) && n > 0
      ? [desc('replay.uses', { rule: desc(`replay.rule.${name}`), n })]
      : [];
  });
  return list.length === 0 ? desc('replay.table.rules.none') : list;
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
// The row of a step (owner decision P-OD14): its button label, pieces, techniques and score.

/**
 * @param {number} index The step's index in the result.
 * @returns {Desc} "Step n", n counting from 1 in both views.
 */
export function rowLabel(index) {
  return desc('replay.row', { n: index + 1 });
}

/**
 * @param {Step} step
 * @returns {string[]} The piece ids a step names, in the order the step gives them.
 */
function pieceIdsOf(step) {
  const { board } = step;
  switch (step.kind) {
    case 'piece': {
      const n = step.args.n;
      const item = typeof n === 'number' && Number.isInteger(n) && n >= 1 ? board.placed[n - 1] : undefined;
      return item !== undefined && typeof item.id === 'string' ? [item.id] : [];
    }
    case 'retile':
      return board.lifted.slice();
    case 'rated':
    case 'rejected':
    case 'unrateable':
    case 'selected':
    case 'final':
      return board.clues.slice();
    case 'repair':
      return typeof step.args.added === 'string' ? [step.args.added] : [];
    default:
      return [];
  }
}

/**
 * The pieces of a step's row: the carved piece, the lifted pieces, the clues of a rated, refused, unrateable or
 * selected clue set and of the final puzzle, the piece a repair added.
 * @param {Step} step
 * @param {Pick<PieceSet, 'pieces'>} set
 * @returns {string[]} Piece ids: those the set holds in the set's order, then the others in the order given; each once.
 */
export function stepPieces(step, set) {
  const unique = [...new Set(pieceIdsOf(step))];
  const order = new Map(set.pieces.map((piece, index) => [piece.id, index]));
  const known = unique.filter((id) => order.has(id)).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  return [...known, ...unique.filter((id) => !order.has(id))];
}

/**
 * @param {Step} step
 * @returns {Line[]} The deduction rules used with their counts and the decisive guesses of a `difficulty-v3` rating;
 *   "not available" for another rating; nothing for a step without a rating.
 */
export function stepTechniques(step) {
  const rating = step.rating;
  if (!isObject(rating)) {
    return [];
  }
  if (rating.model !== MODEL_V3 || !isObject(rating.metrics)) {
    return [UNAVAILABLE];
  }
  const metrics = /** @type {Record<string, any>} */ (rating.metrics);
  /** @type {Line[]} */
  const lines = [countsText(metrics.rules)];
  if (typeof metrics.G === 'number' && Number.isFinite(metrics.G) && metrics.G > 0) {
    lines.push(desc('replay.guesses', { count: metrics.G, proved: numOr(metrics.Gproved) }));
  }
  return lines;
}

/**
 * @param {Step} step
 * @returns {Line[]} The score, in or outside the band, the estimate note and the refusal, where the step has them.
 */
export function stepScore(step) {
  if (step.kind === 'unrateable') {
    return [desc('replay.table.unrateable')];
  }
  const rating = step.rating;
  if (!isObject(rating)) {
    return [];
  }
  /** @type {Line[]} */
  const lines = [numOr(rating.score)];
  const score = rating.score;
  if (rating.model === MODEL_V3 && Number.isFinite(score) && step.band !== null && step.band !== undefined) {
    const { min, max } = step.band;
    lines.push(desc(min <= score && (max === null || max === undefined || score < max) ? 'replay.score.inBand' : 'replay.score.outOfBand'));
  }
  if (rating.censored === true) {
    lines.push(desc('rating.note.estimateShort'));
  }
  if (step.kind === 'rejected') {
    lines.push(desc('replay.table.refused'));
  }
  return lines;
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
 * The row groups of the table. A result the replay called `unavailable` (the controller presents it as its final step
 * alone, owner decision P-OD14 Q2) has seven groups: stages 1 to 6 are "not available" without rows and stage 7 holds
 * the stored puzzle. Any other result is cut into runs of consecutive visible steps of one stage (stages 5 and 6
 * interleave, so a stage can come back), and a stage without steps gets a group of its own, with no rows, before the
 * first run of a later stage.
 * @param {ReplayResult} result
 * @param {readonly number[]} visible Indices into `result.steps` of the steps the view shows, in order.
 * @returns {StageGroup[]}
 */
export function stageGroups(result, visible) {
  /** @param {1 | 2 | 3 | 4 | 5 | 6 | 7} stage @returns {Desc} */
  const heading = (stage) => desc('replay.stage.heading', { n: stage, name: desc(`replay.stage.${stage}`) });
  if (result.status === 'unavailable') {
    const last = result.steps.length - 1;
    return Array.from({ length: STAGE_COUNT }, (_, i) => {
      const stage = /** @type {1 | 2 | 3 | 4 | 5 | 6 | 7} */ (i + 1);
      return stage < STAGE_COUNT
        ? { stage, heading: heading(stage), mark: /** @type {const} */ ('notAvailable'), markText: desc('replay.notAvailable'), indices: [] }
        : { stage, heading: heading(stage), mark: null, markText: null, indices: visible.includes(last) ? [last] : [] };
    });
  }
  const list = stageList(result);
  /** @type {{ stage: number, indices: number[] }[]} */
  const runs = [];
  for (const index of visible) {
    const stage = result.steps[index].stage;
    const run = runs[runs.length - 1];
    if (run !== undefined && run.stage === stage) {
      run.indices.push(index);
    } else {
      runs.push({ stage, indices: [index] });
    }
  }
  const empty = list.filter((entry) => entry.steps === 0).map((entry) => entry.stage);
  /** @type {StageGroup[]} */
  const groups = [];
  /**
   * @param {number} stage
   * @param {number[]} indices
   */
  const add = (stage, indices) => {
    const entry = list[stage - 1];
    groups.push({
      stage: /** @type {StageGroup['stage']} */ (stage), heading: heading(/** @type {StageGroup['stage']} */ (stage)),
      mark: entry.mark, markText: entry.markText, indices,
    });
  };
  let next = 0;
  for (const run of runs) {
    while (next < empty.length && empty[next] < run.stage) {
      add(empty[next], []);
      next += 1;
    }
    add(run.stage, run.indices);
  }
  for (; next < empty.length; next += 1) {
    add(empty[next], []);
  }
  return groups;
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
 * @param {'worker-unavailable' | 'failed'} failure
 * @returns {Desc}
 */
export function failureText(failure) {
  return desc(failure === 'worker-unavailable' ? 'replay.failed.worker' : 'replay.failed');
}

// ---------------------------------------------------------------------------------------------------------------
// The controller (RES-29, RES-31; owner decision P-OD14).

/**
 * @param {unknown} error
 * @returns {'worker-unavailable' | 'failed'}
 */
function failureOf(error) {
  return error instanceof PoolError && error.code === 'worker-unavailable' ? 'worker-unavailable' : 'failed';
}

/**
 * @param {ReplaySource} a
 * @param {ReplaySource} b
 * @returns {boolean} Whether both are the same puzzle of the same set, with the same provenance objects.
 */
function sameSource(a, b) {
  return a.set === b.set && a.puzzle.id === b.puzzle.id && a.made === b.made && a.setOrigin === b.setOrigin;
}

/**
 * What the section shows for a result. An `unavailable` one (an imported puzzle, no record or set origin, a completion
 * pass, other versions) is shown as the stored puzzle alone, also when the engine replayed some of its stages (owner
 * decision P-OD14, Q2 (a) and Q3 (a)); the engine's result is not changed.
 * @param {ReplayResult} result
 * @returns {ReplayResult | null} Null for an unavailable result whose last step is not the final one.
 */
export function presented(result) {
  if (result.status !== 'unavailable') {
    return result;
  }
  const last = result.steps[result.steps.length - 1];
  return last.kind === 'final' ? { ...result, steps: [last] } : null;
}

/**
 * The state machine of the Generation steps section: `show` runs the replay of the puzzle on show (an auxiliary
 * request, so a generation is never delayed), keeps the results of the puzzles shown before, resubmits a replay that
 * a new generation interrupted, and cancels only its own run (never a generation, never the client).
 * @param {{ run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>,
 *   onChange: (state: StepsState) => void,
 *   cache?: { load(source: ReplaySource): ReplayResult | null, save(source: ReplaySource, result: ReplayResult): void } }} o
 * @returns {{ show(source: ReplaySource | null): void, retry(): void, setView(view: 'compact' | 'all'): void,
 *   toggle(index: number): void, visible(): number[], getState(): StepsState, dispose(): void }}
 */
export function createStepsController(o) {
  const { run, onChange, cache: saved } = o;
  /** @type {StepsState} */
  let state = { phase: 'idle', source: null, result: null, failure: null, view: 'compact', expanded: null };
  /** @type {AbortController | null} */
  let abort = null;
  let runId = 0;
  let disposed = false;
  /** @type {Map<string, { made: unknown, setOrigin: unknown, result: ReplayResult }>} */
  const cache = new Map();
  /** @type {object | null} */
  let cacheSet = null;
  /** @type {{ result: ReplayResult, lists: Map<string, number[]> } | null} */
  let visibleCache = null;

  /** @param {Partial<StepsState>} change */
  function update(change) {
    const next = { ...state, ...change };
    const changed = Object.keys(next).some((name) => next[/** @type {keyof StepsState} */ (name)] !== state[/** @type {keyof StepsState} */ (name)]);
    state = next;
    if (changed && !disposed) {
      onChange({ ...state });
    }
  }

  /**
   * @param {'compact' | 'all'} view
   * @returns {number[]} The indices of the steps the view shows, computed once per result and view.
   */
  function visibleFor(view) {
    const { result, source } = state;
    if (state.phase !== 'ready' || result === null || source === null) {
      return [];
    }
    if (visibleCache === null || visibleCache.result !== result) {
      visibleCache = { result, lists: new Map() };
    }
    let list = visibleCache.lists.get(view);
    if (list === undefined) {
      list = visibleIndices(result.steps, view, stepKeyOf(source.set));
      visibleCache.lists.set(view, list);
    }
    return list;
  }

  function cancel() {
    runId += 1;
    if (abort !== null) {
      abort.abort();
      abort = null;
    }
  }

  /**
   * @param {ReplaySource} source
   * @param {ReplayResult} result
   */
  function remember(source, result) {
    cache.delete(source.puzzle.id);
    cache.set(source.puzzle.id, { made: source.made, setOrigin: source.setOrigin, result });
    if (cache.size > STEPS_CACHE_SIZE) {
      cache.delete(/** @type {string} */ (cache.keys().next().value));
    }
  }

  /**
   * @param {ReplaySource} source
   * @param {unknown} value What the run resolved.
   */
  function finish(source, value) {
    abort = null;
    const result = isObject(value) && Array.isArray(value.steps) && value.steps.length > 0
      ? presented(/** @type {ReplayResult} */ (value))
      : null;
    if (result === null) {
      update({ phase: 'failed', failure: 'failed', result: null, expanded: null });
      return;
    }
    remember(source, result);
    saved?.save(source, result);
    update({ phase: 'ready', result, failure: null, expanded: null });
  }

  /** @param {ReplaySource} source */
  function start(source) {
    runId += 1;
    const mine = runId;
    const controller = new AbortController();
    abort = controller;
    /** @type {Promise<ReplayResult>} */
    let promise;
    try {
      promise = Promise.resolve(run(source, controller.signal));
    } catch (error) {
      promise = Promise.reject(error);
    }
    promise.then((value) => {
      if (!disposed && mine === runId) {
        finish(source, value);
      }
    }, (error) => {
      if (disposed || mine !== runId) {
        return;
      }
      if (error instanceof PoolAbortError && error.reason === 'cancelled') {
        // A new generation began (this run's own signal is not aborted): ask again, the request waits for it to end.
        start(source);
        return;
      }
      abort = null;
      update({ phase: 'failed', failure: failureOf(error), result: null, expanded: null });
    });
  }

  return {
    /** @param {ReplaySource | null} source */
    show(source) {
      if (disposed) {
        return;
      }
      if (source === null || source === undefined) {
        if (state.phase !== 'idle' || state.source !== null) {
          cancel();
          update({ phase: 'idle', source: null, result: null, failure: null, expanded: null });
        }
        return;
      }
      if (state.source !== null && sameSource(state.source, source)) {
        return;
      }
      cancel();
      if (cacheSet !== source.set) {
        cache.clear();
        cacheSet = source.set;
      }
      const id = source.puzzle.id;
      const hit = cache.get(id);
      if (hit !== undefined && hit.made === source.made && hit.setOrigin === source.setOrigin) {
        cache.delete(id);
        cache.set(id, hit);
        update({ phase: 'ready', source, result: hit.result, failure: null, expanded: null });
        return;
      }
      const kept = saved?.load(source) ?? null;
      const keptResult = kept !== null && Array.isArray(kept.steps) && kept.steps.length > 0 ? presented(kept) : null;
      if (keptResult !== null) {
        remember(source, keptResult);
        update({ phase: 'ready', source, result: keptResult, failure: null, expanded: null });
        return;
      }
      update({ phase: 'loading', source, result: null, failure: null, expanded: null });
      start(source);
    },
    retry() {
      if (disposed || state.phase !== 'failed' || state.source === null) {
        return;
      }
      update({ phase: 'loading', failure: null });
      start(state.source);
    },
    /** @param {'compact' | 'all'} view */
    setView(view) {
      if (disposed || (view !== 'compact' && view !== 'all') || view === state.view) {
        return;
      }
      const open = state.expanded;
      update({ view, expanded: open !== null && visibleFor(view).includes(open) ? open : null });
    },
    /** @param {number} index An index into `result.steps`; a step the view hides does nothing. */
    toggle(index) {
      if (disposed || state.phase !== 'ready' || !visibleFor(state.view).includes(index)) {
        return;
      }
      update({ expanded: state.expanded === index ? null : index });
    },
    /** @returns {number[]} The indices of the steps the current view shows, in order. */
    visible() {
      return visibleFor(state.view).slice();
    },
    /** @returns {StepsState} */
    getState() {
      return { ...state };
    },
    dispose() {
      if (disposed) {
        return;
      }
      cancel();
      disposed = true;
      cache.clear();
      cacheSet = null;
      visibleCache = null;
    },
  };
}
